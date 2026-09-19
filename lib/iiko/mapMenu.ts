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

// ponytail: хлеб детектируется по имени опции /хлеб/i.
// Потолок: если iiko переименует «Хлеб б/л» — перестанет матчиться.
// Апгрейд-путь: явный список id/sku хлебных опций в конфиге.
const BREAD_RE = /хлеб/i;

function mapModifierGroups(size: IikoItemSize | undefined): ModifierGroup[] {
  const groups = size?.itemModifierGroups || [];
  const result: ModifierGroup[] = [];

  for (const g of groups) {
    const options: ModifierOption[] = (g.items || []).map((mi) => ({
      id: mi.itemId || mi.sku || mi.name,
      name: mi.name,
      price: (mi.prices || []).map((p) => p.price ?? 0).find((p) => p > 0) ?? 0,
    }));
    if (options.length === 0) continue;

    const breadOpt = options.find((o) => BREAD_RE.test(o.name));
    if (breadOpt) {
      // Отдельная категория «Хлеб»: по умолчанию с хлебом, цена 0.
      result.push({
        id: `bread-${g.itemGroupId || g.sku || g.name}`,
        name: 'Хлеб',
        min: 1,
        max: 1,
        options: [
          { id: breadOpt.id, name: 'С хлебом', price: 0 },
          { id: 'no-bread', name: 'Без хлеба', price: 0 },
        ],
      });
      const rest = options.filter((o) => o.id !== breadOpt.id);
      if (rest.length > 0) {
        result.push({
          id: g.itemGroupId || g.sku || g.name,
          name: g.name,
          min: g.restrictions?.minQuantity ?? 0,
          max: g.restrictions?.maxQuantity ?? 1,
          options: rest,
        });
      }
      continue;
    }

    result.push({
      id: g.itemGroupId || g.sku || g.name,
      name: g.name,
      min: g.restrictions?.minQuantity ?? 0,
      max: g.restrictions?.maxQuantity ?? 1,
      options,
    });
  }

  return result;
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
