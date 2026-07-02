import { describe, it, expect } from 'vitest';
import { visibleModifiers } from './modifiers';

describe('visibleModifiers', () => {
  it('returns [] for undefined', () => {
    expect(visibleModifiers(undefined)).toEqual([]);
  });

  it('keeps normal modifiers', () => {
    const mods = [
      { group: 'Гарнир', option: 'Пюре' },
      { group: 'Напиток', option: 'Чай' },
    ];
    expect(visibleModifiers(mods)).toEqual(mods);
  });

  it('drops the «Без хлеба» option but keeps «С хлебом»', () => {
    expect(visibleModifiers([{ group: 'Хлеб', option: 'Без хлеба' }])).toEqual([]);
    expect(visibleModifiers([{ group: 'Хлеб', option: 'С хлебом' }])).toEqual([
      { group: 'Хлеб', option: 'С хлебом' },
    ]);
  });
});
