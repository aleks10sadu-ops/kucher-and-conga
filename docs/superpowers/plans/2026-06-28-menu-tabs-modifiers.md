# Вкладки меню + конструктор бизнес-ланча (iiko-модификаторы) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вернуть вкладки меню (Кухня/Бизнес-ланч/Бар/Винная карта/Банкетное/Детское/Акции) на главной и `/menu`, с iiko-конструктором бизнес-ланча на модификаторах.

**Architecture:** Подход A — единый серверный модуль-слияние `lib/menu/getFullMenu.ts` собирает `Record<slug,{categories}>` из iiko (`main` без БИЗНЕС-ЛАНЧ + `business` — сеты с модификаторами) и статики (`bar/wine/kids/promotions`); `getMenuData()` возвращает это; оба экрана строят вкладки из ключей. Банкет — спец-вкладка, открывающая модалку.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript, vitest (glob `lib/**/*.test.ts`).

## Global Constraints

- Формат меню для UI: `Record<slugString, { categories: MenuCategory[] }>`; пустые ключи опускаются.
- iiko-часть: `mapExternalMenu` выносит категорию с именем `БИЗНЕС ЛАНЧ` (trim/upper) под ключ `business`; остальные — `main`. Если БИЗНЕС-ЛАНЧ нет — ключа `business` нет.
- Модификаторы маппятся обобщённо: `ModifierGroup { id, name, min, max, options: ModifierOption[] }`, `ModifierOption { id, name, price }`. Группы без опций отбрасываются. `MenuItem.modifierGroups?` ставится только если непусто.
- Статика Бар/Вино/Детское/Акции — из `app/data/*` через `normalizeStatic`; цены/состав правятся только в коде.
- Вкладки и подписи/порядок: `main`→Кухня, `business`→Бизнес-ланч, `bar`→Бар, `wine`→Винная карта, `banquet`→Банкетное меню (спец, модалка), `kids`→Детское, `promotions`→Акции. Вкладка показывается, если для slug есть категории (кроме `banquet` — всегда).
- В `lib/iiko/*` — относительные импорты (без `@/`); чистый `fullMenu.core.ts` тоже импортирует типы относительно, чтобы vitest работал без алиаса.
- Бизнес-ланч: собранный сет → корзина одной позицией с УНИКАЛЬНЫМ `id` (хэш выбранных опций), т.к. `useCart.add` заменяет позицию по `id`.

---

### Task 1: Модификаторы iiko + вынос БИЗНЕС-ЛАНЧ в `mapMenu`

**Files:**
- Modify: `lib/iiko/types.ts`
- Modify: `types/index.ts`
- Modify: `lib/iiko/mapMenu.ts`
- Modify: `lib/iiko/mapMenu.test.ts`

**Interfaces:**
- Produces:
  - `types/index.ts`: `ModifierOption { id: string; name: string; price: number }`, `ModifierGroup { id: string; name: string; min: number; max: number; options: ModifierOption[] }`, `MenuItem.modifierGroups?: ModifierGroup[]`.
  - `mapExternalMenu(raw)` теперь возвращает `{ main: {categories}, business?: {categories} }` и проставляет `modifierGroups` на items.

- [ ] **Step 1: Расширить `lib/iiko/types.ts`**

Добавить типы и поле:
```ts
export interface IikoModifierItem {
  sku?: string;
  name: string;
  itemId?: string;
  prices?: IikoPrice[];
}

export interface IikoModifierRestrictions {
  minQuantity?: number;
  maxQuantity?: number;
  byDefault?: number;
}

export interface IikoModifierGroup {
  name: string;
  description?: string;
  restrictions?: IikoModifierRestrictions;
  items?: IikoModifierItem[];
  itemGroupId?: string;
  sku?: string;
}
```
В `interface IikoItemSize` заменить `itemModifierGroups?: unknown[];` на `itemModifierGroups?: IikoModifierGroup[];`.

- [ ] **Step 2: Расширить `types/index.ts`**

