import type { IikoExternalMenu, IikoItem, IikoItemSize, IikoNutrition } from './types';
import type { MenuCategory, MenuItem, Nutrition } from '../../types/index';

function pickSize(item: IikoItem): IikoItemSize | undefined {
  const sizes = item.itemSizes || [];
  return sizes.find((s) => (s.prices || []).some((p) => (p.price ?? 0) > 0)) || sizes[0];
}

function priceOf(size: IikoItemSize | undefined): number {
  return (size?.prices || []).map((p) => p.price ?? 0).find((p) => p > 0) ?? 0;
}

function toNutrition(n?: IikoNutrition | null): Nutrition | null {
  if (!n) return null;
  const { energy, proteins, fats, carbs } = n;
  if ([energy, proteins, fats, carbs].every((v) => v == null)) return null;
  return {
    calories: energy ?? null,
    proteins: proteins ?? null,
    fats: fats ?? null,
    carbs: carbs ?? null,
    per: 'per100g',
  };
}

export function mapExternalMenu(
  raw: IikoExternalMenu,
): Record<string, { categories: MenuCategory[] }> {
  const categories: MenuCategory[] = (raw.itemCategories || [])
    .map((cat) => {
      const items: MenuItem[] = (cat.items || [])
        .filter((it) => !it.isHidden)
        .map((it) => {
          const size = pickSize(it);
          const item: MenuItem = {
            id: it.itemId,
            sku: it.sku ?? null,
            name: it.name,
            description: it.description?.trim() || '',
            price: priceOf(size),
            weight: size?.portionWeightGrams ?? null,
            image: size?.buttonImageUrl ?? null,
            nutrition: toNutrition(size?.nutritionPerHundredGrams),
            categoryId: cat.id,
          };
          return item;
        })
        .filter((it) => (it.price ?? 0) > 0);

      const category: MenuCategory = { id: cat.id, name: cat.name, items };
      return category;
    })
    .filter((c) => c.items.length > 0);

  return { main: { categories } };
}
