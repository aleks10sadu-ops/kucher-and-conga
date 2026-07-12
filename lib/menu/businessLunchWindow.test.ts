import { describe, it, expect } from 'vitest';
import { isBusinessLunchOpen } from './businessLunchWindow';

// Москва = UTC+3 круглый год. Даты подобраны так, чтобы проверить границы окна.
// 2026-07-13 — понедельник, 2026-07-11 — суббота, 2026-07-12 — воскресенье.
describe('isBusinessLunchOpen', () => {
  it('открыто в будни с 12:00 до 16:00 по Москве', () => {
    expect(isBusinessLunchOpen(new Date('2026-07-13T09:00:00Z'))).toBe(true); // Пн 12:00 МСК
    expect(isBusinessLunchOpen(new Date('2026-07-13T12:59:00Z'))).toBe(true); // Пн 15:59 МСК
  });

  it('закрыто до 12:00 и с 16:00', () => {
    expect(isBusinessLunchOpen(new Date('2026-07-13T08:59:00Z'))).toBe(false); // Пн 11:59 МСК
    expect(isBusinessLunchOpen(new Date('2026-07-13T13:00:00Z'))).toBe(false); // Пн 16:00 МСК
  });

  it('закрыто в выходные даже в рабочие часы', () => {
    expect(isBusinessLunchOpen(new Date('2026-07-11T10:00:00Z'))).toBe(false); // Сб 13:00 МСК
    expect(isBusinessLunchOpen(new Date('2026-07-12T10:00:00Z'))).toBe(false); // Вс 13:00 МСК
  });
});
