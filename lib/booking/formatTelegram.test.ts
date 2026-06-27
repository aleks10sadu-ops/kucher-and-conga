import { describe, it, expect } from 'vitest';
import { formatBookingTelegram } from './formatTelegram';

describe('formatBookingTelegram', () => {
  it('renders a full preorder request', () => {
    const msg = formatBookingTelegram({
      firstName: 'Иван', lastName: 'Петров', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 10, children: 1, bookingType: 'preorder', hallName: 'Conga',
      cartItems: [{ name: 'Стейк', qty: 2, price: 1500 }],
      cartFoodSum: 3000, comment: 'Большой стол',
    });
    expect(msg).toMatch(/Петров Иван/);
    expect(msg).toMatch(/\+7 999 000-00-00/);
    expect(msg).toMatch(/2026-07-01 18:00/);
    expect(msg).toMatch(/Взрослых: 10/);
    expect(msg).toMatch(/Детей: 1/);
    expect(msg).toMatch(/Предзаказ/);
    expect(msg).toMatch(/Стейк × 2/);
    expect(msg).toMatch(/3000/);
  });
});
