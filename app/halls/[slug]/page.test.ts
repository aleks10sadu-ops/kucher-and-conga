import { describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react')>()),
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import * as hallPage from './page';
import { materializePublicHallPost } from '@/lib/halls/publicHallPosts';

describe('hall detail SEO', () => {
    it('creates canonical metadata from the published hall', () => {
        const createMetadata = (hallPage as Record<string, unknown>).createHallMetadata;
        expect(typeof createMetadata).toBe('function');

        const metadata = (createMetadata as Function)(
            {
                title: 'Рубиновый зал',
                excerpt: 'Отдельный зал для камерных банкетов.',
                content: '<p>Описание</p>',
                image_url: '/halls/rubin.webp',
            },
            'rubin',
        );

        expect(metadata).toEqual(
            expect.objectContaining({
                title: 'Рубиновый зал — банкетный зал · Кучер и Конга',
                description: 'Отдельный зал для камерных банкетов.',
                alternates: { canonical: '/halls/rubin' },
                openGraph: expect.objectContaining({
                    url: '/halls/rubin',
                    images: ['/halls/rubin.webp'],
                }),
            }),
        );
    });

    it.each([
        ['izumrudnyj-zal', 'Изумрудный зал', 'emerald'],
        ['rubinovyj-zal', 'Рубиновый зал', 'ruby'],
        ['shokoladnyj-zal', 'Шоколадный зал', 'chocolate'],
    ])('creates canonical metadata and a banquet booking CTA for %s', (slug, title, hallKey) => {
        const post = materializePublicHallPost(slug, null);
        expect(post).not.toBeNull();

        const metadata = hallPage.createHallMetadata(post!, slug);
        expect(metadata).toEqual(expect.objectContaining({
            title: `${title} — банкетный зал · Кучер и Конга`,
            alternates: { canonical: `/halls/${slug}` },
        }));
        expect(hallPage.hallBookingHref(post!.title, slug)).toBe(
            `/booking?source=hall&hall=${hallKey}&bookingType=banquet`,
        );
    });
});
