import { describe, expect, it } from 'vitest';
import { NAV, NAV_TOP } from './site';

describe('public navigation', () => {
    it('links to the factual FAQ page for visitors and crawlers', () => {
        expect(NAV).toContainEqual({ href: '/faq', label: 'Вопросы и ответы' });
    });

    it('gives delivery and business lunch their own crawlable destinations', () => {
        expect(NAV).toContainEqual({ href: '/delivery', label: 'Доставка и самовывоз' });
        expect(NAV).toContainEqual({ href: '/business-lunch', label: 'Бизнес-ланч' });
        expect(NAV).toContainEqual({ href: '/menu#main', label: 'Меню' });
        expect(NAV_TOP).toContainEqual({ href: '/menu#main', label: 'Меню' });
    });
});
