import HallsClient from './HallsClient';
import { loadContentPostsServer } from '@/lib/content/loadContentPosts.server';

// ISR: залы и банкеты запекаются в HTML на сервере — у посетителей без VPN
// браузер не ходит в Supabase (замедлен в РФ), страница видна мгновенно.
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function HallsPage() {
    const posts = await loadContentPostsServer('halls');
    return <HallsClient initialPosts={posts as any} />;
}
