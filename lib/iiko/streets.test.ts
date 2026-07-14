import { describe, it, expect } from 'vitest';
import { stripHouse, streetCandidates } from './streets';

describe('stripHouse', () => {
  it('отрезает «дом N» в конце', () => {
    expect(stripHouse('Промышленная, дом 20Б')).toBe('Промышленная');
    expect(stripHouse('Промышленная д. 46')).toBe('Промышленная');
  });

  it('отрезает голый номер дома в конце', () => {
    expect(stripHouse('Загорская 32')).toBe('Загорская');
    expect(stripHouse('Промышленная, 46к1')).toBe('Промышленная');
  });

  it('не трогает название без номера', () => {
    expect(stripHouse('Промышленная')).toBe('Промышленная');
    expect(stripHouse('2-я Инженерная')).toBe('2-я Инженерная');
  });
});

describe('streetCandidates', () => {
  it('одна часть — она и есть улица', () => {
    expect(streetCandidates('Промышленная')).toEqual(['Промышленная']);
  });

  it('часть с «улица» идёт первой', () => {
    expect(streetCandidates('Московская область, Дмитров, Промышленная улица, 46')[0])
      .toBe('Промышленная улица');
  });

  it('без ключевого слова перебираем все части', () => {
    expect(streetCandidates('Дмитров, Промышленная, дом 20Б'))
      .toEqual(['Дмитров', 'Промышленная']);
  });
});
