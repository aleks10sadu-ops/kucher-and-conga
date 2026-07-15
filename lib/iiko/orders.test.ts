import { describe, it, expect } from 'vitest';
import { buildDeliveryAddress, type CreateSiteDeliveryArgs } from './orders';

const base: CreateSiteDeliveryArgs['address'] = {
  full: 'Дмитров, Промышленная, д. 28, корп. 2, подъезд 1, этаж 5, кв. 12',
  line1: 'Дмитров, Промышленная, д. 28, корп. 2',
  city: 'Дмитров',
  street: 'Промышленная',
  streetId: 'street-guid',
  house: '28',
  building: '2',
  entrance: '1',
  floor: '5',
  flat: '12',
  doorphone: '45',
  latitude: 56.3,
  longitude: 37.5,
};

describe('buildDeliveryAddress (legacy)', () => {
  it('шлёт разбитый адрес со streetId и деталями', () => {
    const a = buildDeliveryAddress('legacy', base);
    expect(a).toMatchObject({
      type: 'legacy',
      street: { id: 'street-guid' },
      house: '28',
      building: '2',
      entrance: '1',
      floor: '5',
      flat: '12',
      doorphone: '45',
    });
    expect(a).not.toHaveProperty('line1');
  });

  it('без streetId откатывается на имя улицы + город', () => {
    const a = buildDeliveryAddress('legacy', { ...base, streetId: null });
    expect(a.street).toEqual({ name: 'Промышленная', city: 'Дмитров' });
  });

  it('пустой дом заменяет на прочерк', () => {
    const a = buildDeliveryAddress('legacy', { ...base, house: null });
    expect(a.house).toBe('-');
  });
});

describe('buildDeliveryAddress (city)', () => {
  it('шлёт весь адрес одной строкой в line1, без street/house/building', () => {
    const a = buildDeliveryAddress('city', base);
    expect(a).toMatchObject({
      type: 'city',
      line1: 'Дмитров, Промышленная, д. 28, корп. 2',
      entrance: '1',
      floor: '5',
      flat: '12',
      doorphone: '45',
    });
    expect(a).not.toHaveProperty('street');
    expect(a).not.toHaveProperty('house');
    expect(a).not.toHaveProperty('building');
  });

  it('line1 не длиннее 250 символов', () => {
    const long = 'ул. ' + 'о'.repeat(400);
    const a = buildDeliveryAddress('city', { ...base, line1: long });
    expect((a.line1 as string).length).toBe(250);
  });

  it('при пустом line1 берёт full', () => {
    const a = buildDeliveryAddress('city', { ...base, line1: '' });
    expect(a.line1).toBe(base.full);
  });

  it('не добавляет пустые детали', () => {
    const a = buildDeliveryAddress('city', {
      ...base, entrance: null, floor: null, flat: null, doorphone: null,
    });
    expect(a).toEqual({ type: 'city', line1: base.line1 });
  });
});
