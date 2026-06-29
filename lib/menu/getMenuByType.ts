import { getFullMenu } from '@/lib/menu/getFullMenu';
import { MenuCategory } from '@/types/index';

export async function getMenuByType(menuTypeSlug: string = 'main'): Promise<MenuCategory[]> {
  try {
    const menu = await getFullMenu();
    return menu[menuTypeSlug]?.categories || menu.main?.categories || [];
  } catch (error) {
    console.error('getMenuByType (full menu) error:', error);
    return [];
  }
}
