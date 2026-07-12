import { getFullMenu } from '@/lib/menu/getFullMenu';
import { loadContentPostsServer } from '@/lib/content/loadContentPosts.server';
import MenuClient from './MenuClient';

// ISR: страница меню пререндерена вместе с блюдами и отдаётся с CDN мгновенно.
// Холодный запрос к iiko (~17 с) происходит только при фоновой пересборке —
// пользователь его никогда не ждёт. Принудительное обновление после правок меню
// в iiko — POST /api/iiko/revalidate (вебхук/админ) или плановый cron.
// force-static обязателен: внутренние fetch'и iiko идут с cache:'no-store',
// без него Next переводит роут в динамический рендер на каждый запрос.
export const dynamic = 'force-static';
export const revalidate = 600;

export default async function MenuPage() {
    const [menu, weekPosts] = await Promise.all([
        getFullMenu(),
        loadContentPostsServer('business_lunch_week'),
    ]);
    // Свежая опубликованная афиша меню недели (посты уже отсортированы по дате).
    const latest = weekPosts.find((p: any) => p.image_url);
    const weeklyLunch = latest ? { image: latest.image_url as string, title: latest.title as string } : null;
    return <MenuClient initialMenu={menu} weeklyLunch={weeklyLunch} />;
}
