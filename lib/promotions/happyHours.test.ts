import { describe, expect, it } from 'vitest';
import {
    isHappyHoursAt,
    isHappyHoursBookingEligible,
    isHappyHoursPickupEligible,
    moscowHappyHoursMoment,
} from './happyHours';

describe('happy hours eligibility', () => {
    it.each([
        ['2026-09-21', '12:00'],
        ['2026-09-21', '15:59'],
    ])('includes a weekday at %s %s', (date, time) => {
        expect(isHappyHoursAt(date, time)).toBe(true);
    });

    it.each([
        ['2026-09-21', '11:59'],
        ['2026-09-21', '16:00'],
        ['2026-09-21', '16:01'],
        ['2026-09-20', '14:00'],
        ['2026-11-04', '14:00'],
    ])('excludes boundaries, weekends and holidays at %s %s', (date, time) => {
        expect(isHappyHoursAt(date, time)).toBe(false);
    });

    it('uses Moscow date and time for an immediate pickup order', () => {
        expect(moscowHappyHoursMoment(new Date('2026-09-21T12:59:00.000Z'))).toEqual({
            date: '2026-09-21',
            time: '15:59',
        });
        expect(moscowHappyHoursMoment(new Date('2026-09-21T13:00:00.000Z'))).toEqual({
            date: '2026-09-21',
            time: '16:00',
        });
    });

    it('limits the booking offer to regular tables with no more than 8 adults', () => {
        expect(isHappyHoursBookingEligible('2026-09-21', '14:00', 8, 'onsite')).toBe(true);
        expect(isHappyHoursBookingEligible('2026-09-21', '14:00', 8, 'preorder')).toBe(true);
        expect(isHappyHoursBookingEligible('2026-09-21', '14:00', 9, 'onsite')).toBe(false);
        expect(isHappyHoursBookingEligible('2026-09-21', '14:00', 8, 'banquet')).toBe(false);
    });

    it('includes exactly 16:00 for pickup but not for a table booking', () => {
        expect(isHappyHoursPickupEligible('2026-09-21', '16:00')).toBe(true);
        expect(isHappyHoursPickupEligible('2026-09-21', '16:01')).toBe(false);
        expect(isHappyHoursBookingEligible('2026-09-21', '16:00', 8, 'onsite')).toBe(false);
    });
});
