// Shared by the checkout server and the recovery worker. Never exposed to the browser.
import { createHash } from 'node:crypto';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @param {Record<string,string|undefined>} env */
export function relayCredential(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY ? createHash('sha256').update('kucher-order-notifications:'+env.SUPABASE_SERVICE_ROLE_KEY).digest('hex') : '';
}

/** @param {Record<string, any>} p @param {string} id */
export function formatSiteOrder(p, id) {
  const pickup = p.fulfillmentType === 'pickup';
  const lines = [`🟦 Заявка с сайта: ${pickup ? 'Самовывоз' : 'Доставка'}`, `ID: ${id}`,
    `Имя: ${p.name || 'Гость сайта'}`, `Телефон: ${p.phone}`,
    `${pickup ? 'Забрать' : 'Адрес'}: ${p.address || 'Дмитров, Промышленная улица, 20Б'}`,
    `Время: ${p.deliveryTime === 'custom' ? p.deliveryTimeCustom : 'Как можно быстрее'}`,
    `Оплата: ${p.paymentMethod === 'cash' ? 'Наличными' : p.paymentMethod === 'transfer' ? 'Переводом' : 'Картой при получении'}`];
  if (p.changeAmount && p.changeAmount !== 'no-change') lines.push(`Сдача с: ${p.changeAmount} ₽`);
  if (!pickup) {
    const details = [['Дом',p.house],['Корпус',p.building],['Квартира',p.apartment || p.flat],['Подъезд',p.entrance],['Этаж',p.floor],['Домофон',p.intercom]]
      .filter(([,value])=>value).map(([label,value])=>`${label}: ${value}`);
    if (details.length) lines.push(details.join('; '));
  }
  if (p.comment) lines.push(`Комментарий: ${p.comment}`);
  if (p.allergy) lines.push(`⚠️ Аллергия: ${p.allergy}`);
  lines.push('', 'Позиции:');
  for (const it of p.items || []) {
    lines.push(`• ${it.name} × ${it.qty} = ${it.price * it.qty} ₽`);
    for (const m of it.modifiers || []) lines.push(`    – ${m.group}: ${m.option}`);
  }
  if (p.deliveryPrice) lines.push(`Доставка: ${p.deliveryPrice} ₽`);
  lines.push(`Итого: ${p.total} ₽`);
  const text = lines.join('\n');
  // Do not silently truncate an order or its allergy information.
  if (text.length > 3500) throw new Error('Слишком длинная заявка. Сократите комментарий или позвоните в ресторан.');
  return text;
}

/** @param {Record<string,any>} row @param {Record<string,any>} result */
export function reconciliationUpdate(row, result) {
  if (result.id !== row.id) return null;
  if (result.creationStatus === 'Error' && row.last_status === 'CreationPending') {
    return {text:`${row.orig_text}\n\n⚠️ НЕ СОЗДАНО НА ТЕРМИНАЛЕ — проверить и подтвердить вручную. Не пробивайте повторно без проверки.`,patch:{last_status:'CreationError'}};
  }
  if (result.creationStatus !== 'Success' || !result.order) return null;
  const order=result.order;
  if (['CreationPending','CreationError'].includes(row.last_status)) {
    const label=order.status==='Unconfirmed'?'⚠️ Подтвердите заказ на кассе!':`Статус на кассе: ${order.status}`;
    return {text:`${row.orig_text}\n\nЗаказ на кассе №${order.number}\n${label}`,patch:{number:order.number,status:order.status,last_status:order.status,finalized:['Delivered','Closed','Cancelled','Deleted'].includes(order.status)}};
  }
  return !row.number ? {text:null,patch:{number:order.number}} : null;
}

