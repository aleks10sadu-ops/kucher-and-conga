import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchPublishedPostsMock } = vi.hoisted(() => ({
    fetchPublishedPostsMock: vi.fn(),
}));

vi.mock('@/lib/content/serverContentPosts', () => ({
    fetchPublishedPosts: fetchPublishedPostsMock,
}));

import sitemap from './sitemap';

describe('sitemap', () => {
    beforeEach(() => {
        fetchPublishedPostsMock.mockReset();
        fetchPublishedPostsMock.mockResolvedValue([]);
    });

    it('does not claim that static pages changed whenever the sitemap is generated', async () => {
        const entries = await sitemap();
        const home = entries.find((entry) => entry.url.endsWith('/'));
        const menu = entries.find((entry) => entry.url.endsWith('/menu'));

        expect(home).not.toHaveProperty('lastModified');
        expect(menu).not.toHaveProperty('lastModified');
    });

    it('always includes canonical exact halls when content storage is unavailable', async () => {
        const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

        expect(paths).toEqual(expect.arrayContaining([
            '/halls/izumrudnyj-zal',
            '/halls/rubinovyj-zal',
            '/halls/shokoladnyj-zal',
        ]));
    });

    it('publishes canonical local-search pages without redirect-only dish URLs', async () => {
        const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

        expect(paths).toEqual(expect.arrayContaining([
            '/delivery',
            '/pickup',
            '/business-lunch',
        ]));
        expect(paths).not.toContain('/delivery/shashlyk');
        expect(paths).not.toContain('/delivery/khinkali');
        expect(paths).not.toContain('/shashlyk-dmitrov');
        expect(paths).not.toContain('/khinkali-dmitrov');
    });

    it('excludes both legacy hall detail paths without duplicating canonical halls', async () => {
        fetchPublishedPostsMock.mockImplementation(async (category: string) => category === 'halls' ? [
            { slug: 'banketnye-zaly', published_at: null, created_at: '2026-08-20T00:00:00.000Z' },
            { slug: 'banketnye-zaly-rubin', published_at: null, created_at: '2026-08-20T00:00:00.000Z' },
            { slug: 'conga', published_at: null, created_at: '2026-08-20T00:00:00.000Z' },
        ] : []);

        const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
        expect(paths).not.toContain('/halls/banketnye-zaly');
        expect(paths).not.toContain('/halls/banketnye-zaly-rubin');
        expect(paths.filter((path) => path === '/halls/rubinovyj-zal')).toHaveLength(1);
        expect(paths).toContain('/halls/conga');
    });
});
