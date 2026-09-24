import { describe, it, expect } from 'vitest';
import {
  evaluateBooking,
  classifyHall,
  preorderMinimum,
  banquetPackagesForHall,
  bookingDateClosureMessage,
  bookingHallClosureMessage,
  isBookingDateClosed,
  bookingTimeWindowForDate,
  isBookingTimeAllowed,
  type BookingRuleInput,
} from './rules';

// now = 2026-06-28 13:00 МСК (10:00 UTC). "today" в МСК = 28 июня.
const NOW = new Date('2026-06-28T10:00:00Z');

function base(over: Partial<BookingRuleInput> = {}): BookingRuleInput {
  return {
    adults: 2,
    children: 0,
    eventDate: '2026-06-30', // +2 дня
    eventTime: '18:00',
    now: NOW,
    hallGroup: 'conga',
    type: 'onsite',
    cartFoodSum: 0,
    ...over,
  };
}
const allowed = (v: ReturnType<typeof evaluateBooking>, t: string) =>
  v.availableTypes.find((x) => x.type === t)!.allowed;

const emerald = {
  name: 'Изумрудный зал',
  allowedBookingTypes: ['preorder', 'banquet'] as const,
  minimumOrder: 70000,
};

const ruby = {
  name: 'Рубиновый зал',
  allowedBookingTypes: ['preorder', 'banquet'] as const,
  minimumOrder: 45000,
};

describe('classifyHall', () => {
  it('maps names to groups', () => {
    expect(classifyHall('Conga')).toBe('conga');
    expect(classifyHall('Морской (Кучер)')).toBe('kucher');
    expect(classifyHall('Летняя веранда')).toBe('kucher');
    expect(classifyHall('Банкетные залы')).toBe('other');
    expect(classifyHall('Беседки')).toBe('other');
    expect(classifyHall(null)).toBeNull();
  });
});

describe('preorderMinimum / banquetPackagesForHall', () => {
  it('returns minimums', () => {
    expect(preorderMinimum('conga')).toBe(4000);
    expect(preorderMinimum('kucher')).toBe(3000);
    expect(preorderMinimum('other')).toBeNull();
  });
  it('filters banquet packages by hall', () => {
    expect(banquetPackagesForHall('conga')).toBe('conga');
    expect(banquetPackagesForHall('kucher')).toBe('all');
    expect(banquetPackagesForHall('other')).toBe('all');
    expect(banquetPackagesForHall(null)).toBeNull();
  });
});

describe('booking closure dates', () => {
  it('blocks 1 September 2026 only', () => {
    expect(isBookingDateClosed('2026-08-31')).toBe(false);
    expect(isBookingDateClosed('2026-09-01')).toBe(true);
    expect(isBookingDateClosed('2026-09-02')).toBe(false);
    expect(bookingDateClosureMessage('2026-09-01')).toBe('1 сентября бронирование недоступно.');
  });

  it('blocks 18 December through 4 January inclusively', () => {
    expect(isBookingDateClosed('2026-12-17')).toBe(false);
    expect(isBookingDateClosed('2026-12-18')).toBe(true);
    expect(isBookingDateClosed('2027-01-04')).toBe(true);
    expect(isBookingDateClosed('2027-01-05')).toBe(false);
    expect(bookingDateClosureMessage('2026-12-18')).toBe('С 18 декабря по 4 января бронирование недоступно.');
    expect(bookingDateClosureMessage('2026-12-17')).toBeNull();
  });
});

describe('October hall closure', () => {
  it.each(['Барный зал', 'Веранда (Кучер)', 'Морской зал'])('closes %s from 18 through 29 October 2026', (hallName) => {
    expect(bookingHallClosureMessage('2026-10-17', hallName)).toBeNull();
    expect(bookingHallClosureMessage('2026-10-18', hallName)).toContain('недоступно');
    expect(bookingHallClosureMessage('2026-10-29', hallName)).toContain('недоступно');
    expect(bookingHallClosureMessage('2026-10-30', hallName)).toBeNull();
    expect(bookingHallClosureMessage('2027-10-18', hallName)).toBeNull();
  });

  it('keeps other halls available during the closure', () => {
    expect(bookingHallClosureMessage('2026-10-18', 'Conga')).toBeNull();
    expect(bookingHallClosureMessage('2026-10-29', 'Изумрудный зал')).toBeNull();
    expect(bookingHallClosureMessage('2026-10-18', null)).toBeNull();
    expect(isBookingDateClosed('2026-10-18')).toBe(false);
  });
});

