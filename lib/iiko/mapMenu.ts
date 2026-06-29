import type { IikoExternalMenu, IikoItem, IikoItemSize, IikoNutrition } from './types';
import type { MenuCategory, MenuItem, Nutrition, ModifierGroup, ModifierOption } from '../../types/index';

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
  return { calories: energy ?? null, proteins: proteins ?? null, fats: fats ?? null, carbs: carbs ?? null, per: 'per100g' };
}

function mapModifierGroups(size: IikoItemSize | undefined): ModifierGroup[] {
  const groups = size?.itemModifierGroups || [];
  return groups
    .map((g) => {
      const options: ModifierOption[] = (g.items || []).map((mi) => ({
        id: mi.itemId || mi.sku || mi.name,
        name: mi.name,
        price: (mi.prices || []).map((p) => p.price ?? 0).find((p) => p > 0) ?? 0,
      }));
      const group: ModifierGroup = {
        id: g.itemGroupId || g.sku || g.name,
        name: g.name,
        min: g.restrictions?.minQuantity ?? 0,
        max: g.restrictions?.maxQuantity ?? 1,
        options,
      };
      return group;
    })
    .filter((g) => g.options.length > 0);
}

function mapCategory(cat: { id: string; name: string; items?: IikoItem[] }): MenuCategory {
  const items: MenuItem[] = (cat.items || [])
    .filter((it) => !it.isHidden)
    .map((it) => {
      const size = pickSize(it);
      const groups = mapModifierGroups(size);
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
        modifierGroups: groups.length ? groups : undefined,
      };
      return item;
    })
    .filter((it) => (it.price ?? 0) > 0);
  return { id: cat.id, name: cat.name, items };
}

const BUSINESS_LUNCH_NAME = 'БИЗНЕС ЛАНЧ';

export function mapExternalMenu(
  raw: IikoExternalMenu,
): Record<string, { categories: MenuCategory[] }> {
  const all = (raw.itemCategories || []).map(mapCategory).filter((c) => c.items.length > 0);
  const isBusiness = (c: MenuCategory) => String(c.name).trim().toUpperCase() === BUSINESS_LUNCH_NAME;
  const mainCategories = all.filter((c) => !isBusiness(c));
  const businessCategories = all.filter(isBusiness);

  const result: Record<string, { categories: MenuCategory[] }> = { main: { categories: mainCategories } };
  if (businessCategories.length) result.business = { categories: businessCategories };
  return result;
}
