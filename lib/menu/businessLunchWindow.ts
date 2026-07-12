// Окно заказа бизнес-ланчей: будни (Пн–Пт) с 12:00 до 16:00 по Москве.
// Смотреть меню и составлять сет можно всегда; добавить в корзину и заказать —
// только в это окно. Считаем по Europe/Moscow, чтобы часовой пояс гостя не влиял.

export const BUSINESS_LUNCH_WINDOW_TEXT = 'по будням с 12:00 до 16:00';

function moscowParts(now: Date): { weekday: string; hour: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = dtf.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  return { weekday, hour };
}

// Открыто ли окно заказа прямо сейчас (или в переданный момент).
export function isBusinessLunchOpen(now: Date = new Date()): boolean {
  const { weekday, hour } = moscowParts(now);
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
  // [12:00, 16:00): в 16:00 уже закрыто.
  return isWeekday && hour >= 12 && hour < 16;
}
