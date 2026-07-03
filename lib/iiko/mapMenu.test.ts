import { describe, it, expect } from 'vitest';
import { mapExternalMenu } from './mapMenu';
import type { IikoExternalMenu } from './types';

const raw: IikoExternalMenu = {
  itemCategories: [
    {
      id: 'cat-1',
      name: 'САЛАТЫ',
      items: [
        {
          itemId: 'i1',
          sku: '001',
          name: 'Цезарь',
          description: '  Классический  ',
          itemSizes: [
            {
              sku: '001',
              portionWeightGrams: 250,
              buttonImageUrl: 'http://img/1.png',
              prices: [{ organizationId: 'o', price: 450 }],
              nutritionPerHundredGrams: { fats: 10, proteins: 8, carbs: 5, energy: 150 },
            },
          ],
        },
        {
          itemId: 'i2',
          name: 'Скрытый',
          isHidden: true,
          itemSizes: [{ prices: [{ organizationId: 'o', price: 300 }] }],
        },
        {
          itemId: 'i3',
          name: 'Без цены',
          itemSizes: [{ prices: [{ organizationId: 'o', price: 0 }] }],
        },
      ],
    },
    {
      id: 'cat-2',
      name: 'СУПЫ',
      items: [
        {
          itemId: 'i4',
          name: 'Борщ',
          description: '',
          itemSizes: [
            {
              portionWeightGrams: 350,
              prices: [{ organizationId: 'o', price: 380 }],
              nutritionPerHundredGrams: { fats: null, proteins: null, carbs: null, energy: null },
            },
          ],
        },
      ],
    },
    { id: 'cat-empty', name: 'ПУСТО', items: [] },
  ],
};

describe('mapExternalMenu', () => {
  const result = mapExternalMenu(raw);
  const cats = result.main.categories;

  it('returns under main slug and drops empty categories', () => {
    expect(Object.keys(result)).toEqual(['main']);
    expect(cats.map((c) => c.name)).toEqual(['САЛАТЫ', 'СУПЫ']);
  });

  it('maps fields and trims description', () => {
    const cezar = cats[0].items.find((i) => i.id === 'i1')!;
    expect(cezar.name).toBe('Цезарь');
    expect(cezar.description).toBe('Классический');
    expect(cezar.price).toBe(450);
    expect(cezar.weight).toBe(250);
    expect(cezar.image).toBe('http://img/1.png');
    expect(cezar.nutrition).toEqual({
      calories: 150,
      proteins: 8,
      fats: 10,
      carbs: 5,
      per: 'per100g',
    });
  });

  it('filters hidden and zero-price items', () => {
    expect(cats[0].items.map((i) => i.id)).toEqual(['i1']);
  });

  it('returns null nutrition when all values are null', () => {
    const borsch = cats[1].items[0];
    expect(borsch.description).toBe('');
    expect(borsch.nutrition).toBeNull();
  });
});

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

import { mapExternalMenu as _mapForBread } from './mapMenu';

describe('mapModifierGroups bread split', () => {
  const rawWithBread: IikoExternalMenu = {
    itemCategories: [
      {
        id: 'bl',
        name: 'БИЗНЕС ЛАНЧ',
        items: [
          {
            itemId: 'set1',
            name: 'Сет 1',
            itemSizes: [
              {
                prices: [{ organizationId: 'o', price: 500 }],
                itemModifierGroups: [
                  {
                    name: 'Выбор хлеба и напитков',
                    restrictions: { minQuantity: 1, maxQuantity: 1 },
                    items: [
                      { itemId: 'bread1', name: 'Хлеб б/л', prices: [{ organizationId: 'o', price: 0 }] },
                      { itemId: 'tea', name: 'Чай', prices: [{ organizationId: 'o', price: 0 }] },
                      { itemId: 'coffee', name: 'Кофе', prices: [{ organizationId: 'o', price: 0 }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as any;

  it('splits bread into its own «Хлеб» group and leaves drinks separate', () => {
    const menu = _mapForBread(rawWithBread);
    const set = menu.business!.categories[0].items[0];
    const groups = set.modifierGroups!;

    const bread = groups.find((g) => g.name === 'Хлеб');
    expect(bread).toBeDefined();
    expect(bread!.min).toBe(1);
    expect(bread!.max).toBe(1);
    expect(bread!.options.map((o) => o.name)).toEqual(['С хлебом', 'Без хлеба']);
    expect(bread!.options[0].id).toBe('bread1');
    expect(bread!.options[1].id).toBe('no-bread');
    expect(bread!.options.every((o) => o.price === 0)).toBe(true);

    const drinks = groups.find((g) => g.name === 'Выбор хлеба и напитков');
    expect(drinks).toBeDefined();
    expect(drinks!.options.map((o) => o.name)).toEqual(['Чай', 'Кофе']);
  });
});
