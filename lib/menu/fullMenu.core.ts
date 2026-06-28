import type { MenuCategory, MenuItem } from '../../types/index';

export function normalizeStatic(data: { categories?: any[] } | null | undefined, idPrefix?: string): MenuCategory[] {
  const cats = data?.categories || [];
  return cats.map((c: any) => ({
    id: c.id,
    name: c.name,
    note: c.note,
    items: (c.items || []).map((it: any): MenuItem => {
      const variants =
        it.variants ??
        (it.price_750 != null || it.price_125 != null
          ? [
              ...(it.price_750 != null ? [{ name: '750 мл', price: it.price_750, weight: '750 мл' }] : []),
              ...(it.price_125 != null ? [{ name: '125 мл', price: it.price_125, weight: '125 мл' }] : []),
            ]
          : undefined);
      const description =
        typeof it.description === 'string'
          ? it.description
          : Array.isArray(it.ingredients)
            ? it.ingredients.join(', ')
            : '';
      return {
        ...it,
        id: idPrefix != null ? `${idPrefix}-${it.id}` : it.id,
        name: it.name,
        description,
        price: it.price ?? 0,
        weight: it.weight ?? null,
        image: it.image ?? it.img ?? null,
        variants,
      } as MenuItem;
    }),
  }));
}

export interface FullMenuStatics {
  bar: { categories?: any[] } | null;
  wine: { categories?: any[] } | null;
  kids: { categories?: any[] } | null;
  promotions: { categories?: any[] } | null;
}

export function assembleFullMenu(
  iikoMenu: Record<string, { categories: MenuCategory[] }>,
  statics: FullMenuStatics,
): Record<string, { categories: MenuCategory[] }> {
  const out: Record<string, { categories: MenuCategory[] }> = {};
  const add = (key: string, categories: MenuCategory[]) => {
    if (categories && categories.length) out[key] = { categories };
  };
  add('main', iikoMenu.main?.categories || []);
  add('business', iikoMenu.business?.categories || []);
  add('bar', normalizeStatic(statics.bar, 'bar'));
  add('wine', normalizeStatic(statics.wine, 'wine'));
  add('kids', normalizeStatic(statics.kids, 'kids'));
  add('promotions', normalizeStatic(statics.promotions, 'promotions'));
  return out;
}
