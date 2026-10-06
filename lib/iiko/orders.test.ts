import { describe, it, expect } from 'vitest';
import {
  buildDeliveryAddress,
  buildIikoOrder,
  type CreateSiteOrderArgs,
  type SiteOrderAddress,
} from './orders';

const base: SiteOrderAddress = {
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

const baseOrder: Omit<CreateSiteOrderArgs, 'fulfillmentType' | 'address'> = {
  phone: '+79161112233',
  customerName: 'Анна',
  comment: 'ЗАКАЗ С САЙТА',
  completeBefore: '2026-07-17 19:30:00.000',
  items: [{ productId: 'dish-guid', amount: 1, modifiers: [] }],
};

describe('buildIikoOrder', () => {
  it('uses the durable site request ID for terminal and notification deduplication', () => {
    expect(buildIikoOrder({ ...baseOrder, fulfillmentType:'pickup', orderId:'10236bd8-014b-4020-97e8-92a0b5b507e9' }, 'legacy')).toHaveProperty('id','10236bd8-014b-4020-97e8-92a0b5b507e9');
  });
  it('keeps the courier service and delivery point for delivery', () => {
    const order = buildIikoOrder({ ...baseOrder, fulfillmentType: 'delivery', address: base }, 'legacy');
    expect(order).toMatchObject({
      orderServiceType: 'DeliveryByCourier',
      completeBefore: '2026-07-17 19:30:00.000',
      deliveryPoint: { address: { type: 'legacy' } },
    });
  });

  it('uses DeliveryByClient and omits deliveryPoint for pickup', () => {
    const order = buildIikoOrder({ ...baseOrder, fulfillmentType: 'pickup' }, 'legacy');
    expect(order).toMatchObject({ orderServiceType: 'DeliveryByClient' });
    expect(order).not.toHaveProperty('deliveryPoint');
  });
});

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
