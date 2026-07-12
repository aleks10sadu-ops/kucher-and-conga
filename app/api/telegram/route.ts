// app/api/telegram/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { formatBookingTelegram } from '@/lib/booking/formatTelegram';
import { visibleModifiers } from '@/lib/booking/modifiers';
import { getStopListProductIds } from '@/lib/iiko/stopList';

const TG_API = (token: string) => `https://api.telegram.org/bot${token}/sendMessage`;

function escapeHtml(s: string | number = ''): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtCurrency(num: number | string): string {
  try { return Number(num).toLocaleString('ru-RU'); } catch { return String(num); }
}

// Форматирование времени для Москвы (GMT+3)
function formatMoscowTime(dateString: string): string {
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

interface OrderItem {
  name: string;
  qty: number;
  price: number;
  productId?: string;
  modifiers?: { group: string; option: string }[];
}

interface BasePayload {
  type: 'booking' | 'delivery';
  name: string;
  phone: string;
  comment?: string;
}

interface BookingPayload extends BasePayload {
  type: 'booking';
  firstName: string;
  lastName: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  bookingType: 'onsite' | 'preorder' | 'banquet';
  hallName: string | null;
  cartItems: OrderItem[];
  cartFoodSum: number;
  banquetPackageName?: string | null;
  mode?: 'admin' | 'self';
}

interface DeliveryPayload extends BasePayload {
  type: 'delivery';
  address: string;
  allergy?: string;
  items?: OrderItem[];
  subtotal?: number;
  deliveryPrice?: number;
  total?: number;
  deliveryTime?: 'asap' | 'custom';
  deliveryTimeCustom?: string;
  paymentMethod?: 'card' | 'transfer' | 'cash';
  changeAmount?: string | number;
}

type TelegramPayload = BookingPayload | DeliveryPayload;

function buildMessage(payload: TelegramPayload): string {
  const { type } = payload; // "booking" | "delivery"

  if (type === 'booking') {
    const {
      firstName, lastName, phone, date, time,
      adults, children, bookingType, hallName,
      cartItems, cartFoodSum, banquetPackageName, comment, mode,
    } = payload;
    return formatBookingTelegram({
      firstName, lastName, phone, date, time,
      adults, children, bookingType, hallName,
      cartItems, cartFoodSum, banquetPackageName, comment,
      mode,
    });
  }

  if (type === 'delivery') {
    const {
      name,
      phone,
      address,
      comment,
      allergy,
      items = [],
      deliveryPrice = 0,
      total = 0,
      deliveryTime,
      deliveryTimeCustom,
      paymentMethod,
      changeAmount
    } = payload;

    // Формируем список позиций, включая доставку если она платная
    const allItems = [...items];
    if (deliveryPrice > 0) {
      allItems.push({
        name: `Платная доставка ${deliveryPrice} ₽`,
        qty: 1,
        price: deliveryPrice
      });
    }

    const itemsBlock = allItems.length
      ? allItems.map(i => {
          const head = `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`;
          const mods = visibleModifiers((i as OrderItem).modifiers)
            .map(m => `\n    – ${escapeHtml(m.group)}: ${escapeHtml(m.option)}`)
            .join('');
          return head + mods;
        }).join('\n')
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

export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !process.env.TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' }, { status: 500 });
    }

    const payload = await req.json() as TelegramPayload;

    // Стоп-лист для предзаказа к брони: блюда «на стопе» отклоняем до отправки заявки.
    // (Доставки сюда попадают только TG-фолбэком после /api/orders, где проверка уже была.)
    if (payload.type === 'booking' && payload.bookingType === 'preorder' && Array.isArray(payload.cartItems)) {
      const stopped = await getStopListProductIds();
      const blocked = payload.cartItems
        .filter((it) => it.productId && stopped.has(String(it.productId)))
        .map((it) => it.name);
      if (blocked.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: 'stop_list',
            message: `Увы, уже закончилось: ${blocked.join(', ')}. Уберите эти блюда из предзаказа и отправьте заявку снова.`,
            blocked,
          },
          { status: 409 },
        );
      }
    }

    // Брони — в отдельную группу, чтобы доставщики не видели лишнего;
    // доставки (fallback при недоступной iiko) — в общую группу доставок.
    const chatId = payload.type === 'booking'
      ? (process.env.TELEGRAM_BOOKING_CHAT_ID || process.env.TELEGRAM_CHAT_ID)
      : process.env.TELEGRAM_CHAT_ID;
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
