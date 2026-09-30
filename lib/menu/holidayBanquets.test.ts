import { describe, expect, it } from 'vitest';
import { HOLIDAY_BANQUETS, holidayBanquetHref, readBanquetDeepLink } from './holidayBanquets';

describe('holiday banquet catalogue and poster links', () => {
    it('offers exactly the requested prices, venues and programs', () => {
        expect(HOLIDAY_BANQUETS.map(({ category, venue, price, program }) => [category, venue, price, program])).toEqual([
            ['corporate', 'kucher', 5000, false], ['corporate', 'kucher', 6000, true],
            ['corporate', 'kucher', 7000, true], ['corporate', 'kucher', 8000, true],
            ['corporate', 'conga', 7000, true], ['corporate', 'conga', 8000, true],
            ['night', 'kucher', 8000, false], ['night', 'conga', 15000, true],
        ]);
        for (const menu of HOLIDAY_BANQUETS) {
            const url = new URL(holidayBanquetHref(menu.category, menu.venue), 'https://example.test');
            expect(url.hash).toBe('#banquet');
            expect(readBanquetDeepLink(url.search)).toEqual({ category: menu.category, venue: menu.venue });
            expect(menu.content.sections).toHaveLength(6);
        }
        expect(readBanquetDeepLink('?banquet=invalid&hall=invalid')).toEqual({ category: 'regular', venue: 'conga' });
    });

    it('shares identical menus and preserves the source choices and weights', () => {
        expect(HOLIDAY_BANQUETS[0].content).toBe(HOLIDAY_BANQUETS[1].content);
        expect(HOLIDAY_BANQUETS[2].content).toBe(HOLIDAY_BANQUETS[4].content);
        expect(HOLIDAY_BANQUETS[3].content).toBe(HOLIDAY_BANQUETS[5].content);
        expect(HOLIDAY_BANQUETS[6].content).toBe(HOLIDAY_BANQUETS[7].content);
        expect(HOLIDAY_BANQUETS[0].content.sections[2].items[2].name).toContain('Оливье с языком');
        expect(HOLIDAY_BANQUETS[2].content.sections[2].note).toBe('На выбор 3 вида');
        expect(HOLIDAY_BANQUETS[3].content.sections[2].note).toBe('На выбор 4 вида');
        expect(HOLIDAY_BANQUETS[6].content.sections.reduce((sum, section) => sum + section.grams, 0)).toBe(1670);
    });
});
