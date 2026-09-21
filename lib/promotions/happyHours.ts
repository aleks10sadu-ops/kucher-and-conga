import type { BookingType } from '@/lib/booking/rules';

const HAPPY_HOURS_START_MINUTES = 12 * 60;
const HAPPY_HOURS_END_MINUTES = 16 * 60;

const FIXED_PUBLIC_HOLIDAYS = new Set([
    '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08',
    '02-23', '03-08', '05-01', '05-09', '06-12', '11-04',
]);

// Дополнительные будние дни отдыха по производственному календарю РФ на 2026 год.
// При публикации календаря на следующий год список нужно дополнить.
const EXTRA_NON_WORKING_DATES = new Set([
    '2026-01-09',
    '2026-03-09',
    '2026-05-11',
    '2026-12-31',
]);

function validCalendarDate(date: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;
    const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    return value.toISOString().slice(0, 10) === date ? value : null;
}

function timeMinutes(time: string): number | null {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function isHappyHoursDate(date: string): boolean {
    const calendarDate = validCalendarDate(date);
    if (!calendarDate) return false;

    const weekday = calendarDate.getUTCDay();
    const isWeekday = weekday >= 1 && weekday <= 5;
    const isPublicHoliday = FIXED_PUBLIC_HOLIDAYS.has(date.slice(5)) || EXTRA_NON_WORKING_DATES.has(date);

    return isWeekday && !isPublicHoliday;
}

export function isHappyHoursAt(date: string, time: string): boolean {
    const minutes = timeMinutes(time);
    return minutes !== null
        && isHappyHoursDate(date)
        && minutes >= HAPPY_HOURS_START_MINUTES
        && minutes < HAPPY_HOURS_END_MINUTES;
}

export function isHappyHoursPickupEligible(date: string, time: string): boolean {
    const minutes = timeMinutes(time);
    return minutes !== null
        && isHappyHoursDate(date)
        && minutes >= HAPPY_HOURS_START_MINUTES
        && minutes <= HAPPY_HOURS_END_MINUTES;
}

export function isHappyHoursBookingEligible(
    date: string,
    time: string,
    adults: number,
    bookingType: BookingType,
): boolean {
    return adults >= 1
        && adults <= 8
        && bookingType !== 'banquet'
        && isHappyHoursAt(date, time);
}

export function moscowHappyHoursMoment(now: Date = new Date()): { date: string; time: string } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
    return {
        date: `${part('year')}-${part('month')}-${part('day')}`,
        time: `${part('hour')}:${part('minute')}`,
    };
}