Добавить рядом с `Nutrition`:
```ts
export type ModifierOption = {
    id: string;
    name: string;
    price: number;
};

export type ModifierGroup = {
    id: string;
    name: string;
    min: number;
    max: number;
    options: ModifierOption[];
};
```
В `export type MenuItem = { ... }` добавить поле:
```ts
    modifierGroups?: ModifierGroup[];
```

- [ ] **Step 3: Дополнить тест `lib/iiko/mapMenu.test.ts`**

Добавить в конец файла (НЕ трогая существующие тесты) новый блок с фикстурой, включающей категорию «БИЗНЕС ЛАНЧ» с модификаторами:
```ts
import { describe as describe2, it as it2, expect as expect2 } from 'vitest';

describe2('mapExternalMenu — business split + modifiers', () => {
  const raw = {
    itemCategories: [
      {
        id: 'cat-food',
        name: 'САЛАТЫ',
        items: [
          {
            itemId: 'f1',
            name: 'Цезарь',
            itemSizes: [{ prices: [{ organizationId: 'o', price: 450 }] }],
          },
        ],
      },
      {
        id: 'cat-bl',
        name: 'БИЗНЕС ЛАНЧ',
        items: [
          {
            itemId: 'set1',
            name: 'Сет №1',
            itemSizes: [
              {
                prices: [{ organizationId: 'o', price: 580 }],
                itemModifierGroups: [
                  {
                    name: 'Суп на сегодня',
                    itemGroupId: 'g-soup',
                    restrictions: { minQuantity: 0, maxQuantity: 1 },
                    items: [
                      { itemId: 'o1', name: 'Окрошка', prices: [{ organizationId: 'o', price: 0 }] },
                      { itemId: 'o2', name: 'Солянка', prices: [{ organizationId: 'o', price: 0 }] },
                    ],
                  },
                  { name: 'Пустая группа', itemGroupId: 'g-empty', items: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as any;

  const result = mapExternalMenu(raw);

  it2('splits БИЗНЕС ЛАНЧ into the business key, food stays in main', () => {
    expect2(result.main.categories.map((c) => c.name)).toEqual(['САЛАТЫ']);
    expect2(result.business?.categories.map((c) => c.name)).toEqual(['БИЗНЕС ЛАНЧ']);
  });

  it2('maps modifier groups, drops empty groups', () => {
    const set = result.business!.categories[0].items[0];
    expect2(set.modifierGroups?.length).toBe(1);
    const g = set.modifierGroups![0];
    expect2(g).toEqual({
      id: 'g-soup',
      name: 'Суп на сегодня',
      min: 0,
      max: 1,
      options: [
        { id: 'o1', name: 'Окрошка', price: 0 },
        { id: 'o2', name: 'Солянка', price: 0 },
      ],
    });
  });

  it2('plain food items have no modifierGroups', () => {
    expect2(result.main.categories[0].items[0].modifierGroups).toBeUndefined();
  });
});
```

- [ ] **Step 4: Запустить — убедиться, что новый блок падает**

Run: `cd /c/Users/potyl/Projects/Kongotest && npm test -- lib/iiko/mapMenu.test.ts`
Expected: новые тесты FAIL (business не выделяется, modifierGroups нет), старые — PASS.

- [ ] **Step 5: Обновить `lib/iiko/mapMenu.ts`**

Добавить импорт типов и маппер модификаторов, разделить категории. Полное новое содержимое файла:
```ts
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
```

- [ ] **Step 6: Запустить — все тесты зелёные**

Run: `npm test -- lib/iiko/mapMenu.test.ts`
Expected: PASS (старые кейсы + новый business/modifiers блок). Затем `npm test` — весь набор зелёный.

- [ ] **Step 7: Commit**

```bash
git add lib/iiko/types.ts types/index.ts lib/iiko/mapMenu.ts lib/iiko/mapMenu.test.ts
git commit -m "feat(menu): map iiko modifiers and split business-lunch into its own key"
```

---

### Task 2: Слияние `lib/menu/fullMenu.core.ts` + `getFullMenu.ts`

**Files:**
- Create: `lib/menu/fullMenu.core.ts`
- Create: `lib/menu/fullMenu.core.test.ts`
- Create: `lib/menu/getFullMenu.ts`

