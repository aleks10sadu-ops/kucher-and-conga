import type { MenuCategory } from '../../types/index';

// Бар и винная карта показываются как галерея изображений (MenuImageGallery),
// детское меню и акции удалены — из данных остались только iiko-разделы.
export function assembleFullMenu(
  iikoMenu: Record<string, { categories: MenuCategory[] }>,
): Record<string, { categories: MenuCategory[] }> {
  const out: Record<string, { categories: MenuCategory[] }> = {};
  const add = (key: string, categories: MenuCategory[]) => {
    if (categories && categories.length) out[key] = { categories };
  };
  add('main', iikoMenu.main?.categories || []);
  add('business', iikoMenu.business?.categories || []);
  return out;
}
