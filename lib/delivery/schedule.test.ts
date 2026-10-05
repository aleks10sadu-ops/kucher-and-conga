import { describe, it, expect } from 'vitest';
import {
  isDeliveryOpen,
  todayDeliveryWindowText,
  deliveryClosedMessage,
  orderTimeSlots,
  validateOrderTime,
} from './schedule';

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

describe('scheduled order slots', () => {
  it('uses 15-minute slots and includes the closing boundary', () => {
    const slots = orderTimeSlots('2026-07-13', msk('2026-07-12T10:00:00'));
    expect(slots[0]).toBe('12:45');
    expect(slots[1]).toBe('13:00');
    expect(slots.at(-1)).toBe('21:45');
  });

  it('uses the later Friday closing boundary', () => {
    expect(orderTimeSlots('2026-07-17', msk('2026-07-16T10:00:00')).at(-1)).toBe('23:00');
  });

  it('removes elapsed slots for today without hiding future days', () => {
    const now = msk('2026-07-13T13:07:00');
    expect(orderTimeSlots('2026-07-13', now)[0]).toBe('13:15');
    expect(orderTimeSlots('2026-07-14', now)[0]).toBe('12:45');
  });

  it('starts Sunday slots 45 minutes after its later opening', () => {
    expect(orderTimeSlots('2026-07-19', msk('2026-07-13T14:00:00'))[0]).toBe('13:45');
  });
});

describe('validateOrderTime', () => {
  it('accepts a future scheduled order while the restaurant is currently closed', () => {
    const result = validateOrderTime('custom', '2026-07-13T12:45:00', msk('2026-07-13T08:00:00'));
    expect(result).toMatchObject({ ok: true, completeBefore: '2026-07-13 12:45:00.000' });
  });

  it('rejects past and outside-schedule timestamps', () => {
    expect(validateOrderTime('custom', '2026-07-13T12:00:00', msk('2026-07-13T12:01:00')))
      .toMatchObject({ ok: false, code: 'order_time_past' });
    expect(validateOrderTime('custom', '2026-07-13T22:00:00', msk('2026-07-13T08:00:00')))
      .toMatchObject({ ok: false, code: 'order_time_outside_schedule' });
  });

  it('accepts arbitrary future minutes but still rejects non-zero seconds', () => {
    const now = msk('2026-07-13T08:00:00');

    expect(validateOrderTime('custom', '2026-07-13T12:47:00', now))
      .toMatchObject({ ok: true, completeBefore: '2026-07-13 12:47:00.000' });
    expect(validateOrderTime('custom', '2026-07-13T12:15:01', now))
      .toMatchObject({ ok: false, code: 'order_time_invalid' });
  });

  it('reports an invalid manually entered clock value as a time error', () => {
    expect(validateOrderTime('custom', '2026-07-13T25:99:00', msk('2026-07-13T08:00:00')))
      .toMatchObject({
        ok: false,
        code: 'order_time_invalid',
        message: 'Некорректное время заказа.',
      });
  });

  it('keeps ASAP tied to the current opening window', () => {
    expect(validateOrderTime('asap', undefined, msk('2026-07-13T11:59:00')))
      .toMatchObject({ ok: false, code: 'delivery_closed' });
    expect(validateOrderTime('asap', undefined, msk('2026-07-13T12:00:00')))
      .toMatchObject({ ok: true, completeBefore: null });
  });

  it.each([
    ['2026-07-13', '12:00', '12:44', '12:45'],
    ['2026-07-14', '12:00', '12:44', '12:45'],
    ['2026-07-15', '12:00', '12:44', '12:45'],
    ['2026-07-16', '12:00', '12:44', '12:45'],
    ['2026-07-17', '12:00', '12:44', '12:45'],
    ['2026-07-18', '12:00', '12:44', '12:45'],
    ['2026-07-19', '13:00', '13:44', '13:45'],
  ])('enforces opening +45 minutes for %s', (date, opening, tooEarly, firstTime) => {
    const now = msk('2026-07-12T10:00:00');
    for (const time of [opening, tooEarly]) {
      expect(validateOrderTime('custom', `${date}T${time}:00`, now)).toMatchObject({
        ok: false,
        code: 'order_time_outside_schedule',
        message: `Выберите время в интервале ${firstTime}–${date === '2026-07-17' || date === '2026-07-18' ? '23:00' : '21:45'}.`,
      });
    }
    expect(validateOrderTime('custom', `${date}T${firstTime}:00`, now)).toMatchObject({ ok: true });
  });
});