**Interfaces:**
- Consumes: `getIikoMenu` (из `@/lib/iiko`), статика `app/data/*`.
- Produces:
  - `normalizeStatic(data: { categories?: any[] } | null | undefined): MenuCategory[]`
  - `assembleFullMenu(iikoMenu, statics): Record<string,{categories: MenuCategory[]}>`
  - `getFullMenu(): Promise<Record<string,{categories: MenuCategory[]}>>`

- [ ] **Step 1: Написать падающий тест `lib/menu/fullMenu.core.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeStatic, assembleFullMenu } from './fullMenu.core';

describe('normalizeStatic', () => {
  it('normalizes items and builds variants from price_750/price_125', () => {
    const cats = normalizeStatic({
      categories: [
        {
          id: 'wines',
          name: 'Вина',
          items: [
            { id: 1, name: 'Просекко', type: 'белое', grape: 'Глера', price_750: 3250, price_125: 650, currency: '₽', weight: '750 мл' },
          ],
        },
      ],
    });
    const item = cats[0].items[0];
    expect(item.id).toBe(1);
    expect(item.name).toBe('Просекко');
    expect(item.variants).toEqual([
      { name: '750 мл', price: 3250, weight: '750 мл' },
      { name: '125 мл', price: 650, weight: '125 мл' },
    ]);
  });

  it('turns ingredients[] into a description string', () => {
    const cats = normalizeStatic({
      categories: [{ id: 'promo', name: 'Акции', items: [{ id: 2, name: 'Коктейль', ingredients: ['джин', 'тоник'], price: 360 }] }],
    });
    expect(cats[0].items[0].description).toBe('джин, тоник');
  });

  it('handles missing categories', () => {
    expect(normalizeStatic(null)).toEqual([]);
    expect(normalizeStatic({})).toEqual([]);
  });
});

describe('assembleFullMenu', () => {
  const iiko = { main: { categories: [{ id: 'c', name: 'Кухня', items: [{ id: 'x', name: 'Блюдо', price: 100 }] }] }, business: { categories: [{ id: 'bl', name: 'БИЗНЕС ЛАНЧ', items: [{ id: 's', name: 'Сет', price: 580 }] }] } };
  const statics = {
    bar: { categories: [{ id: 'tea', name: 'Чай', items: [{ id: 1, name: 'Чайник', price: 290 }] }] },
    wine: { categories: [{ id: 'w', name: 'Вина', items: [{ id: 1, name: 'Просекко', price: 3250 }] }] },
    kids: { categories: [] },
    promotions: null,
  };

  it('includes keys with data, omits empty ones', () => {
    const full = assembleFullMenu(iiko as any, statics as any);
    expect(Object.keys(full).sort()).toEqual(['bar', 'business', 'main', 'wine']);
    expect(full.kids).toBeUndefined();
    expect(full.promotions).toBeUndefined();
    expect(full.main.categories[0].name).toBe('Кухня');
    expect(full.business.categories[0].items[0].price).toBe(580);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- lib/menu/fullMenu.core.test.ts`
Expected: FAIL — модуль `./fullMenu.core` не найден.

- [ ] **Step 3: Создать `lib/menu/fullMenu.core.ts`**

```ts
import type { MenuCategory, MenuItem } from '../../types/index';

export function normalizeStatic(data: { categories?: any[] } | null | undefined): MenuCategory[] {
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
        id: it.id,
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
  add('bar', normalizeStatic(statics.bar));
  add('wine', normalizeStatic(statics.wine));
  add('kids', normalizeStatic(statics.kids));
  add('promotions', normalizeStatic(statics.promotions));
  return out;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- lib/menu/fullMenu.core.test.ts`
Expected: PASS.

- [ ] **Step 5: Создать обёртку `lib/menu/getFullMenu.ts`** (не тестируется — сеть+статика с алиасом)

