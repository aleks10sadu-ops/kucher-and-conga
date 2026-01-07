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

// Форматирование времени для Москвы (GMT+3)
function formatMoscowTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const moscowTime = new Date(date.getTime() + (3 * 60 * 60 * 1000)); // GMT+3
  return moscowTime.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildMessage(payload) {
  const { type } = payload; // "booking" | "delivery"

  if (type === 'booking') {
    const { name, phone, date, time, guests, comment, items = [], total = 0 } = payload;

    // Форматируем дату и время в московское время
    let formattedDateTime = '';
    if (date && time) {
      const dateTimeString = `${date}T${time}`;
      formattedDateTime = formatMoscowTime(dateTimeString);
    } else {
      formattedDateTime = `${date || '-'} ${time || '-'}`;
    }

    const itemsBlock = items.length
      ? '\n<b>Заказ/пожелания (из корзины):</b>\n' +
        items.map(i => `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`).join('\n') +
        `\n<b>Итого:</b> ${fmtCurrency(total)} ₽`
      : '';
    return (
      `<b>🟩 Заявка: Бронирование</b>\n` +
      `<b>Имя:</b> ${escapeHtml(name)}\n` +
      `<b>Телефон:</b> ${escapeHtml(phone)}\n` +
      `<b>Дата и время:</b> ${formattedDateTime}\n` +
      `<b>Гостей:</b> ${escapeHtml(guests || '-')}\n` +
      (comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}\n` : '') +
      itemsBlock
    );
  }

  if (type === 'delivery') {
    const {
      name,
      phone,
      address,
      comment,
      allergy,
      items = [],
      subtotal = 0,
      deliveryPrice = 0,
      total = 0,
      deliveryTime,
      deliveryTimeCustom,
      paymentMethod,
      changeAmount
    } = payload;

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

    // Форматирование времени доставки
    let deliveryTimeInfo = '';
    if (deliveryTime === 'asap') {
      deliveryTimeInfo = 'Как можно быстрее';
    } else if (deliveryTime === 'custom' && deliveryTimeCustom) {
      deliveryTimeInfo = formatMoscowTime(deliveryTimeCustom);
    }

    // Форматирование способа оплаты
    let paymentInfo = '';
    switch (paymentMethod) {
      case 'card':
        paymentInfo = 'Картой (при получении)';
        break;
      case 'transfer':
        paymentInfo = 'Переводом';
        break;
      case 'cash':
        paymentInfo = 'Наличными';
        if (changeAmount === 'no-change') {
          paymentInfo += ' (без сдачи)';
        } else if (changeAmount && changeAmount !== 'no-change') {
          paymentInfo += ` (сдача с ${fmtCurrency(changeAmount)} ₽)`;
        }
        break;
    }

    return (
      `<b>🟦 Заявка: Доставка</b>\n` +
      `<b>Имя:</b> ${escapeHtml(name)}\n` +
      `<b>Телефон:</b> ${escapeHtml(phone)}\n` +
      `<b>Адрес:</b> ${escapeHtml(address)}\n` +
      `<b>Время доставки:</b> ${deliveryTimeInfo}\n` +
      `<b>Оплата:</b> ${paymentInfo}\n` +
      (comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}\n` : '') +
      (allergy ? `<b>⚠️ ${escapeHtml(allergy)}</b>\n` : '') +
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
