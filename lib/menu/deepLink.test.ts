import { describe, expect, it } from 'vitest';
import {
    readFulfillmentPreference,
    readMenuSearch,
    resolveMenuCategoryDeepLink,
    resolveMenuDeepLink,
} from './deepLink';

const menu = {
    main: { categories: [{ id: 'soups' }] },
    business: { categories: [{ id: 'lunch-set' }] },
    kids: { categories: [{ id: 'kids-main' }] },
};

describe('menu deep links', () => {
    it.each([
        ['#main', 'main'],
        ['#delivery', 'delivery'],
        ['#business', 'business'],
        ['#bar', 'bar'],
        ['#wine', 'wine'],
        ['#kids', 'kids'],
        ['#banquet', 'banquet'],
    ])('opens %s in its matching menu section', (hash, expected) => {
        expect(resolveMenuDeepLink(hash, menu, 'main')).toBe(expected);
    });

    it('falls back when the requested section does not exist', () => {
        expect(resolveMenuDeepLink('#missing', menu, 'main')).toBe('main');
    });

    it('keeps the delivery deep link available while the live menu refreshes', () => {
        expect(resolveMenuDeepLink('#delivery', {}, 'main')).toBe('delivery');
    });

    it('reads a targeted dish search only for the delivery section', () => {
        expect(readMenuSearch('?search=%D1%88%D0%B0%D1%88%D0%BB%D1%8B%D0%BA', 'delivery')).toBe('шашлык');
        expect(readMenuSearch('?search=%D1%85%D0%B8%D0%BD%D0%BA%D0%B0%D0%BB%D0%B8', 'main')).toBe('');
    });

    it.each([
        ['?category=shashlyk', 'grill'],
        ['?category=khinkali', 'hot-meat'],
    ])('resolves a delivery category deep link by its visible name', (search, expectedId) => {
        const categories = [
            { id: 'grill', name: 'ШАШЛЫК ИЗ МЯСА И СЕТЫ' },
            { id: 'hot-meat', name: 'ГОРЯЧИЕ МЯСНЫЕ БЛЮДА' },
        ];

        expect(resolveMenuCategoryDeepLink(search, 'delivery', categories)).toBe(expectedId);
        expect(resolveMenuCategoryDeepLink(search, 'main', categories)).toBe('');
    });

    it('opens checkout in pickup mode only for an explicit pickup deep link', () => {
        expect(readFulfillmentPreference('?fulfillment=pickup')).toBe('pickup');
        expect(readFulfillmentPreference('?fulfillment=delivery')).toBe('delivery');
        expect(readFulfillmentPreference('?fulfillment=unknown')).toBe('delivery');
        expect(readFulfillmentPreference('')).toBe('delivery');
    });
});