```ts
import { getIikoMenu } from '@/lib/iiko';
import { barMenuData } from '@/app/data/barMenuData';
import { wineMenuData } from '@/app/data/wineMenuData';
import { kidsMenuData } from '@/app/data/kidsMenuData';
import { promotionsData } from '@/app/data/promotionsData';
import { assembleFullMenu } from './fullMenu.core';
import type { MenuCategory } from '@/types/index';

export async function getFullMenu(): Promise<Record<string, { categories: MenuCategory[] }>> {
  let iiko: Record<string, { categories: MenuCategory[] }> = {};
  try {
    iiko = await getIikoMenu();
  } catch (e) {
    console.error('getFullMenu: iiko fetch failed, serving static-only menu', e);
  }
  return assembleFullMenu(iiko, {
    bar: barMenuData as any,
    wine: wineMenuData as any,
    kids: kidsMenuData as any,
    promotions: promotionsData as any,
  });
}
```

- [ ] **Step 6: Проверка типов и тестов**

Run: `npx tsc --noEmit && npm test`
Expected: 0 ошибок типов; все тесты зелёные.

- [ ] **Step 7: Commit**

```bash
git add lib/menu/fullMenu.core.ts lib/menu/fullMenu.core.test.ts lib/menu/getFullMenu.ts
git commit -m "feat(menu): merge iiko + static data into tabbed full menu"
```

---

### Task 3: Переключить `getMenuData`/`getMenuByType` на `getFullMenu`

**Files:**
- Modify: `app/actions/getMenu.ts`
- Modify: `lib/menu/getMenuByType.ts`

**Interfaces:**
- Consumes: `getFullMenu` (Task 2).
- Produces: `getMenuData()` возвращает полный набор ключей (`main/business/bar/wine/kids/promotions`).

- [ ] **Step 1: Переписать `app/actions/getMenu.ts`**

Полное содержимое:
```ts
'use server';

import { getFullMenu } from '@/lib/menu/getFullMenu';

export async function getMenuData() {
  try {
    return await getFullMenu();
  } catch (error) {
    console.error('Server Action getMenuData (full menu) error:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Переписать `lib/menu/getMenuByType.ts`**

Полное содержимое:
```ts
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
```

- [ ] **Step 3: Проверка типов и тестов**

Run: `npx tsc --noEmit && npm test`
Expected: 0 ошибок; тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add app/actions/getMenu.ts lib/menu/getMenuByType.ts
git commit -m "feat(menu): serve full tabbed menu from getMenuData/getMenuByType"
```

---

### Task 4: Конструктор бизнес-ланча `BusinessLunchConstructor.tsx`

**Files:**
- Create: `app/components/BusinessLunchConstructor.tsx`

**Interfaces:**
- Consumes: `MenuItem`/`ModifierGroup`/`CartItem` из `@/types/index`.
- Produces: компонент `BusinessLunchConstructor` с пропсами `{ sets: MenuItem[]; onAddToCart: (item: CartItem) => void }`.

- [ ] **Step 1: Создать `app/components/BusinessLunchConstructor.tsx`**

