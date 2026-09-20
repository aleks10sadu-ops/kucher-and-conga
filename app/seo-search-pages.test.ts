import React from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import DeliveryPage, { metadata as deliveryMetadata } from './delivery/page';
import BusinessLunchPage, { metadata as businessLunchMetadata } from './business-lunch/page';

describe('local-search landing pages', () => {
    it('renders a canonical delivery page with factual order conditions', () => {
        const html = renderToStaticMarkup(React.createElement(DeliveryPage));

        expect(deliveryMetadata.alternates).toMatchObject({ canonical: '/delivery' });
        expect(html).toMatch(/<h1[^>]*>Доставка еды в Дмитрове<\/h1>/);
        expect(html).toContain('Пн–Чт: 12:00–21:45');
        expect(html).toContain('href="/menu#delivery"');
        expect(html).toContain('Хинкали в Дмитрове');
        expect(html).toContain('Шашлык в Дмитрове');
        expect(html).toContain('href="/menu?category=khinkali#delivery"');
        expect(html).toContain('href="/menu?category=shashlyk#delivery"');
        expect(html).not.toContain('href="/khinkali-dmitrov"');
        expect(html).not.toContain('href="/shashlyk-dmitrov"');
        expect(html).toContain('application/ld+json');
    });

    it('renders a canonical business-lunch page that leads to the constructor', async () => {
        const html = renderToStaticMarkup(React.createElement(BusinessLunchPage));
        const posterPath = path.join(process.cwd(), 'public', 'business-lunch', 'week-2026-09-21.webp');

        expect(businessLunchMetadata.alternates).toMatchObject({ canonical: '/business-lunch' });
        expect(businessLunchMetadata.openGraph).toMatchObject({
            images: ['/business-lunch/week-2026-09-21.webp'],
        });
        expect(existsSync(posterPath)).toBe(true);
        if (existsSync(posterPath)) {
            const poster = await sharp(posterPath).metadata();
            expect(poster).toMatchObject({ format: 'webp', width: 797, height: 1132 });
        }
        expect(html).toMatch(/<h1[^>]*>Бизнес-ланч в Дмитрове<\/h1>/);
        expect(html).toContain('по будням с 12:00 до 16:00');
        expect(html).toContain('href="/menu#business"');
    });

});