describe('booking time window', () => {
  it('accepts manually entered times inside restaurant and booking hours', () => {
    expect(bookingTimeWindowForDate('2026-08-15')).toEqual({ start: '12:00', end: '22:00' });
    expect(isBookingTimeAllowed('2026-08-15', '11:30')).toBe(false);
    expect(isBookingTimeAllowed('2026-08-15', '12:15')).toBe(true);
    expect(isBookingTimeAllowed('2026-08-15', '21:47')).toBe(true);
    expect(isBookingTimeAllowed('2026-08-15', '22:30')).toBe(false);
    expect(isBookingTimeAllowed('2026-08-15', '25:00')).toBe(false);
  });

  it('starts at 13:00 on Sunday when the restaurant opens', () => {
    expect(isBookingTimeAllowed('2026-08-16', '12:00')).toBe(false);
    expect(isBookingTimeAllowed('2026-08-16', '13:00')).toBe(true);
    expect(bookingTimeWindowForDate('')).toBeNull();
  });
});

describe('type availability by adults', () => {
  it('<6 adults: onsite+preorder yes, banquet no (min 6)', () => {
    const v = evaluateBooking(base({ adults: 4 }));
    expect(allowed(v, 'onsite')).toBe(true);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(false);
  });
  it('6-8 adults: all allowed (date +2)', () => {
    const v = evaluateBooking(base({ adults: 7 }));
    expect(allowed(v, 'onsite')).toBe(true);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(true);
  });
  it('9-11 adults: onsite disabled', () => {
    const v = evaluateBooking(base({ adults: 10 }));
    expect(allowed(v, 'onsite')).toBe(false);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(true);
  });
  it('12+ adults: only banquet', () => {
    const v = evaluateBooking(base({ adults: 12 }));
    expect(allowed(v, 'onsite')).toBe(false);
    expect(allowed(v, 'preorder')).toBe(false);
    expect(allowed(v, 'banquet')).toBe(true);
  });
});

describe('date rules by booking type', () => {
  it('preorder stays available same-day without a date-limit note', () => {
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-28', type: 'preorder', hallGroup: 'conga', cartFoodSum: 20000 }));
    expect(allowed(v, 'preorder')).toBe(true);
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).not.toMatch(/накануне|16:00|срок/i);
    expect(v.info.join(' ')).toMatch(/предоплату 10 000 ₽/i);
  });
  it('banquet is unavailable for today', () => {
    const v = evaluateBooking(base({ adults: 8, eventDate: '2026-06-28', type: 'banquet', hallGroup: 'kucher' }));
    expect(allowed(v, 'banquet')).toBe(false);
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/минимум за 2 дня/i);
  });
});

describe('preorder minimum gating (per adult)', () => {
  it('calculates the prepayment from the cart total', () => {
    const below = evaluateBooking(base({ type: 'preorder', hallGroup: 'other', cartFoodSum: 9999 }));
    const threshold = evaluateBooking(base({ type: 'preorder', hallGroup: 'other', cartFoodSum: 10000 }));
    expect(below.info.join(' ')).toMatch(/предоплату 5 000 ₽/i);
    expect(threshold.info.join(' ')).toMatch(/предоплату 10 000 ₽/i);
  });
  it('conga: minimum is 4000 ₽ PER ADULT (2 adults -> 8000)', () => {
    // 4000 in cart with 2 adults must be blocked: required = 4000*2 = 8000
    const v = evaluateBooking(base({ adults: 2, type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 4000 }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/8000/); // требуется 8000
    expect(v.blocking.join(' ')).toMatch(/4000/); // доберите ещё 4000
    expect(v.info.join(' ')).not.toMatch(/предоплату [\d ]+ ₽/i);
  });
  it('conga: 6 adults need 24000 — 4000 must be blocked (reported bug)', () => {
    const v = evaluateBooking(base({ adults: 6, type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 4000 }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/24000/);
  });
  it('conga: cart meeting per-adult total can submit (2 adults, 8000)', () => {
    const v = evaluateBooking(base({ adults: 2, type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 8000 }));
    expect(v.canSubmit).toBe(true);
  });
  it('kucher: minimum is 3000 ₽ PER ADULT (3 adults -> 9000)', () => {
    const blocked = evaluateBooking(base({ adults: 3, type: 'preorder', hallGroup: 'kucher', eventDate: '2026-06-30', cartFoodSum: 8000 }));
    expect(blocked.canSubmit).toBe(false);
    expect(blocked.blocking.join(' ')).toMatch(/9000/);
    const ok = evaluateBooking(base({ adults: 3, type: 'preorder', hallGroup: 'kucher', eventDate: '2026-06-30', cartFoodSum: 9000 }));
    expect(ok.canSubmit).toBe(true);
  });
  it('other hall: no minimum, admin-contact info, can submit non-empty', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'other', eventDate: '2026-06-30', cartFoodSum: 500 }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/админ/i);
  });
  it('empty cart blocks preorder', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'kucher', eventDate: '2026-06-30', cartFoodSum: 0 }));
    expect(v.canSubmit).toBe(false);
  });
  it('preorder shows the cart hint as info', () => {
    const v = evaluateBooking(base({ adults: 2, type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 8000 }));
    expect(v.info.join(' ')).toMatch(/корзин/i);
  });
});

