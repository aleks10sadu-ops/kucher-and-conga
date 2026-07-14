// Опросник iiko (раз в минуту через pg_cron) — страховка вебхука iiko-webhook:
// 1) новые внешние доставки, которые вебхук не объявил → сообщение в Telegram;
// 2) напоминание, если заказ не подтверждён > 7 минут;
// 3) каскад: при смене статуса дописываем статус к ИСХОДНОМУ тексту сообщения
//    (orig_text) — не перерисовываем карточку: iiko обнуляет отменённые заказы
//    (сумма 0, пустые позиции), и перерисовка стирала бы состав;
//    отмена/удаление (isDeleted) — громкий reply, т.к. редактирование беззвучно.
// 4) заказы с терминала (RMS OLAP): агрегаторы (Яндекс Еда/Деливери) и касса —
//    облачное API их не видит, опрашиваем iikoServer напрямую (логин → отчёт →
//    сразу logout, чтобы не держать лицензионный слот). Только объявление,
//    каскада статусов для них нет.
// Все сообщения — плоский текст без parse_mode: не нужно экранировать
// названия блюд и можно безопасно редактировать сообщения вебхука.
// Секреты: IIKO_API_LOGIN, IIKO_ORGANIZATION_ID, TG_TOKEN, TG_CHAT_ID, POLLER_KEY;
// для терминала (опционально): RMS_URL, RMS_LOGIN, RMS_PASS_SHA1.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const IIKO = 'https://api-ru.iiko.services';
const DASHES = /^[-–—\s]*$/; // iiko ставит улицу «----------», если не нашёл её в справочнике

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

