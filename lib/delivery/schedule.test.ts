import { describe, it, expect } from 'vitest';
import { isDeliveryOpen, todayDeliveryWindowText, deliveryClosedMessage } from './schedule';

// Хелпер: московское время → Date (МСК = UTC+3, без перехода на летнее время).
const msk = (iso: string) => new Date(`${iso}+03:00`);

describe('isDeliveryOpen', () => {
  it('будни Пн–Чт: 12:00–21:45', () => {
    expect(isDeliveryOpen(msk('2026-07-13T11:59:00'))).toBe(false); // Пн до открытия
    expect(isDeliveryOpen(msk('2026-07-13T12:00:00'))).toBe(true);  // Пн открытие
    expect(isDeliveryOpen(msk('2026-07-14T21:44:59'))).toBe(true);  // Вт последняя минута
    expect(isDeliveryOpen(msk('2026-07-15T21:45:00'))).toBe(false); // Ср 21:45 — уже закрыто
    expect(isDeliveryOpen(msk('2026-07-16T18:30:00'))).toBe(true);  // Чт вечер
  });

  it('Пт и Сб: 12:00–23:00', () => {
    expect(isDeliveryOpen(msk('2026-07-17T22:30:00'))).toBe(true);  // Пт поздний вечер
    expect(isDeliveryOpen(msk('2026-07-17T23:00:00'))).toBe(false); // Пт 23:00 — закрыто
    expect(isDeliveryOpen(msk('2026-07-18T22:59:00'))).toBe(true);  // Сб
    expect(isDeliveryOpen(msk('2026-07-18T11:30:00'))).toBe(false); // Сб до открытия
  });

  it('Вс: 13:00–21:45', () => {
    expect(isDeliveryOpen(msk('2026-07-19T12:30:00'))).toBe(false); // Вс в 12:30 ещё закрыто
    expect(isDeliveryOpen(msk('2026-07-19T13:00:00'))).toBe(true);
    expect(isDeliveryOpen(msk('2026-07-19T21:45:00'))).toBe(false);
  });

  it('часовой пояс гостя не влияет (тот же момент в UTC)', () => {
    // Пн 12:30 МСК = Пн 09:30 UTC
    expect(isDeliveryOpen(new Date('2026-07-13T09:30:00Z'))).toBe(true);
    // Пн 21:50 МСК = Пн 18:50 UTC
    expect(isDeliveryOpen(new Date('2026-07-13T18:50:00Z'))).toBe(false);
  });
});

describe('todayDeliveryWindowText', () => {
  it('показывает расписание текущего дня', () => {
    expect(todayDeliveryWindowText(msk('2026-07-13T10:00:00'))).toBe('12:00–21:45'); // Пн
    expect(todayDeliveryWindowText(msk('2026-07-17T10:00:00'))).toBe('12:00–23:00'); // Пт
    expect(todayDeliveryWindowText(msk('2026-07-19T10:00:00'))).toBe('13:00–21:45'); // Вс
  });
});

describe('deliveryClosedMessage', () => {
  it('содержит расписание сегодняшнего дня', () => {
    expect(deliveryClosedMessage(msk('2026-07-19T09:00:00'))).toContain('13:00–21:45');
  });
});