```tsx
'use client';

import React, { useMemo, useState } from 'react';
import type { MenuItem, CartItem, ModifierGroup } from '@/types/index';

type Props = {
  sets: MenuItem[];
  onAddToCart: (item: CartItem) => void;
};

export default function BusinessLunchConstructor({ sets, onAddToCart }: Props) {
  const [selectedSetId, setSelectedSetId] = useState<string | number | null>(sets[0]?.id ?? null);
  // выбранные опции: { [groupId]: optionId }
  const [choices, setChoices] = useState<Record<string, string>>({});

  const selectedSet = useMemo(
    () => sets.find((s) => String(s.id) === String(selectedSetId)) || null,
    [sets, selectedSetId],
  );
  const groups: ModifierGroup[] = selectedSet?.modifierGroups || [];

  const requiredOk = groups.every((g) => g.min < 1 || choices[g.id]);

  const selectSet = (id: string | number) => {
    setSelectedSetId(id);
    setChoices({}); // сброс выбора при смене сета
  };

  const choose = (groupId: string, optionId: string) => {
    setChoices((c) => ({ ...c, [groupId]: optionId }));
  };

  const handleAdd = () => {
    if (!selectedSet || !requiredOk) return;
    const chosen = groups
      .map((g) => {
        const optId = choices[g.id];
        const opt = g.options.find((o) => o.id === optId);
        return opt ? { group: g.name, option: opt.name } : null;
      })
      .filter(Boolean) as { group: string; option: string }[];

    const hash = chosen.map((c) => c.option).join('|');
    const composition = chosen.map((c) => `${c.group}: ${c.option}`).join('; ');

    onAddToCart({
      id: `bl-${selectedSet.id}-${hash}`,
      name: selectedSet.name,
      price: selectedSet.price || 0,
      qty: 1,
      weight: 'Бизнес-ланч',
      description: composition,
      isBusinessLunch: true,
      modifiers: chosen,
    });
  };

  if (!sets.length) {
    return <div className="text-neutral-400 text-center py-8">Бизнес-ланч сейчас недоступен.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Выбор сета */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sets.map((s) => {
          const active = String(s.id) === String(selectedSetId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSet(s.id)}
              className={`text-left rounded-2xl border px-4 py-3 transition ${
                active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="font-semibold">{s.name}</div>
              <div className="text-amber-400 font-bold mt-1">{(s.price || 0).toLocaleString('ru-RU')} ₽</div>
              {s.description && <div className="text-xs text-neutral-400 mt-1">{s.description}</div>}
            </button>
          );
        })}
      </div>

      {/* Группы модификаторов выбранного сета */}
      {selectedSet && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="font-semibold mb-2">
                {g.name}
                {g.min >= 1 && <span className="text-amber-400"> *</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.options.map((o) => {
                  const active = choices[g.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => choose(g.id, o.id)}
                      className={`text-left rounded-xl border px-3 py-2 text-sm transition ${
                        active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {o.name}
                      {o.price > 0 && <span className="text-neutral-400"> +{o.price} ₽</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Добавить */}
      {selectedSet && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-sm text-neutral-400">
            {requiredOk ? 'Готово к добавлению' : 'Выберите обязательные позиции (*)'}
          </div>
          <button
            type="button"
            disabled={!requiredOk}
            onClick={handleAdd}
            className="px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Добавить — {(selectedSet.price || 0).toLocaleString('ru-RU')} ₽
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в этом файле.

- [ ] **Step 3: Commit**

```bash
git add app/components/BusinessLunchConstructor.tsx
git commit -m "feat(menu): iiko-driven business lunch constructor"
```

---

### Task 5: Вкладки на главной (`EnhancedMenuSection.tsx`)

**Files:**
- Modify: `app/components/EnhancedMenuSection.tsx`

**Interfaces:**
- Consumes: загруженные `clientMenuData`/`ssrMenuDataByType` (теперь с ключами `main/business/bar/wine/kids/promotions`); `BusinessLunchConstructor` (Task 4).

- [ ] **Step 1: Импортировать новый конструктор**

В начало файла добавить:
```ts
import BusinessLunchConstructor from './BusinessLunchConstructor';
```

- [ ] **Step 2: Заменить вывод `availableMenuTypes`**

Найти блок «Derive available menu types from the iiko data keys only …» (около строк 172–183) и заменить на:
```ts
const MENU_TYPE_DEFS: { id: string; name: string }[] = [
    { id: 'main', name: 'Кухня' },
    { id: 'business', name: 'Бизнес-ланч' },
    { id: 'bar', name: 'Бар' },
    { id: 'wine', name: 'Винная карта' },
    { id: 'banquet', name: 'Банкетное меню' },
    { id: 'kids', name: 'Детское' },
    { id: 'promotions', name: 'Акции' },
];
const loadedMenuData: Record<string, { categories: MenuCategory[] }> =
    (ssrMenuDataByType && Object.keys(ssrMenuDataByType).length > 0)
        ? ssrMenuDataByType
        : (clientMenuData || {});
const availableMenuTypes: MenuTypeInfo[] = MENU_TYPE_DEFS
    .filter((d) => d.id === 'banquet' || (loadedMenuData[d.id]?.categories?.length ?? 0) > 0)
    .map((d) => ({ id: d.id, name: d.name, isDeliveryAvailable: true }));
```

- [ ] **Step 3: Рендерить конструктор бизнес-ланча**

Найти ветку `{selectedMenuType === 'business' ? ( <BusinessLunchBuilder ... /> ) : ( ...grid... )}` (около строк 609–614) и заменить рендер `BusinessLunchBuilder` на:
```tsx
{selectedMenuType === 'business' ? (
    <BusinessLunchConstructor
        sets={(loadedMenuData.business?.categories || []).flatMap((c) => c.items)}
        onAddToCart={onAddToCart}
    />
) : (
```
(остальную часть тернарника — грид — оставить как есть).

- [ ] **Step 4: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок. (Старый импорт `BusinessLunchBuilder` может остаться неиспользуемым — это не ошибка типов; удалять не обязательно, но можно убрать импорт, если линт ругается.)

- [ ] **Step 5: Ручная проверка (dev)**

Run: `npm run dev`, открыть главную. Expected: видны вкладки Кухня/Бизнес-ланч/Бар/Винная карта/Банкетное/Детское/Акции (те, где есть данные); переключение работает; «Бизнес-ланч» — конструктор (выбор сета → опции → Добавить кладёт в корзину); «Банкетное» открывает модалку. (Если iiko локально недоступен — Кухня/Бизнес-ланч могут быть пустыми; статичные вкладки работают всегда.)

- [ ] **Step 6: Commit**

```bash
git add app/components/EnhancedMenuSection.tsx
git commit -m "feat(menu): restore menu-type tabs and wire business-lunch constructor on home"
```

---

### Task 6: Вкладки на витрине `/menu`

**Files:**
- Modify: `app/menu/page.tsx`

**Interfaces:**
- Consumes: `getMenuData()` (полный набор ключей, Task 3); `BanquetMenuModal`.

- [ ] **Step 1: Хранить полный набор меню и тип**

Прочитать `app/menu/page.tsx`. В `MenuContent`:
- заменить загрузку (строки ~39–53), чтобы хранить весь объект и выбранный тип:
```tsx
const [menuByType, setMenuByType] = useState<Record<string, { categories: any[] }>>({});
const [activeType, setActiveType] = useState<string>('main');
const [isBanquetOpen, setIsBanquetOpen] = useState(false);
const [loading, setLoading] = useState(true);

useEffect(() => {
    let active = true;
    getMenuData()
        .then((data: any) => {
            if (!active) return;
            setMenuByType(data || {});
            const firstKey = ['main', 'business', 'bar', 'wine', 'kids', 'promotions'].find((k) => data?.[k]?.categories?.length) || 'main';
            setActiveType(firstKey);
            const cats = data?.[firstKey]?.categories || [];
            if (cats.length > 0) setActiveCategory(cats[0].id);
        })
        .catch((e) => console.error('menu load error', e))
        .finally(() => active && setLoading(false));
    return () => { active = false; };
}, []);

const TYPE_DEFS: { id: string; name: string }[] = [
    { id: 'main', name: 'Кухня' },
    { id: 'business', name: 'Бизнес-ланч' },
    { id: 'bar', name: 'Бар' },
    { id: 'wine', name: 'Винная карта' },
    { id: 'banquet', name: 'Банкетное меню' },
    { id: 'kids', name: 'Детское' },
    { id: 'promotions', name: 'Акции' },
];
const availableTypes = TYPE_DEFS.filter((t) => t.id === 'banquet' || (menuByType[t.id]?.categories?.length ?? 0) > 0);
const categories = menuByType[activeType]?.categories || [];

const selectType = (id: string) => {
    if (id === 'banquet') { setIsBanquetOpen(true); return; }
    setActiveType(id);
    const cats = menuByType[id]?.categories || [];
    setActiveCategory(cats[0]?.id || '');
};
```
- Добавить импорт: `import BanquetMenuModal from '../components/BanquetMenuModal';`

- [ ] **Step 2: Добавить таб-бар типов меню**

В фиксированную шапку (около строки 81–82, выше навигации по категориям) вставить ряд кнопок типов:
```tsx
{availableTypes.length > 1 && (
    <div className="flex flex-wrap justify-center gap-2 mb-3">
        {availableTypes.map((t) => (
            <button
                key={t.id}
                onClick={() => selectType(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeType === t.id && t.id !== 'banquet'
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10'
                }`}
            >
                {t.name}
            </button>
        ))}
    </div>
)}
```

- [ ] **Step 3: Read-only бизнес-ланч и модалка банкета**

В основном контенте: если `activeType === 'business'`, для каждой категории/сета показать состав групп read-only. Перед грид-рендером категорий добавить ветку:
```tsx
{activeType === 'business' ? (
    <div className="max-w-3xl mx-auto space-y-8">
        {categories.flatMap((c: any) => c.items).map((set: any) => (
            <div key={set.id} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-bold">{set.name}</h3>
                    <span className="text-amber-400 font-bold whitespace-nowrap">{(set.price || 0).toLocaleString('ru-RU')} ₽</span>
                </div>
                {set.description && <p className="text-neutral-400 text-sm mt-1">{set.description}</p>}
                {(set.modifierGroups || []).map((g: any) => (
                    <div key={g.id} className="mt-3">
                        <div className="text-sm font-semibold text-neutral-300">{g.name}</div>
                        <div className="text-sm text-neutral-400">{g.options.map((o: any) => o.name).join(', ')}</div>
                    </div>
                ))}
            </div>
        ))}
    </div>
) : (
    /* существующий рендер категорий карточками — обернуть в этот else */
)}
```
Обернуть текущий блок рендера категорий (`categories.map(... cards ...)`) в `else`-ветку этого тернарника. В самом конце компонента (перед закрытием) добавить модалку:
```tsx
<BanquetMenuModal isOpen={isBanquetOpen} onClose={() => setIsBanquetOpen(false)} />
```

- [ ] **Step 4: Проверка типов и сборка**

Run: `npx tsc --noEmit && npm test`
Expected: 0 ошибок; тесты зелёные.

- [ ] **Step 5: Ручная проверка (dev)**

Run: `npm run dev`, открыть `/menu`. Expected: таб-бар типов; переключение между Кухня/Бар/Вино/Детское/Акции показывает соответствующие карточки; «Бизнес-ланч» — read-only состав сетов; «Банкетное» открывает модалку.

- [ ] **Step 6: Commit**

```bash
git add app/menu/page.tsx
git commit -m "feat(menu): menu-type tabs on /menu showcase"
```

---

## Self-Review

**Spec coverage:**
- Модификаторы iiko → данные (типы + mapMenu) → Task 1. ✓
- Вынос БИЗНЕС-ЛАНЧ в ключ `business` → Task 1. ✓
- Слияние iiko + статика (`getFullMenu`/`normalizeStatic`) → Task 2. ✓
- `getMenuData`/`getMenuByType` на полный набор → Task 3. ✓
- Конструктор бизнес-ланча на модификаторах → Task 4 (+ рендер в Task 5). ✓
- Вкладки на главной + банкет-модалка → Task 5. ✓
- Вкладки на /menu + read-only бизнес-ланч + банкет-модалка → Task 6. ✓
- Статика Бар/Вино/Детское/Акции через normalizeStatic → Task 2/3. ✓
- Тесты mapMenu + getFullMenu → Task 1, Task 2. ✓
- Вне scope (редактор статики, конструктор на /menu, бар/вино в iiko, модификаторы у обычных блюд) — не входят намеренно. ✓

**Placeholder scan:** код приведён полностью в Tasks 1–4; Tasks 5–6 — точечные правки больших файлов по якорям с готовым кодом вставок (не плейсхолдеры).

**Type consistency:** `ModifierGroup`/`ModifierOption`/`MenuItem.modifierGroups`/`mapExternalMenu`/`normalizeStatic`/`assembleFullMenu`/`getFullMenu`/`BusinessLunchConstructor` — имена согласованы между задачами и блоками Interfaces. ✓

**Риски:** (1) Task 5/6 — правки больших файлов (`EnhancedMenuSection` ~750 стр., `/menu` ~260 стр.) по якорям; реализатор читает секции и при несовпадении сообщает DONE_WITH_CONCERNS. (2) Локально iiko может быть недоступен → Кухня/Бизнес-ланч пустые; статичные вкладки и логика всё равно проверяемы; полная проверка iiko-вкладок — на Vercel preview. (3) `useCart.add` заменяет позицию по `id` — поэтому id бизнес-ланча включает хэш выбранных опций (разные сборки = разные позиции).
