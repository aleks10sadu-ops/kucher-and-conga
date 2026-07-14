// Опросник iiko (раз в минуту через pg_cron):
// 1) новые внешние доставки → сообщение в Telegram;
// 2) напоминание, если заказ не подтверждён > 7 минут;
// 3) каскад: при смене статуса редактируем исходное сообщение;
//    отмена/удаление (isDeleted) — громкий reply, т.к. редактирование беззвучно.
// Секреты: IIKO_API_LOGIN, IIKO_ORGANIZATION_ID, TG_TOKEN, TG_CHAT_ID, POLLER_KEY.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const IIKO = 'https://api-ru.iiko.services';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function iikoPost(path: string, body: unknown, token?: string) {
  const r = await fetch(IIKO + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`iiko ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

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

const FOOTER: Record<string, string> = {
  Unconfirmed: '⚠️ Подтвердите заказ на кассе!',
  WaitCooking: '✅ Подтверждён, ждёт готовки',
  ReadyForCooking: '✅ Подтверждён, ждёт готовки',
  CookingStarted: '🔥 Готовится',
  CookingCompleted: '🍽 Приготовлен',
  Waiting: '📦 Ждёт курьера',
  OnWay: '🚗 В пути',
  Delivered: '✅ ДОСТАВЛЕН',
  Closed: '✅ ЗАКРЫТ',
  Cancelled: '❌ ОТМЕНЁН',
  Deleted: '🗑 УДАЛЁН',
};
const TERMINAL = ['Delivered', 'Closed', 'Cancelled', 'Deleted'];

// удалённый заказ (isDeleted) — отдельное «состояние» поверх статуса
const effStatus = (ord: any) => (ord.isDeleted ? 'Deleted' : ord.status);

function fmtOrder(ord: any): string {
  const status = effStatus(ord);
  const lines: string[] = [];
  lines.push(`🆕 <b>Доставка №${esc(ord.number)}</b> — ${FOOTER[status] || esc(status)}`);
  if (ord.sourceKey) lines.push(`Источник: ${esc(ord.sourceKey)}`);
  if (ord.externalNumber) lines.push(`Внешний №: ${esc(ord.externalNumber)}`);
  lines.push('');
  const items = ord.items || [];
  for (const it of items.slice(0, 25)) {
    lines.push(`• ${esc(it.product?.name || '?')} ×${it.amount}${it.price ? ` — ${it.price * it.amount} ₽` : ''}`);
    for (const m of it.modifiers || []) lines.push(`    ↳ ${esc(m.product?.name || '?')}${m.amount > 1 ? ` ×${m.amount}` : ''}`);
  }
  if (items.length > 25) lines.push(`… и ещё ${items.length - 25} позиций (полный состав — на кассе)`);
  lines.push('');
  lines.push(`<b>Сумма: ${ord.sum} ₽</b>`);
  const who = [ord.customer?.name, ord.phone].filter(Boolean).join(', ');
  if (who) lines.push(`Клиент: ${esc(who)}`);
  const addr = ord.deliveryPoint?.address?.line1 || ord.deliveryPoint?.address?.street?.name;
  if (addr) lines.push(`Адрес: ${esc(addr)}`);
  if (ord.comment) lines.push(`Комментарий: ${esc(String(ord.comment).slice(0, 300))}`);
  lines.push('');
  lines.push(FOOTER[status] || esc(status));
  return lines.join('\n').slice(0, 4000);
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-poller-key') !== Deno.env.get('POLLER_KEY')) {
    return new Response('unauthorized', { status: 401 });
  }
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const orgId = Deno.env.get('IIKO_ORGANIZATION_ID')!;
    const { token } = await iikoPost('/api/1/access_token', { apiLogin: Deno.env.get('IIKO_API_LOGIN') });

    let sent = 0, edited = 0;

    // --- 1. Новые внешние заказы + напоминания ---
    const day = (off: number) => new Date(Date.now() + off * 864e5).toISOString().slice(0, 10);
    const resp = await iikoPost('/api/1/deliveries/by_delivery_date_and_status', {
      organizationIds: [orgId],
      deliveryDateFrom: `${day(-1)} 00:00:00.000`,
      deliveryDateTo: `${day(1)} 23:59:59.000`,
      statuses: ['Unconfirmed', 'WaitCooking', 'ReadyForCooking'],
    }, token);
    const pending = (resp.ordersByOrganizations || []).flatMap((o: any) => o.orders || []);

    for (const o of pending) {
      const ord = o.order;
      if (!ord || o.creationStatus !== 'Success' || ord.isDeleted) continue;
      const external = Boolean(ord.externalNumber) || ord.sourceKey === 'Сайт';
      if (!external) continue;

      const { data: seen } = await sb.from('iiko_notified_orders').select('*').eq('id', o.id).maybeSingle();
      if (!seen) {
        const j = await tgCall('sendMessage', { text: fmtOrder(ord), parse_mode: 'HTML' });
        if (j.ok) {
          await sb.from('iiko_notified_orders').insert({
            id: o.id, number: ord.number, status: ord.status,
            last_status: ord.status, tg_message_id: j.result.message_id,
          });
          sent++;
        }
      } else if (ord.status === 'Unconfirmed' && seen.remind_count === 0
        && Date.now() - new Date(seen.notified_at).getTime() > 7 * 60 * 1000) {
        const j = await tgCall('sendMessage', {
          text: `🔔 <b>Заказ №${esc(ord.number)} всё ещё НЕ ПОДТВЕРЖДЁН!</b>\nВисит больше 7 минут — подтвердите на кассе.`,
          parse_mode: 'HTML',
          ...(seen.tg_message_id ? { reply_to_message_id: seen.tg_message_id } : {}),
        });
        if (j.ok) { await sb.from('iiko_notified_orders').update({ remind_count: 1 }).eq('id', o.id); sent++; }
      }
    }

    // --- 2. Каскадное обновление ранее уведомлённых ---
    const { data: tracked } = await sb.from('iiko_notified_orders')
      .select('*').eq('finalized', false).not('tg_message_id', 'is', null)
      .gt('notified_at', new Date(Date.now() - 864e5).toISOString());
    if (tracked && tracked.length) {
      const st = await iikoPost('/api/1/deliveries/by_id', { organizationId: orgId, orderIds: tracked.map((t: any) => t.id) }, token);
      const byId = new Map((st.orders || []).map((o: any) => [o.id, o]));
      for (const t of tracked) {
        const o: any = byId.get(t.id);
        const ord = o?.order;
        if (!ord) continue;
        const status = effStatus(ord);
        if (status === t.last_status) continue;
        await tgCall('editMessageText', { message_id: t.tg_message_id, text: fmtOrder(ord), parse_mode: 'HTML' });
        edited++;
        if (status === 'Cancelled' || status === 'Deleted') {
          const cause = ord.cancelInfo?.cause?.name ? ` — ${esc(ord.cancelInfo.cause.name)}` : '';
          await tgCall('sendMessage', {
            text: `${status === 'Deleted' ? '🗑' : '❌'} <b>Заказ №${esc(ord.number)} ${status === 'Deleted' ? 'УДАЛЁН' : 'ОТМЕНЁН'}</b>${cause}`,
            parse_mode: 'HTML', reply_to_message_id: t.tg_message_id,
          });
        }
        await sb.from('iiko_notified_orders').update({
          last_status: status, status,
          finalized: TERMINAL.includes(status),
        }).eq('id', t.id);
      }
    }

    await sb.from('iiko_notified_orders').delete().lt('notified_at', new Date(Date.now() - 3 * 864e5).toISOString());
    return new Response(JSON.stringify({ ok: true, pending: pending.length, sent, edited }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('poller failed:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
