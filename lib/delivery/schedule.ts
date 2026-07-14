// График приёма заказов на доставку (по Москве, часовой пояс гостя не влияет):
//   Пн–Чт: 12:00–21:45, Пт–Сб: 12:00–23:00, Вс: 13:00–21:45.
// Вне графика заказ не принимается: гостю показывается расписание на сегодня,
// сервер отклоняет попытку (409 delivery_closed) до создания заказа в iiko.

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
