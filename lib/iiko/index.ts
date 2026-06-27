import { fetchExternalMenu } from './menu';
import { mapExternalMenu } from './mapMenu';
import type { MenuCategory } from '../../types/index';

export { invalidateMenuCache } from './menu';

export async function getIikoMenu(): Promise<Record<string, { categories: MenuCategory[] }>> {
  const raw = await fetchExternalMenu();
  return mapExternalMenu(raw);
}

export async function getIikoMenuByType(slug = 'main'): Promise<MenuCategory[]> {
  const menu = await getIikoMenu();
  return menu[slug]?.categories || menu.main?.categories || [];
}
