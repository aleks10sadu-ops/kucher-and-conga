import type { BookingType } from './rules';

export interface TelegramBookingInput {
  firstName: string;
  lastName: string;
  phone: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  bookingType: BookingType;
  hallName: string | null;
  cartItems: { name: string; qty: number; price: number }[];
  cartFoodSum: number;
  banquetPackageName?: string | null;
  comment?: string;
}

const TYPE_LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

/** Escape user-supplied strings for HTML parse_mode in Telegram. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatBookingTelegram(i: TelegramBookingInput): string {
  const lines: string[] = [];
  lines.push('🍽 Новая заявка на бронь');
  lines.push(`Гость: ${escapeHtml(i.lastName)} ${escapeHtml(i.firstName)}`.trim());
  lines.push(`Телефон: ${escapeHtml(i.phone)}`);
  lines.push(`Когда: ${i.date} ${i.time}`);
  lines.push(`Взрослых: ${i.adults}`);
  lines.push(`Детей: ${i.children}`);
  if (i.hallName) lines.push(`Зал: ${escapeHtml(i.hallName)}`);
  lines.push(`Тип: ${TYPE_LABEL[i.bookingType]}`);
  if (i.bookingType === 'preorder' && i.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of i.cartItems) lines.push(`  • ${escapeHtml(it.name)} × ${it.qty} — ${it.price * it.qty} ₽`);
    lines.push(`Сумма: ${i.cartFoodSum} ₽`);
  }
  if (i.bookingType === 'banquet' && i.banquetPackageName) {
    lines.push(`Банкетный пакет: ${escapeHtml(i.banquetPackageName)}`);
  }
  if (i.comment && i.comment.trim()) lines.push(`Комментарий: ${escapeHtml(i.comment.trim())}`);
  return lines.join('\n');
}