// Один адрес, каждая деталь один раз (то же правило, что в iiko-webhook).
function fmtAddress(ord: any): string {
  const a = ord.deliveryPoint?.address;
  const street = a?.street?.name && !DASHES.test(a.street.name) ? a.street.name : null;
  if (!street) {
    const fromComment = String(ord.deliveryPoint?.comment || '').split('\n')[0].trim();
    if (fromComment) return fromComment;
  }
  const parts = [
    a?.street?.city?.name,
    street,
    a?.house && !DASHES.test(a.house) ? `д. ${a.house}` : null,
    a?.building ? `корп. ${a.building}` : null,
    a?.entrance ? `подъезд ${a.entrance}` : null,
    a?.floor ? `этаж ${a.floor}` : null,
    a?.flat ? `кв. ${a.flat}` : null,
    a?.doorphone ? `домофон ${a.doorphone}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : String(a?.line1 || '');
}

// Карточка заказа БЕЗ статуса — статус дописывается отдельной строкой,
// и именно эта база хранится в orig_text для каскадных редактирований.
function fmtBase(ord: any): string {
  const lines: string[] = [];
  lines.push(`🆕 Доставка №${ord.number}`);
  if (ord.sourceKey) lines.push(`Источник: ${ord.sourceKey}`);
  if (ord.externalNumber) lines.push(`Внешний №: ${ord.externalNumber}`);
  const who = [ord.customer?.name, ord.phone].filter(Boolean).join(', ');
  if (who) lines.push(`Клиент: ${who}`);
  const addr = fmtAddress(ord);
  if (addr) lines.push(`Адрес: ${addr}`);
  lines.push('');
  const items = ord.items || [];
  for (const it of items.slice(0, 25)) {
    lines.push(`• ${it.product?.name || '?'} ×${it.amount}${it.price ? ` — ${it.price * it.amount} ₽` : ''}`);
    for (const m of it.modifiers || []) lines.push(`    – ${m.product?.name || '?'}${m.amount > 1 ? ` ×${m.amount}` : ''}`);
  }
  if (items.length > 25) lines.push(`… и ещё ${items.length - 25} позиций (полный состав — на кассе)`);
  lines.push(`Сумма: ${ord.sum} ₽`);
  if (ord.comment) lines.push(`Комментарий: ${String(ord.comment).slice(0, 300)}`);
  return lines.join('\n').slice(0, 3800);
}

const withStatus = (base: string, status: string) =>
  `${base}\n\n${FOOTER[status] || status}`.slice(0, 4000);

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
        const base = fmtBase(ord);
        const j = await tgCall('sendMessage', { text: withStatus(base, ord.status), disable_web_page_preview: true });
        if (j.ok) {
          await sb.from('iiko_notified_orders').insert({
            id: o.id, number: ord.number, status: ord.status,
            last_status: ord.status, tg_message_id: j.result.message_id, orig_text: base,
          });
          sent++;
        }
      } else if (ord.status === 'Unconfirmed' && seen.remind_count === 0
        && Date.now() - new Date(seen.notified_at).getTime() > 7 * 60 * 1000) {
        const j = await tgCall('sendMessage', {
          text: `🔔 Заказ №${ord.number} всё ещё НЕ ПОДТВЕРЖДЁН!\nВисит больше 7 минут — подтвердите на кассе.`,
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
        // База — исходный текст сообщения (вебхука или наш); для старых строк
        // без orig_text рендерим карточку заново из текущего состояния заказа.
        const base = t.orig_text || fmtBase(ord);
        await tgCall('editMessageText', {
          message_id: t.tg_message_id,
          text: withStatus(base, status),
          disable_web_page_preview: true,
        });
        edited++;
        if (status === 'Cancelled' || status === 'Deleted') {
          const cause = ord.cancelInfo?.cause?.name ? ` — ${ord.cancelInfo.cause.name}` : '';
          await tgCall('sendMessage', {
            text: `${status === 'Deleted' ? '🗑' : '❌'} Заказ №${ord.number} ${status === 'Deleted' ? 'УДАЛЁН' : 'ОТМЕНЁН'}${cause}`,
            reply_to_message_id: t.tg_message_id,
          });
        }
        await sb.from('iiko_notified_orders').update({
          last_status: status, status,
          finalized: TERMINAL.includes(status),
        }).eq('id', t.id);
      }
    }

    // --- 3. Заказы с терминала (RMS OLAP): агрегаторы и касса ---
    // Заказ виден в OLAP сразу после появления в iikoFront. Сайтовые (src='Сайт')
    // пропускаем — их объявляет облачный канал. При любом сбое просто ждём
    // следующего тика: дедуп по id 'rms-<номер>-<дата>' защищает от повторов.
    let rmsSent = 0;
    const RMS_URL = Deno.env.get('RMS_URL'), RMS_LOGIN = Deno.env.get('RMS_LOGIN'), RMS_PASS = Deno.env.get('RMS_PASS_SHA1');
    if (RMS_URL && RMS_LOGIN && RMS_PASS) {
      let rmsKey: string | null = null;
      try {
        const t = (ms: number) => ({ signal: AbortSignal.timeout(ms) });
        const authR = await fetch(`${RMS_URL}/api/auth?login=${encodeURIComponent(RMS_LOGIN)}&pass=${RMS_PASS}`, t(8000));
        if (!authR.ok) throw new Error(`rms auth ${authR.status}`);
        rmsKey = (await authR.text()).trim();

        // День по времени ресторана (МСК, UTC+3)
        const mskDay = (off: number) => new Date(Date.now() + (3 + off * 24) * 3600e3).toISOString().slice(0, 10);
        const rep = await fetch(`${RMS_URL}/api/v2/reports/olap?key=${rmsKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportType: 'DELIVERIES',
            buildSummary: 'false',
            groupByRowFields: ['Delivery.Number', 'Delivery.SourceKey', 'Delivery.CustomerName', 'Delivery.CustomerPhone', 'OpenTime', 'OrderType', 'DishName'],
            aggregateFields: ['DishAmountInt', 'DishSumInt'],
            filters: {
              'OpenDate.Typed': { filterType: 'DateRange', periodType: 'CUSTOM', from: mskDay(0), to: mskDay(1) },
              'OrderType': { filterType: 'IncludeValues', values: ['Доставка курьером', 'Доставка самовывоз'] },
            },
          }),
          ...t(12000),
        });
        if (!rep.ok) throw new Error(`rms olap ${rep.status}`);
        const rows = (await rep.json()).data || [];

        const orders = new Map<string, any[]>();
        for (const r of rows) {
          if (r['Delivery.Number'] == null) continue;
          const k = String(r['Delivery.Number']);
          if (!orders.has(k)) orders.set(k, []);
          orders.get(k)!.push(r);
        }

        for (const [num, its] of orders) {
          const first = its[0];
          if (first['Delivery.SourceKey'] === 'Сайт') continue;
          const openDay = String(first.OpenTime || '').slice(0, 10) || mskDay(0);
          const rmsId = `rms-${num}-${openDay}`;
          const { error } = await sb.from('iiko_notified_orders').insert({
            id: rmsId, number: Number(num) || 0, status: 'Rms', last_status: 'Rms', finalized: true,
          });
          if (error) continue; // конфликт по PK — уже объявлен

          const total = its.reduce((s: number, r: any) => s + (Number(r.DishSumInt) || 0), 0);
          const openTime = String(first.OpenTime || '').slice(11, 16);
          const who = [first['Delivery.CustomerName'], first['Delivery.CustomerPhone']]
            .map((v: unknown) => String(v || '').trim()).filter(Boolean).join(', ');
          const lines = [
            `🛵 Доставка с терминала №${num}`,
            `Тип: ${first.OrderType === 'Доставка самовывоз' ? 'самовывоз' : 'курьером'}${openTime ? ` · открыт в ${openTime}` : ''}`,
            'Источник: агрегатор (Яндекс/Деливери) или касса',
          ];
          if (who) lines.push(`Клиент: ${who}`);
          lines.push('', 'Позиции:');
          for (const r of its.slice(0, 30)) {
            const sum = Number(r.DishSumInt) || 0;
            lines.push(`• ${r.DishName} ×${r.DishAmountInt}${sum > 0 ? ` — ${sum} ₽` : ''}`);
          }
          if (its.length > 30) lines.push(`… и ещё ${its.length - 30} позиций`);
          lines.push(`Итого: ${total} ₽`);
          const text = lines.join('\n').slice(0, 4000);

          const j = await tgCall('sendMessage', { text, disable_web_page_preview: true });
          if (j.ok) {
            await sb.from('iiko_notified_orders').update({ tg_message_id: j.result.message_id, orig_text: text }).eq('id', rmsId);
            rmsSent++;
          } else {
            await sb.from('iiko_notified_orders').delete().eq('id', rmsId).is('tg_message_id', null);
          }
        }
      } catch (e) {
        console.error('rms poll failed (skip tick):', String(e).slice(0, 200));
      } finally {
        // Обязательный logout — иначе занимаем слот лицензии до таймаута сервера.
        if (rmsKey) { try { await fetch(`${RMS_URL}/api/logout?key=${rmsKey}`, { signal: AbortSignal.timeout(5000) }); } catch { /* слот освободится сам */ } }
      }
    }

    await sb.from('iiko_notified_orders').delete().lt('notified_at', new Date(Date.now() - 3 * 864e5).toISOString());
    return new Response(JSON.stringify({ ok: true, pending: pending.length, sent, edited, rmsSent }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('poller failed:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
