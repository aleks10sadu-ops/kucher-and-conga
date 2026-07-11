import VacanciesClient from './VacanciesClient';
import { loadContentPostsServer } from '@/lib/content/loadContentPosts.server';

// ISR: вакансии запекаются в HTML на сервере — у посетителей без VPN браузер
// не ходит в Supabase (замедлен в РФ), страница видна мгновенно.
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function VacanciesPage() {
    const posts = await loadContentPostsServer('vacancies');
    return <VacanciesClient initialPosts={posts as any} />;
}
