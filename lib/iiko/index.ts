import { fetchExternalMenu } from './menu';
import { mapExternalMenu } from './mapMenu';
import type { MenuCategory } from '../../types/index';
import { applyBusinessLunchNames, getBusinessLunchNames } from './businessLunchNames';

export { invalidateMenuCache } from './menu';

export async function getIikoMenu(options: { requireCurrentNames?: boolean } = {}): Promise<Record<string, { categories: MenuCategory[] }>> {
  const raw = await fetchExternalMenu();
  const menu = mapExternalMenu(raw);
  if (menu.business) {
    try {
      menu.business.categories = applyBusinessLunchNames(menu.business.categories, await getBusinessLunchNames());
    } catch (error) {
      if (options.requireCurrentNames) throw error;
      console.warn('[iiko] Office names unavailable; using external menu names');
    }
  }
  return menu;
}

export async function getIikoMenuByType(slug = 'main'): Promise<MenuCategory[]> {
  const menu = await getIikoMenu();
  return menu[slug]?.categories || menu.main?.categories || [];
}
