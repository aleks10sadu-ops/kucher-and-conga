import type { MetadataRoute } from 'next';
import { SITE_URL } from './components/forest/site';
import { fetchPublishedPosts } from '@/lib/content/serverContentPosts';

// Пересобираем sitemap раз в час — новые вакансии/события/залы попадают без деплоя.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const page = (
        path: string,
        priority: number,
        changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
        lastModified: Date = now,
    ) => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority });

    const staticPages = [
        page('/', 1.0, 'weekly'),
        page('/menu', 0.9, 'daily'),
        page('/booking', 0.9, 'monthly'),
        page('/halls', 0.8, 'monthly'),
        page('/events', 0.7, 'weekly'),
        page('/promotions', 0.7, 'weekly'),
        page('/vacancies', 0.6, 'weekly'),
        page('/privacy', 0.2, 'yearly'),
        page('/rules', 0.2, 'yearly'),
        page('/terms', 0.2, 'yearly'),
    ];

    // Динамические страницы (слаги вакансий/событий/залов).
    const [vacancies, events, halls] = await Promise.all([
        fetchPublishedPosts('vacancies'),
        fetchPublishedPosts('events'),
        fetchPublishedPosts('halls'),
    ]);
    const dated = (path: string, p: ContentDateKey, priority: number, cf: MetadataRoute.Sitemap[number]['changeFrequency']) =>
        page(path, priority, cf, p ? new Date(p) : now);

    const dynamicPages = [
        ...vacancies.map((v) => dated(`/vacancies/${v.slug}`, v.published_at || v.created_at, 0.5, 'weekly')),
        ...events.map((e) => dated(`/events/${e.slug}`, e.published_at || e.created_at, 0.5, 'weekly')),
        ...halls.map((h) => dated(`/halls/${h.slug}`, h.published_at || h.created_at, 0.6, 'monthly')),
    ];

    return [...staticPages, ...dynamicPages];
}

type ContentDateKey = string | null;
