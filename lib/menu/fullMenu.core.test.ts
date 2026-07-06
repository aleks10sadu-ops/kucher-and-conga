import { describe, it, expect } from 'vitest';
import { assembleFullMenu } from './fullMenu.core';

describe('assembleFullMenu', () => {
  const iiko = { main: { categories: [{ id: 'c', name: 'Кухня', items: [{ id: 'x', name: 'Блюдо', price: 100 }] }] }, business: { categories: [{ id: 'bl', name: 'БИЗНЕС ЛАНЧ', items: [{ id: 's', name: 'Сет', price: 580 }] }] } };

  it('includes keys with data, omits empty ones', () => {
    const full = assembleFullMenu(iiko as any);
    expect(Object.keys(full).sort()).toEqual(['business', 'main']);
    expect(full.main.categories[0].name).toBe('Кухня');
    expect(full.business.categories[0].items[0].price).toBe(580);
  });

  it('omits sections without categories', () => {
    const full = assembleFullMenu({ main: { categories: [] } } as any);
    expect(full).toEqual({});
  });
});
