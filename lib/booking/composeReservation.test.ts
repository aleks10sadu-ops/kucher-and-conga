import { describe, it, expect } from 'vitest';
import { composeReservationComment } from './composeReservation';

describe('composeReservationComment', () => {
  it('includes adults/children/type/hall and preorder items+sum', () => {
    const s = composeReservationComment({
      adults: 10,
      children: 2,
      bookingType: 'preorder',
      hallName: 'Conga',
      cartItems: [
        { name: 'Цезарь', qty: 2, price: 450 },
        { name: 'Борщ', qty: 1, price: 380 },
      ],
      cartFoodSum: 1280,
      comment: 'У окна',
    });
    expect(s).toMatch(/Взрослых: 10/);
    expect(s).toMatch(/Детей: 2/);
    expect(s).toMatch(/предзаказ/i);
    expect(s).toMatch(/Conga/);
    expect(s).toMatch(/Цезарь × 2/);
    expect(s).toMatch(/1280/);
    expect(s).toMatch(/У окна/);
  });

  it('includes banquet package when banquet', () => {
    const s = composeReservationComment({
      adults: 20,
      children: 0,
      bookingType: 'banquet',
      hallName: 'Морской (Кучер)',
      cartItems: [],
      cartFoodSum: 0,
      banquetPackageName: 'Кучер — банкет 5000 ₽/чел',
    });
    expect(s).toMatch(/банкет/i);
    expect(s).toMatch(/5000/);
    expect(s).not.toMatch(/Цезарь/);
  });
});
