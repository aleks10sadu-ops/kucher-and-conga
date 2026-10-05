// График приёма заказов на доставку (по Москве, часовой пояс гостя не влияет):
//   Пн–Чт: 12:00–21:45, Пт–Сб: 12:00–23:00, Вс: 13:00–21:45.
// Вне графика заказ не принимается: гостю показывается расписание на сегодня,
// сервер отклоняет попытку (409 delivery_closed) до создания заказа в iiko.

import type { OrderTimingMode } from './types';

type DayWindow = { from: [number, number]; to: [number, number] };

// Ключи — как у Intl weekday short (en-US).
const SCHEDULE: Record<string, DayWindow> = {
  Mon: { from: [12, 0], to: [21, 45] },
  Tue: { from: [12, 0], to: [21, 45] },
  Wed: { from: [12, 0], to: [21, 45] },
  Thu: { from: [12, 0], to: [21, 45] },
  Fri: { from: [12, 0], to: [23, 0] },
  Sat: { from: [12, 0], to: [23, 0] },
  Sun: { from: [13, 0], to: [21, 45] },
};

const SCHEDULED_ORDER_PREPARATION_MINUTES = 45;

function moscowParts(now: Date): { weekday: string; minutes: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { weekday, minutes: hour * 60 + minute };
}

const fmt = ([h, m]: [number, number]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export type OrderTimeValidation =
  | { ok: true; requestedAt: Date; completeBefore: string | null }
  | { ok: false; code: 'delivery_closed' | 'order_time_invalid' | 'order_time_past' | 'order_time_outside_schedule'; message: string };

const LOCAL_ORDER_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function windowForDate(date: string): DayWindow | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (day.toISOString().slice(0, 10) !== date) return null;
  return SCHEDULE[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getUTCDay()]] ?? null;
}

function scheduledWindowForDate(date: string): DayWindow | null {
  const window = windowForDate(date);
  if (!window) return null;
  const from = window.from[0] * 60 + window.from[1] + SCHEDULED_ORDER_PREPARATION_MINUTES;
  return { from: [Math.floor(from / 60), from % 60], to: window.to };
}

export function orderTimeSlots(date: string, now: Date = new Date()): string[] {
  const window = scheduledWindowForDate(date);
  if (!window) return [];
  const from = window.from[0] * 60 + window.from[1];
  const to = window.to[0] * 60 + window.to[1];
  const slots: string[] = [];
  for (let minute = from; minute <= to; minute += 15) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const candidate = new Date(`${date}T${time}:00+03:00`);
    if (candidate.getTime() > now.getTime()) slots.push(time);
  }
  return slots;
}

export function validateOrderTime(
  mode: OrderTimingMode,
  custom: string | undefined,
  now: Date = new Date(),
): OrderTimeValidation {
  if (mode === 'asap') {
    return isDeliveryOpen(now)
      ? { ok: true, requestedAt: now, completeBefore: null }
      : { ok: false, code: 'delivery_closed', message: deliveryClosedMessage(now) };
  }
  const match = custom ? LOCAL_ORDER_TIME.exec(custom) : null;
  if (!match) return { ok: false, code: 'order_time_invalid', message: 'Выберите дату и время заказа.' };
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const time = `${match[4]}:${match[5]}`;
  if (Number(match[4]) > 23 || Number(match[5]) > 59) {
    return { ok: false, code: 'order_time_invalid', message: 'Некорректное время заказа.' };
  }
  const requestedAt = new Date(`${date}T${time}:${match[6] || '00'}+03:00`);
  const window = scheduledWindowForDate(date);
  if (!window || Number.isNaN(requestedAt.getTime())) {
    return { ok: false, code: 'order_time_invalid', message: 'Некорректная дата заказа.' };
  }
  const minute = Number(match[4]) * 60 + Number(match[5]);
  const from = window.from[0] * 60 + window.from[1];
  const to = window.to[0] * 60 + window.to[1];
  if (Number(match[6] || '0') !== 0) {
    return { ok: false, code: 'order_time_invalid', message: 'Введите время без секунд.' };
  }
  if (requestedAt.getTime() <= now.getTime()) {
    return { ok: false, code: 'order_time_past', message: 'Выбранное время уже прошло.' };
  }
  if (minute < from || minute > to) {
    return { ok: false, code: 'order_time_outside_schedule', message: `Выберите время в интервале ${fmt(window.from)}–${fmt(window.to)}.` };
  }
  return { ok: true, requestedAt, completeBefore: `${date} ${time}:00.000` };
}

/** Открыт ли приём доставок прямо сейчас (или в переданный момент). Интервал [from, to). */
export function isDeliveryOpen(now: Date = new Date()): boolean {
  const { weekday, minutes } = moscowParts(now);
  const w = SCHEDULE[weekday];
  if (!w) return false;
  const from = w.from[0] * 60 + w.from[1];
  const to = w.to[0] * 60 + w.to[1];
  return minutes >= from && minutes < to;
}

/** Расписание на сегодня: «12:00–21:45» (для сообщения гостю вне графика). */
export function todayDeliveryWindowText(now: Date = new Date()): string {
  const { weekday } = moscowParts(now);
  const w = SCHEDULE[weekday];
  return w ? `${fmt(w.from)}–${fmt(w.to)}` : '';
}

/** Полное сообщение гостю, когда доставка сейчас не принимается. */
export function deliveryClosedMessage(now: Date = new Date()): string {
  return `Сейчас доставка не принимается. Приём заказов сегодня: ${todayDeliveryWindowText(now)} (по Москве). Оформите заказ в рабочее время — или позвоните нам.`;
}
