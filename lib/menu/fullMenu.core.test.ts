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
