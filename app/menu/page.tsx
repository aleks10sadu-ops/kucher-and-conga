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
    // Афиша меню недели: свежая опубликованная из админки, иначе — статичный файл
    // из репозитория (запасной вариант, чтобы блок не пустовал; админ может перекрыть).
    const latest = weekPosts.find((p: any) => p.image_url);
    const weeklyLunch = latest
        ? { image: latest.image_url as string, title: latest.title as string }
        : { image: '/business-lunch/week-current.webp', title: 'Бизнес-ланч на неделю' };
    return <MenuClient initialMenu={menu} weeklyLunch={weeklyLunch} />;
}
