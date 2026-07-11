import { getFullMenu } from '@/lib/menu/getFullMenu';
import MenuClient from './MenuClient';

// ISR: страница меню пререндерена вместе с блюдами и отдаётся с CDN мгновенно.
// Холодный запрос к iiko (~17 с) происходит только при фоновой пересборке —
// пользователь его никогда не ждёт. Принудительное обновление после правок меню
// в iiko — POST /api/iiko/revalidate (вебхук/админ) или плановый cron.
export const revalidate = 600;

export default async function MenuPage() {
    const menu = await getFullMenu();
    return <MenuClient initialMenu={menu} />;
}
