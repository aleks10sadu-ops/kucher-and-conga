// app/api/telegram/route.ts

import { formatBookingTelegram, formatBookingTelegramMessages } from '@/lib/booking/formatTelegram';

import { visibleModifiers } from '@/lib/booking/modifiers';


import { SITE } from '@/app/components/forest/site';


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

function formatOrderTime(value: string): string {
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (local) {
    const date = new Date(`${local[1]}-${local[2]}-${local[3]}T12:00:00`);
    const localDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).replace(/\s*г\.$/, '');
    return `${localDate} г. в ${local[4]}:${local[5]}`;
  }
  return formatMoscowTime(value);
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
  banquetMenuName?: string | null;
  banquetSaladNames?: string[];
  calculatedAmount?: number | null;
  minimumOrder?: number | null;
  source?: string | null;
  sourceRef?: string | null;
  mode?: 'admin' | 'self';
}

export interface DeliveryPayload extends BasePayload {
  type: 'delivery';
  fulfillmentType?: 'delivery' | 'pickup';
  address: string;
  allergy?: string;
  items?: OrderItem[];
  subtotal?: number;
  zoneName?: string;
  deliveryPrice?: number;
  total?: number;
  deliveryTime?: 'asap' | 'custom';
  deliveryTimeCustom?: string;
  paymentMethod?: 'card' | 'transfer' | 'cash';
  changeAmount?: string | number;
}

export type TelegramPayload = BookingPayload | DeliveryPayload;

export function buildMessage(payload: TelegramPayload): string {
  const { type } = payload; // "booking" | "delivery"

  if (type === 'booking') {
    const {
      firstName, lastName, phone, date, time,
      adults, children, bookingType, hallName,
      cartItems, cartFoodSum, banquetMenuName, banquetSaladNames,
      calculatedAmount, minimumOrder, source, sourceRef, comment, mode,
    } = payload;
    return formatBookingTelegram({
      firstName, lastName, phone, date, time,
      adults, children, bookingType, hallName,
      cartItems, cartFoodSum, banquetMenuName, banquetSaladNames,
      calculatedAmount, minimumOrder, source, sourceRef, comment,
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
      zoneName,
      deliveryPrice = 0,
      total = 0,
      deliveryTime,
      deliveryTimeCustom,
      paymentMethod,
      changeAmount
    } = payload;
    const isPickup = payload.fulfillmentType === 'pickup';
    const fulfillmentLabel = isPickup ? 'Самовывоз' : 'Доставка';
    const locationLine = isPickup
      ? `<b>Забрать по адресу:</b> ${escapeHtml(SITE.address)}\n`
      : `<b>Адрес доставки:</b> ${escapeHtml(address)}\n`;

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
      deliveryTimeInfo = formatOrderTime(deliveryTimeCustom);
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
      `<b>🟦 Заявка: ${fulfillmentLabel}</b>\n` +
      `<b>Имя:</b> ${escapeHtml(name)}\n` +
      `<b>Телефон:</b> ${escapeHtml(phone)}\n` +
      locationLine +
      (!isPickup && zoneName ? `<b>Зона доставки:</b> ${escapeHtml(zoneName)}\n` : '') +
      `<b>Время ${isPickup ? 'самовывоза' : 'доставки'}:</b> ${deliveryTimeInfo}\n` +
      `<b>Оплата:</b> ${paymentInfo}\n` +
      (comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}\n` : '') +
      (allergy ? `<b>⚠️ ${escapeHtml(allergy)}</b>\n` : '') +
      `\n<b>Позиции:</b>\n${itemsBlock}` +
      `\n<b>Итого:</b> ${fmtCurrency(total)} ₽`
    );
  }

  return `<b>Заявка</b>\n<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
}
