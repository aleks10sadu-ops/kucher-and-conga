import type { BookingType } from './rules';
import { visibleModifiers } from './modifiers';

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
  cartItems: { name: string; qty: number; price: number; modifiers?: { group: string; option: string }[] }[];
  cartFoodSum: number;
  banquetMenuName?: string | null;
  banquetSaladNames?: readonly string[];
  calculatedAmount?: number | null;
  minimumOrder?: number | null;
  source?: string | null;
  sourceRef?: string | null;
  comment?: string;
  mode?: 'admin' | 'self';
}

const TYPE_LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

/** Escape user-supplied strings for HTML parse_mode in Telegram. */
function escapeHtml(value: string | number): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const amountFormatter = new Intl.NumberFormat('ru-RU');

function formatAmount(amount: number): string {
  return amountFormatter.format(amount).replace(/\u00a0/g, ' ');
}

function formatBookingDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(-2)}` : date;
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatBookingCopyText(i: TelegramBookingInput): string {
  let order = 'Уточнить';
  if (i.mode !== 'admin') {
    if (i.bookingType === 'onsite') order = 'По факту';
    if (i.bookingType === 'banquet') {
      const menu = singleLine(i.banquetMenuName ?? '').replace(' — банкетное меню ', ' ');
      const salads = (i.banquetSaladNames ?? []).map(singleLine).join(', ');
      order = `БМ: ${menu || 'Уточнить'}; Салаты: ${salads || 'Уточнить'}`;
    }
    if (i.bookingType === 'preorder') {
      const dishes = i.cartItems.map((item) => {
        const modifiers = visibleModifiers(item.modifiers)
          .map((modifier) => `${singleLine(modifier.group)}: ${singleLine(modifier.option)}`)
          .join('; ');
        return `${singleLine(item.name)} × ${item.qty}${modifiers ? ` (${modifiers})` : ''}`;
      });
      order = `ПЗ: ${dishes.join(', ') || 'Уточнить'}`;
    }
  }
  // Android only shows its built-in code-copy button from 75 UTF-16 units.
  // Telegram trims trailing ASCII spaces; NBSP survives its formatted-text cleanup.
  const guest = singleLine(`${i.lastName} ${i.firstName}`);
  return `Гость: ${guest}; Тел: ${singleLine(i.phone)}; ВЗР ${i.adults} ДЕТ ${i.children} На ${singleLine(i.time)} Комм: ${singleLine(i.comment ?? '') || '—'}; Тип заказа: ${order}`.padEnd(76, '\u00a0');
}

function formatBookingDetails(i: TelegramBookingInput): string {
  const lines: string[] = [];
  lines.push('🍽 Новая заявка на бронь');
  lines.push(`Гость: ${escapeHtml(i.lastName)} ${escapeHtml(i.firstName)}`.trim());
  lines.push(`Телефон: ${escapeHtml(i.phone)}`);
  lines.push(`Когда: ${escapeHtml(i.time)} ${escapeHtml(formatBookingDate(i.date))}`);
  lines.push(`Взрослых: ${escapeHtml(i.adults)}`);
  lines.push(`Детей: ${escapeHtml(i.children)}`);
  if (i.hallName) lines.push(`Зал: ${escapeHtml(i.hallName)}`);
  if (i.mode === 'admin') {
    lines.push('Режим: Связаться с администратором');
  } else {
    lines.push(`Тип: ${TYPE_LABEL[i.bookingType]}`);
  }
  if (i.mode !== 'admin' && i.bookingType === 'preorder' && i.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of i.cartItems) {
      lines.push(`  • ${escapeHtml(it.name)} × ${escapeHtml(it.qty)} — ${escapeHtml(it.price * it.qty)} ₽`);
      for (const m of visibleModifiers(it.modifiers)) {
        lines.push(`      – ${escapeHtml(m.group)}: ${escapeHtml(m.option)}`);
      }
    }
    lines.push(`Сумма: ${escapeHtml(i.cartFoodSum)} ₽`);
  }
  if (i.mode !== 'admin' && i.bookingType === 'banquet' && i.banquetMenuName) {
    lines.push(`Банкетное меню: ${escapeHtml(i.banquetMenuName)}`);
  }
  if (i.mode !== 'admin' && i.bookingType === 'banquet' && i.banquetSaladNames?.length) {
    lines.push(`Салаты: ${i.banquetSaladNames.map(escapeHtml).join(', ')}`);
  }
  if (i.mode !== 'admin' && i.calculatedAmount != null) {
    lines.push(`Расчётная сумма: ${formatAmount(i.calculatedAmount)} ₽`);
  }
  if (i.mode !== 'admin' && i.minimumOrder != null) {
    lines.push(`Минимальная сумма зала: ${formatAmount(i.minimumOrder)} ₽`);
  }
  if (i.source) {
    const ref = i.sourceRef ? ` — ${escapeHtml(i.sourceRef)}` : '';
    lines.push(`Источник: ${escapeHtml(i.source)}${ref}`);
  }
  if (i.comment && i.comment.trim()) lines.push(`Комментарий: ${escapeHtml(i.comment.trim())}`);
  return lines.join('\n');
}

const COPY_LABEL = 'Для Excel:\n';
const MESSAGE_LIMIT = 4096;

export function formatBookingTelegram(i: TelegramBookingInput): string {
  return `${formatBookingDetails(i)}\n${COPY_LABEL}<pre>${escapeHtml(formatBookingCopyText(i))}</pre>`;
}

// Input contains escaped text only. Keep entities and Unicode characters intact.
function splitEscapedText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let length = 0;
  for (const token of text.match(/&(?:amp|lt|gt);|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) ?? []) {
    const tokenLength = token.startsWith('&') ? 1 : token.length;
    if (length + tokenLength > limit) {
      chunks.push(chunk);
      chunk = '';
      length = 0;
    }
    chunk += token;
    length += tokenLength;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

/** Usually one message; oversized requests keep all details in subsequent messages. */
export function formatBookingTelegramMessages(i: TelegramBookingInput): string[] {
  const details = formatBookingDetails(i);
  const copyText = escapeHtml(formatBookingCopyText(i));
  if (splitEscapedText(`${details}\n${COPY_LABEL}${copyText}`, MESSAGE_LIMIT).length === 1) {
    return [`${details}\n${COPY_LABEL}<pre>${copyText}</pre>`];
  }
  const continuationLabel = 'Для Excel (продолжение):\n';
  return [
    ...splitEscapedText(details, MESSAGE_LIMIT),
    ...splitEscapedText(copyText, MESSAGE_LIMIT - continuationLabel.length)
      .map((chunk, index) => `${index === 0 ? COPY_LABEL : continuationLabel}<pre>${chunk}</pre>`),
  ];
}
