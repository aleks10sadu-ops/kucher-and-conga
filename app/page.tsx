import HomeClient from './HomeClient';
import { getFullMenu } from '@/lib/menu/getFullMenu';

// ISR: страница (включая URL картинок блюд) пересобирается не чаще раза в 5 минут.
// Совпадает с in-memory TTL меню iiko (lib/iiko/menu.ts).
export const revalidate = 300;

export default async function Page() {
  // SSR-меню: URL изображений попадают в исходный HTML, поэтому Next отдаёт srcset,
  // а первые карточки (priority) начинают грузиться сразу, без клиентского водопада.
  // Если iiko недоступен — отдаём undefined, и клиент сам подтянет меню (fallback).
  let ssrMenuData: Record<string, { categories: any[] }> | undefined;
  try {
    const data = await getFullMenu();
    ssrMenuData = data && Object.keys(data).length > 0 ? data : undefined;
  } catch (e) {
    console.error('Home page getFullMenu failed, falling back to client fetch', e);
    ssrMenuData = undefined;
  }

  return <HomeClient ssrMenuData={ssrMenuData} />;
}
