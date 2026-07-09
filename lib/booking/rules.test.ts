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

describe('timing is advisory, not a hard block', () => {
  it('preorder stays available even same-day; late timing only adds an admin-confirm note', () => {
    // day-в-день: тип доступен, форма не тупик — добавляется мягкая подсказка про срок.
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-28', type: 'preorder', hallGroup: 'conga', cartFoodSum: 20000 }));
    expect(allowed(v, 'preorder')).toBe(true);
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/16:00|срок/i);
  });
  it('preorder for tomorrow before 16:00 has no timing note', () => {
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-29', type: 'preorder', hallGroup: 'conga', cartFoodSum: 20000 }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).not.toMatch(/подтвердит срок/i);
  });
  it('banquet stays available for a too-soon date; adds an admin-confirm note', () => {
    const v = evaluateBooking(base({ adults: 8, eventDate: '2026-06-29', type: 'banquet', hallGroup: 'kucher' }));
    expect(allowed(v, 'banquet')).toBe(true);
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/заранее|согласует/i);
  });
});

describe('preorder minimum gating (per adult)', () => {
  it('conga: minimum is 4000 ₽ PER ADULT (2 adults -> 8000)', () => {
    // 4000 in cart with 2 adults must be blocked: required = 4000*2 = 8000
    const v = evaluateBooking(base({ adults: 2, type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 4000 }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/8000/); // требуется 8000
    expect(v.blocking.join(' ')).toMatch(/4000/); // доберите ещё 4000
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
  it('12+ adults tomorrow -> banquet stays available and submittable (admin confirms date)', () => {
    const v = evaluateBooking(base({ adults: 14, eventDate: '2026-06-29', type: 'banquet', hallGroup: 'kucher' }));
    expect(allowed(v, 'banquet')).toBe(true);
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/заранее|согласует/i);
  });
});
