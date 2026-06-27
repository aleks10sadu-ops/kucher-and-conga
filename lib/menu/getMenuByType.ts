import { getIikoMenuByType } from '@/lib/iiko';
import { menuData } from '../../app/data/menu';
import { MenuCategory } from '@/types/index';

// iiko — единственный источник меню. Статика остаётся лишь как аварийный фолбэк,
// если iiko недоступен и кэша ещё нет.
export async function getMenuByType(menuTypeSlug: string = 'main'): Promise<MenuCategory[]> {
  try {
    const categories = await getIikoMenuByType(menuTypeSlug);
    if (categories.length > 0) return categories;
  } catch (error) {
    console.error('getMenuByType (iiko) error:', error);
  }
  return (menuData.categories || []) as MenuCategory[];
}