describe('banquet submit + no-type-available', () => {
  it('banquet allowed -> admin-contact info, can submit with hall', () => {
    const v = evaluateBooking(base({ adults: 8, type: 'banquet', hallGroup: 'kucher', eventDate: '2026-07-05' }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/предоплат/i);
  });
  it('12+ adults tomorrow -> banquet stays unavailable until the lead time is met', () => {
    const v = evaluateBooking(base({ adults: 14, eventDate: '2026-06-29', type: 'banquet', hallGroup: 'kucher' }));
    expect(allowed(v, 'banquet')).toBe(false);
    expect(v.canSubmit).toBe(false);
  });
});

describe('exact banquet hall policies', () => {
  it('disables onsite for exact banquet halls with the configured reason', () => {
    const result = evaluateBooking(base({ hall: emerald, type: 'onsite' }));

    expect(result.availableTypes.find((item) => item.type === 'onsite')).toEqual({
      type: 'onsite',
      allowed: false,
      reason: 'Для этого банкетного зала выберите предзаказ или банкетное меню',
    });
  });

  it.each([
    [emerald, 69999, false, 1],
    [emerald, 70000, true, 0],
    [ruby, 44999, false, 1],
    [ruby, 45000, true, 0],
  ])('gates preorder against the flat hall minimum', (hall, cartFoodSum, canSubmit, missing) => {
    const result = evaluateBooking(base({ hall, hallGroup: 'other', type: 'preorder', cartFoodSum }));

    expect(result.canSubmit).toBe(canSubmit);
    expect(result.minimumOrder).toEqual({
      required: hall.minimumOrder,
      current: cartFoodSum,
      missing,
      satisfied: canSubmit,
    });
  });

  it('calculates banquet amount from price times adults and ignores children', () => {
    const below = evaluateBooking(base({
      hall: emerald,
      hallGroup: 'other',
      type: 'banquet',
      adults: 9,
      children: 30,
      banquetMenuPrice: 7500,
    }));
    const threshold = evaluateBooking(base({
      hall: emerald,
      hallGroup: 'other',
      type: 'banquet',
      adults: 14,
      children: 0,
      banquetMenuPrice: 5000,
    }));

    expect(below.minimumOrder).toEqual({ required: 70000, current: 67500, missing: 2500, satisfied: false });
    expect(threshold.minimumOrder).toEqual({ required: 70000, current: 70000, missing: 0, satisfied: true });
  });

  it('does not block a request when adults exceed the displayed capacity', () => {
    const result = evaluateBooking(base({
      hall: emerald,
      hallGroup: 'other',
      type: 'banquet',
      adults: 45,
      children: 0,
      banquetMenuPrice: 5000,
      eventDate: '2026-07-05',
    }));

    expect(result.canSubmit).toBe(true);
    expect(result.blocking.join(' ')).not.toMatch(/вместим|30|45/);
  });

  it('reports the required, current, and missing amounts below a hall minimum', () => {
    const result = evaluateBooking(base({
      hall: emerald,
      hallGroup: 'other',
      type: 'preorder',
      cartFoodSum: 69999,
    }));

    expect(result.blocking).toEqual([
      'Минимальная сумма заказа — 70 000 ₽. Сейчас: 69 999 ₽. Не хватает: 1 ₽.',
    ]);
  });
});
