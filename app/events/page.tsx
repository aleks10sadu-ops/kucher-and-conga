import EventsClient from './EventsClient';
import { loadContentPostsServer } from '@/lib/content/loadContentPosts.server';

// ISR: события запекаются в HTML на сервере — у посетителей без VPN браузер
// не ходит в Supabase (замедлен в РФ), страница видна мгновенно.
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function EventsPage() {
    const posts = await loadContentPostsServer('events');
    return <EventsClient initialPosts={posts as any} />;
}
