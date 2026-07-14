// Приём вебхуков iiko → мгновенное сообщение в TG о новой доставке с сайта.
// Заменяет Vercel-проект iiko-tg-webhook, который дедуплицировал заказы в памяти
// лямбды и на холодном старте слал дубли.
//
// Дедуп — через таблицу iiko_notified_orders, ОБЩУЮ с функцией iiko-poller:
// вебхук первым «бронирует» заказ атомарным insert (конфликт по PK = уже объявлен),
// поэтому поллер, увидев строку, не шлёт своё дублирующее сообщение, а его
// каскад статусов / напоминание «не подтверждён 7 минут» / громкая отмена
// продолжают работать поверх сообщения вебхука (tg_message_id сохраняем).
// Если TG-отправка не удалась — бронь снимаем, и поллер объявит заказ через минуту.
//
// Авторизация: iiko передаёт authToken настроек вебхука в заголовке Authorization;
// в настройках iiko он выставлен равным POLLER_KEY этого проекта.
// Секреты: TG_TOKEN, TG_CHAT_ID, POLLER_KEY (+ SUPABASE_* автоматически).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TERMINAL = ['Delivered', 'Closed', 'Cancelled', 'Deleted'];

async function tgCall(method: string, payload: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${Deno.env.get('TG_TOKEN')}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: Deno.env.get('TG_CHAT_ID'), ...payload }),
  });
  const j = await r.json();
  if (!j.ok) console.error(`TG ${method} error:`, JSON.stringify(j).slice(0, 300));
  return j;
}

// «2026-07-14 14:10:23.716» (время ресторана, МСК) → «14:10 (14.07)»
function fmtWhen(s: unknown): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || ''));
  return m ? `${m[4]}:${m[5]} (${m[3]}.${m[2]})` : null;
}

function fmtAddress(ord: any): string {
  const a = ord.deliveryPoint?.address;
  if (!a) return '';
  const parts = [
    a.street?.city?.name,
    a.street?.name,
    a.house ? `д. ${a.house}` : null,
    a.building ? `корп. ${a.building}` : null,
    a.flat ? `кв. ${a.flat}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : String(a.line1 || '');
}

function fmtOrder(ord: any): string {
  const lines: string[] = [];
  lines.push(`🚚 Новая доставка №${ord.number}`);
  if (ord.customer?.name) lines.push(`Имя: ${ord.customer.name}`);
  if (ord.phone) lines.push(`Телефон: ${ord.phone}`);
  const addr = fmtAddress(ord);
  if (addr) lines.push(`Адрес: ${addr}`);
  if (ord.deliveryPoint?.comment) lines.push(`Адрес (комментарий): ${ord.deliveryPoint.comment}`);
  const when = fmtWhen(ord.completeBefore);
  if (when) lines.push(`Ко времени: ${when}`);
  if (ord.sourceKey) lines.push(`Источник: ${ord.sourceKey}`);
  lines.push('');
  lines.push('Позиции:');
  const items = ord.items || [];
  for (const it of items.slice(0, 25)) {
    const sum = it.price != null ? ` = ${it.price * it.amount} ₽` : '';
    lines.push(`• ${it.product?.name || '?'} × ${it.amount}${sum}`);
    for (const m of it.modifiers || []) {
      lines.push(`    – ${m.product?.name || '?'}${m.amount > 1 ? ` × ${m.amount}` : ''}`);
    }
  }
  if (items.length > 25) lines.push(`… и ещё ${items.length - 25} позиций (полный состав — на кассе)`);
  if (ord.sum != null) lines.push(`Итого: ${ord.sum} ₽`);
  if (ord.comment) {
    lines.push('');
    lines.push('Комментарий:');
    lines.push(String(ord.comment).slice(0, 500));
  }
  return lines.join('\n').slice(0, 4000);
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || '';
  const key = Deno.env.get('POLLER_KEY') || '';
  if (!key || (auth !== key && auth !== `Bearer ${key}`)) {
    return new Response('unauthorized', { status: 401 });
  }

  try {
    const events = await req.json();
    if (!Array.isArray(events)) return new Response('ok', { status: 200 });

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let sent = 0;

    for (const ev of events) {
      if (ev?.eventType !== 'DeliveryOrderUpdate') continue;
      const info = ev.eventInfo;
      const ord = info?.order;
      if (!ord || info.creationStatus !== 'Success' || ord.isDeleted) continue;
      if (TERMINAL.includes(ord.status)) continue; // опоздавшее первое событие — не «новая» доставка
      const external = Boolean(info.externalNumber || ord.externalNumber) || ord.sourceKey === 'Сайт';
      if (!external) continue;

      // Атомарная «бронь» заказа: конфликт по PK — заказ уже объявлен (нами или поллером).
      const { error } = await sb.from('iiko_notified_orders').insert({
        id: info.id, number: ord.number, status: ord.status, last_status: ord.status,
      });
      if (error) {
        if (error.code !== '23505') console.error('claim failed:', error.message);
        else console.log(`skip: already notified ${info.id}`);
        continue;
      }

      const j = await tgCall('sendMessage', { text: fmtOrder(ord), disable_web_page_preview: true });
      if (j.ok) {
        await sb.from('iiko_notified_orders').update({ tg_message_id: j.result.message_id }).eq('id', info.id);
        sent++;
        console.log(`notified: order ${info.id} number ${ord.number} status ${ord.status}`);
      } else {
        // Снимаем бронь — поллер объявит заказ следующим тиком.
        await sb.from('iiko_notified_orders').delete().eq('id', info.id).is('tg_message_id', null);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('webhook failed:', e);
    // 200, чтобы iiko не копил ретраи: потерянный заказ подхватит iiko-poller.
    return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
});
