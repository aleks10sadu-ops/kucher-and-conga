import { describe, it, expect } from 'vitest';
import {
  evaluateBooking,
  classifyHall,
  preorderMinimum,
  banquetPackagesForHall,
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

describe('timing', () => {
  it('preorder for tomorrow allowed before 16:00 МСК', () => {
    // now 13:00 МСК, event tomorrow -> cutoff today 16:00 МСК -> ok
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-29', type: 'preorder', hallGroup: 'conga', cartFoodSum: 5000 }));
    expect(allowed(v, 'preorder')).toBe(true);
  });
  it('preorder for tomorrow blocked after 16:00 МСК', () => {
    const lateNow = new Date('2026-06-28T14:00:00Z'); // 17:00 МСК
    const v = evaluateBooking(base({ now: lateNow, adults: 2, eventDate: '2026-06-29', type: 'preorder' }));
    expect(allowed(v, 'preorder')).toBe(false);
  });
  it('preorder same-day blocked', () => {
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-28', type: 'preorder' }));
    expect(allowed(v, 'preorder')).toBe(false);
  });
  it('banquet needs +2 days (tomorrow blocked)', () => {
    const v = evaluateBooking(base({ adults: 8, eventDate: '2026-06-29', type: 'banquet' }));
    expect(allowed(v, 'banquet')).toBe(false);
  });
});

describe('preorder minimum gating', () => {
  it('conga below 4000 blocks submit', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 1500 }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/2500/); // доберите ещё 2500
  });
  it('conga at/above 4000 can submit', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 4000 }));
    expect(v.canSubmit).toBe(true);
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
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 5000 }));
    expect(v.info.join(' ')).toMatch(/корзин/i);
  });
});

describe('banquet submit + no-type-available', () => {
  it('banquet allowed -> admin-contact info, can submit with hall', () => {
    const v = evaluateBooking(base({ adults: 8, type: 'banquet', hallGroup: 'kucher', eventDate: '2026-07-05' }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/предоплат/i);
  });
  it('12+ adults tomorrow -> no type available, blocked with call message', () => {
    const v = evaluateBooking(base({ adults: 14, eventDate: '2026-06-29', type: null }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/позвоните администратору/i);
  });
});