/** @param {Record<string,string|undefined>} env @param {typeof fetch} fetcher */
export function createOrderNotifications(env, fetcher = fetch) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const token = env.TELEGRAM_BOT_TOKEN || env.TG_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID;
  if (!base || !key || !token || !chat) throw new Error('Order notification configuration missing');
  const table = `${base}/rest/v1/iiko_notified_orders`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  /** @param {string} query @param {string} method @param {any} [body] */
  async function db(query, method = 'GET', body) {
    let r;
    const relay=env.ORDER_STORAGE_RELAY_URL;
    try { r = await fetcher(relay || table + query, relay
      ? {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${relayCredential(env)}`},body:JSON.stringify({method:'storage',query,operation:method,body}),signal:AbortSignal.timeout(20000)}
      : {method, headers, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(10000)}); }
    catch { throw new Error('Notification storage connection failed'); }
    const data = await r.json();
    if (!r.ok) { const error = new Error(`Notification storage ${r.status}`); Object.assign(error,{status:r.status,code:data.code}); throw error; }
    return data;
  }
  /** @param {string} method @param {Record<string,any>} body */
  async function telegram(method, body) {
    const { order_id: orderId, ...payload } = body;
    let r;
    const relay = env.ORDER_TELEGRAM_RELAY_URL;
    try { r = await fetcher(relay || `https://api.telegram.org/bot${token}/${method}`, {
      method:'POST',headers:{'Content-Type':'application/json',...(relay?{Authorization:`Bearer ${relayCredential(env)}`}:{})},
      body:JSON.stringify(relay?{method,orderId,payload}:{chat_id:chat,...payload}),signal:AbortSignal.timeout(20000),
    }); }
    catch { throw new Error(`Telegram ${method} connection failed`); }
    const result = await r.json();
    if (method==='editMessageText' && result.description?.includes('message is not modified')) return {ok:true};
    if (!r.ok || !result.ok) throw new Error(`Telegram ${method} failed: ${result.description || r.status}`);
    return result;
  }
  /** @param {string} id @param {string} text */
  async function reserve(id, text) {
    if (!UUID.test(id)) throw new Error('Invalid site order ID');
    try {
      const rows = await db('', 'POST', {id,number:0,status:'SitePending',last_status:'CreationPending',orig_text:text,finalized:false});
      return {created:true,row:rows[0]};
    } catch (error) {
      if (/** @type {any} */ (error).code !== '23505') throw error;
      const rows = await db(`?id=eq.${id}&select=*`);
      if (!rows[0]) throw new Error('Notification claim missing');
      if (rows[0].orig_text !== text) throw new Error('Этот ID уже используется другой заявкой. Обновите форму.');
      return {created:false,row:rows[0]};
    }
  }
  /** @param {Record<string,any>} row @param {(id:number)=>void} [onDelivered] */
  async function notify(row, onDelivered) {
    if (row.tg_message_id || !row.orig_text) return false;
    const leaseExpired = Date.now() - Date.parse(row.notified_at) > 120000;
    if (row.status !== 'SitePending' && !(row.status === 'SiteSending' && leaseExpired)) return false;
    const lease = new Date().toISOString();
    const claimed = await db(`?id=eq.${row.id}&tg_message_id=is.null&status=eq.${row.status}&notified_at=eq.${encodeURIComponent(row.notified_at)}`, 'PATCH', {status:'SiteSending',notified_at:lease});
    if (!claimed.length) return false;
    const footer = row.last_status === 'CreationError'
      ? '⚠️ НЕ СОЗДАНО НА ТЕРМИНАЛЕ — проверить и подтвердить вручную. Не пробивайте повторно без проверки.'
      : '⚠️ Терминал ещё не подтвердил создание. Свяжитесь с гостем; проверьте кассу перед ручным вводом.';
    let delivered = false;
    try {
      const j = await telegram('sendMessage',{order_id:row.id,text:`${row.orig_text}\n\n${footer}`,disable_web_page_preview:true});
      delivered = true;
      onDelivered?.(j.result.message_id);
      await db(`?id=eq.${row.id}&status=eq.SiteSending&notified_at=eq.${encodeURIComponent(lease)}`, 'PATCH', {tg_message_id:j.result.message_id,status:'SiteNotified'});
      return true;
    } catch (error) {
      // If Telegram accepted the message but storing its ID failed, do not
      // immediately re-send it. The lease remains visible for investigation.
      if (!delivered) await db(`?id=eq.${row.id}&status=eq.SiteSending&notified_at=eq.${encodeURIComponent(lease)}`, 'PATCH', {status:'SitePending'});
      throw error;
    }
  }
  return {db,telegram,reserve,notify};
}
