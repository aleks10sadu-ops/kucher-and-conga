// app/api/telegram/route.js
import { NextResponse } from 'next/server';

const TG_API = (token) => `https://api.telegram.org/bot${token}/sendMessage`;

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtCurrency(num) {
  try { return Number(num).toLocaleString('ru-RU'); } catch { return String(num); }
}

function buildMessage(payload) {
  const { type } = payload; // "booking" | "delivery"

  if (type === 'booking') {
    const { name, phone, date, time, guests, comment, items = [], total = 0 } = payload;
    const itemsBlock = items.length
      ? '\n<b>Заказ/пожелания (из корзины):</b>\n' +
        items.map(i => `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`).join('\n') +
        `\n<b>Итого:</b> ${fmtCurrency(total)} ₽`
      : '';
    return (
      `<b>🟩 Заявка: Бронирование</b>\n` +
      `<b>Имя:</b> ${escapeHtml(name)}\n` +
      `<b>Телефон:</b> ${escapeHtml(phone)}\n` +
      `<b>Дата:</b> ${escapeHtml(date || '-')}  <b>Время:</b> ${escapeHtml(time || '-')}\n` +
      `<b>Гостей:</b> ${escapeHtml(guests || '-')}\n` +
      (comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}\n` : '') +
      itemsBlock
    );
  }

  if (type === 'delivery') {
    const { name, phone, address, comment, items = [], subtotal = 0, deliveryPrice = 0, total = 0 } = payload;

    // Формируем список позиций, включая доставку если она платная
    let allItems = [...items];
    if (deliveryPrice > 0) {
      allItems.push({
        name: `Платная доставка ${deliveryPrice} ₽`,
        qty: 1,
        price: deliveryPrice
      });
    }

    const itemsBlock = allItems.length
      ? allItems.map(i => `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`).join('\n')
      : '—';

    return (
      `<b>🟦 Заявка: Доставка</b>\n` +
      `<b>Имя:</b> ${escapeHtml(name)}\n` +
      `<b>Телефон:</b> ${escapeHtml(phone)}\n` +
      `<b>Адрес:</b> ${escapeHtml(address)}\n` +
      (comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}\n` : '') +
      `\n<b>Позиции:</b>\n${itemsBlock}` +
      `\n<b>Итого:</b> ${fmtCurrency(total)} ₽`
    );
  }

  return `<b>Заявка</b>\n<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
}

export async function POST(req) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' }, { status: 500 });
    }

    const payload = await req.json();
    const text = buildMessage(payload);

    const res = await fetch(TG_API(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.description || 'Telegram API error' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
