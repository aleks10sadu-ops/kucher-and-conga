import type { BookingType } from './rules';

export interface ComposeInput {
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

export function composeReservationComment(input: ComposeInput): string {
  const lines: string[] = [];
  lines.push(`Тип: ${TYPE_LABEL[input.bookingType]}`);
  lines.push(`Взрослых: ${input.adults}; Детей: ${input.children}`);
  if (input.hallName) lines.push(`Зал: ${input.hallName}`);

  if (input.bookingType === 'preorder' && input.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of input.cartItems) {
      lines.push(`  • ${it.name} × ${it.qty} — ${it.price * it.qty} ₽`);
    }
    lines.push(`Сумма предзаказа: ${input.cartFoodSum} ₽`);
  }
  if (input.bookingType === 'banquet' && input.banquetPackageName) {
    lines.push(`Банкетный пакет: ${input.banquetPackageName}`);
  }
  if (input.comment && input.comment.trim()) {
    lines.push(`Комментарий: ${input.comment.trim()}`);
  }
  return lines.join('\n');
}
