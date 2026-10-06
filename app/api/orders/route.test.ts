import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSiteDelivery: vi.fn(),
  createSiteOrder: vi.fn(),
  resolveStreetFromAddress: vi.fn(),
  stripHouse: vi.fn(),
  getStopListProductIds: vi.fn(),
  checkDeliveryZoneForCoords: vi.fn(),
  findZoneByName: vi.fn(),
  logOrderAttempt: vi.fn(),
  getIikoMenu: vi.fn(),
  reserve: vi.fn(),
  notificationDb: vi.fn(),
}));

vi.mock('@/lib/iiko/orders', () => ({
  createSiteDelivery: mocks.createSiteDelivery,
  createSiteOrder: mocks.createSiteOrder,
}));
vi.mock('@/lib/iiko/streets', () => ({
  resolveStreetFromAddress: mocks.resolveStreetFromAddress,
  stripHouse: mocks.stripHouse,
}));
vi.mock('@/lib/iiko/stopList', () => ({ getStopListProductIds: mocks.getStopListProductIds }));
vi.mock('@/app/data/deliveryZones', () => ({
  checkDeliveryZoneForCoords: mocks.checkDeliveryZoneForCoords,
  findZoneByName: mocks.findZoneByName,
}));
vi.mock('@/lib/delivery/orderLog', () => ({ logOrderAttempt: mocks.logOrderAttempt }));
vi.mock('@/lib/iiko', () => ({ getIikoMenu: mocks.getIikoMenu }));
vi.mock('@/lib/delivery/orderNotifications.mjs', async (original) => ({
  ...await original<typeof import('@/lib/delivery/orderNotifications.mjs')>(),
  createOrderNotifications: () => ({reserve:mocks.reserve,db:mocks.notificationDb}),
}));

import { POST } from './route';

const makeReq = (body: unknown) => new Request('http://localhost/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...(body as object), requestId: '10236bd8-014b-4020-97e8-92a0b5b507e9' }),
});

describe('POST /api/orders fulfillment boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T15:00:00Z'));
    vi.clearAllMocks();
    mocks.createSiteOrder.mockResolvedValue({ orderId: '10236bd8-014b-4020-97e8-92a0b5b507e9', creationStatus: 'Success' });
    mocks.reserve.mockResolvedValue({created:true,row:{}});
    mocks.notificationDb.mockResolvedValue([]);
    mocks.getStopListProductIds.mockResolvedValue(new Set());
    mocks.logOrderAttempt.mockResolvedValue(undefined);
    mocks.getIikoMenu.mockResolvedValue({
      main: {
        categories: [{
          id: 'main',
          name: 'Основное меню',
          items: [{
            id: 'main-guid',
            name: 'Блюдо',
            price: 900,
            modifierGroups: [{
              id: 'sauce-group',
              name: 'Соус',
              min: 0,
              max: 1,
              options: [{ id: 'sauce-guid', name: 'Соус', price: 100 }],
            }],
          }, {
            id: 'ordinary-guid',
            name: 'Обычное недорогое блюдо',
            price: 400,
          }],
        }],
      },
      business: {
        categories: [{
          id: 'business',
          name: 'БИЗНЕС ЛАНЧ',
          items: [{ id: 'dish-guid', name: 'Бизнес-ланч', price: 400 }],
        }],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const durablePickup = () => makeReq({fulfillmentType:'pickup',name:'Анна',phone:'8 916 111-22-33',address:'',items:[{id:'ordinary-guid',productId:'ordinary-guid',name:'Блюдо',qty:3,price:400}],deliveryTime:'custom',deliveryTimeCustom:'2026-07-13T15:30:00'});
  it('queues the full validated order before terminal failure and still accepts the request', async () => {
    mocks.createSiteOrder.mockRejectedValue(new Error('terminal offline'));
    const result=await POST(durablePickup() as never);
    expect(result.status).toBe(200);
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.createSiteOrder.mock.invocationCallOrder[0]);
    expect(mocks.reserve).toHaveBeenCalledWith('10236bd8-014b-4020-97e8-92a0b5b507e9',expect.stringContaining('1200 ₽'));
    expect(mocks.notificationDb).toHaveBeenCalledWith(expect.stringContaining('last_status=eq.CreationPending'),'PATCH',{last_status:'CreationError'});
  });
  it('does not create another terminal order for a claimed retry', async () => {
    mocks.reserve.mockResolvedValue({created:false,row:{tg_message_id:700}});
    expect((await POST(durablePickup() as never)).status).toBe(200);
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });
  it('does not accept or create an order if durable storage is unavailable', async () => {
    mocks.reserve.mockRejectedValue(new Error('storage offline'));
    expect((await POST(durablePickup() as never)).status).toBe(502);
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('creates scheduled pickup from server totals without courier address or zone work', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '8 916 111-22-33',
      address: '',
      coordinates: [56.34, 37.52],
      zoneName: 'Зона 600₽',
      items: [{
        id: 'bl-1',
        name: 'Бизнес-ланч',
        qty: 2,
        price: 400,
        productId: 'dish-guid',
        isBusinessLunch: true,
      }],
      subtotal: 1,
      deliveryPrice: 600,
      total: 99999,
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, orderId: '10236bd8-014b-4020-97e8-92a0b5b507e9', creationStatus:'Success' });
    expect(mocks.createSiteOrder).toHaveBeenCalledWith(expect.objectContaining({
      fulfillmentType: 'pickup',
      phone: '+79161112233',
      completeBefore: '2026-07-13 15:30:00.000',
      comment: expect.stringContaining('Итого: 800 ₽'),
    }));
    expect(mocks.createSiteOrder.mock.calls[0][0].comment).not.toContain('99999');
    expect(mocks.createSiteOrder.mock.calls[0][0].comment).toContain('Способ получения: Самовывоз');
    expect(mocks.createSiteOrder.mock.calls[0][0].comment).toContain('Время самовывоза: 13.07.2026 в 15:30');
    expect(mocks.createSiteOrder.mock.calls[0][0].comment).not.toContain('2026-07-13T15:30:00');
    expect(mocks.createSiteOrder.mock.calls[0][0]).not.toHaveProperty('address');
    expect(mocks.checkDeliveryZoneForCoords).not.toHaveBeenCalled();
    expect(mocks.findZoneByName).not.toHaveBeenCalled();
    expect(mocks.resolveStreetFromAddress).not.toHaveBeenCalled();
    expect(mocks.logOrderAttempt).toHaveBeenLastCalledWith(expect.objectContaining({
      outcome: 'iiko_ok',
      address: 'Самовывоз: Дмитров, Промышленная улица, 20Б',
      subtotal: 800,
      total: 800,
    }));
  });

  it('rejects a delivery when the server cannot resolve its zone', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'delivery',
      name: 'Ксения',
      phone: '+79253207589',
      address: 'Дмитров, Новосиньковское, д. 41',
      items: [{
        id: 'ordinary-guid',
        name: 'Обычное недорогое блюдо',
        qty: 3,
        price: 400,
        productId: 'ordinary-guid',
      }],
      subtotal: 1200,
      deliveryPrice: 400,
      total: 1600,
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'delivery_zone_unknown',
    });
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('returns HTTP 400 for an unknown fulfillment type before external calls', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'table',
      name: 'Анна',
      phone: '+79161112233',
      address: 'Дмитров, Промышленная улица, 20Б',
      items: [{ id: 'dish', name: 'Блюдо', qty: 1, price: 1000, productId: 'dish-guid' }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'invalid_fulfillment_type',
    });
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('rejects a scheduled value off the 15-minute grid before iiko side effects', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{ id: 'dish', name: 'Бизнес-ланч', qty: 2, price: 400, productId: 'dish-guid' }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T12:07:59',
    }) as never);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: 'order_time_invalid' });
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('uses authoritative base and modifier prices for minimum, iiko, and logs', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{
        id: 'main-guid__sauce-guid',
        name: 'Блюдо',
        qty: 1,
        price: 1000,
        productId: 'main-guid',
        modifiers: [{ group: 'Соус', option: 'Соус', groupId: 'sauce-group', optionId: 'sauce-guid' }],
      }],
      subtotal: 1,
      total: 1,
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(200);
    expect(mocks.createSiteOrder).toHaveBeenCalledWith(expect.objectContaining({
      items: [{
        productId: 'main-guid',
        amount: 1,
        modifiers: [{ productId: 'sauce-guid', productGroupId: 'sauce-group', amount: 1 }],
      }],
      comment: expect.stringContaining('Итого: 1000 ₽'),
    }));
    expect(mocks.logOrderAttempt).toHaveBeenLastCalledWith(expect.objectContaining({
      subtotal: 1000,
      total: 1000,
      items: [{ name: 'Блюдо', qty: 1, price: 1000 }],
    }));
  });

  it('preserves business-lunch composite carts while removing a stale garnish selection', async () => {
    mocks.getIikoMenu.mockResolvedValueOnce({
      main: { categories: [] },
      business: {
        categories: [{
          id: 'business',
          name: 'БИЗНЕС ЛАНЧ',
          items: [{
            id: 'lunch-guid',
            name: 'Сет бизнес-ланча',
            price: 400,
            modifierGroups: [{
              id: 'dish-group',
              name: 'Второе блюдо',
              min: 1,
              max: 1,
              options: [{ id: 'dish-option', name: 'Котлета (БЕЗ ГАРНИРА)', price: 0 }],
            }, {
              id: 'garnish-group',
              name: 'Гарнир',
              min: 1,
              max: 1,
              options: [{ id: 'garnish-option', name: 'Пюре', price: 50 }],
            }],
          }],
        }],
      },
    });
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{
        id: 'bl-lunch-guid-dish-option-garnish-option',
        name: 'Старое название сета',
        qty: 2,
        price: 400,
        productId: 'lunch-guid',
        modifiers: [
          { group: 'Подмена', option: 'Подмена', groupId: 'dish-group', optionId: 'dish-option' },
          { group: 'Гарнир', option: 'Пюре', groupId: 'garnish-group', optionId: 'garnish-option' },
        ],
      }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(200);
    expect(mocks.createSiteOrder).toHaveBeenCalledWith(expect.objectContaining({
      items: [{
        productId: 'lunch-guid',
        amount: 2,
        modifiers: [{ productId: 'dish-option', productGroupId: 'dish-group', amount: 1 }],
      }],
    }));
    expect(mocks.logOrderAttempt).toHaveBeenLastCalledWith(expect.objectContaining({
      subtotal: 800,
      items: [{ name: 'Сет бизнес-ланча', qty: 2, price: 400 }],
    }));
  });

  it.each([
    ['zero', 0],
    ['fractional', 1.5],
    ['non-finite JSON value', null],
  ])('rejects %s quantities before menu, stop-list, and iiko work', async (_label, qty) => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{ id: 'main-guid', name: 'Блюдо', qty, price: 900, productId: 'main-guid' }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_items' });
    expect(mocks.getIikoMenu).not.toHaveBeenCalled();
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown product', { productId: 'unknown-guid', price: 900, modifiers: [] }],
    ['mismatched unit price', { productId: 'main-guid', price: 1, modifiers: [] }],
    ['modifier outside its group', {
      productId: 'main-guid',
      price: 1000,
      modifiers: [{ group: 'Соус', option: 'Соус', groupId: 'wrong-group', optionId: 'sauce-guid' }],
    }],
  ])('rejects %s before minimum, stop-list, and iiko work', async (_label, item) => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{ id: 'cart-item', name: 'Блюдо', qty: 1, ...item }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'invalid_items' });
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('does not let a client mark an ordinary item as a business lunch', async () => {
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{
        id: 'bl-tampered',
        name: 'Блюдо',
        qty: 2,
        productId: 'ordinary-guid',
        isBusinessLunch: true,
        price: 400,
      }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: 'MIN_ORDER' });
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['missing delivery address', {
      now: '2026-07-12T15:00:00Z',
      fulfillmentType: 'delivery',
      address: '',
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
      status: 400,
      error: 'address_required',
    }],
    ['off-grid scheduled time', {
      now: '2026-07-12T15:00:00Z',
      fulfillmentType: 'pickup',
      address: '',
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T12:07:59',
      status: 409,
      error: 'order_time_invalid',
    }],
    ['closed ASAP window', {
      now: '2026-07-12T20:00:00Z',
      fulfillmentType: 'pickup',
      address: '',
      deliveryTime: 'asap',
      deliveryTimeCustom: undefined,
      status: 409,
      error: 'delivery_closed',
    }],
  ])('returns the conscious %s rejection before a failing menu fetch', async (_label, scenario) => {
    vi.setSystemTime(new Date(scenario.now));
    mocks.getIikoMenu.mockRejectedValueOnce(new Error('catalog offline'));
    const response = await POST(makeReq({
      fulfillmentType: scenario.fulfillmentType,
      name: 'Анна',
      phone: '+79161112233',
      address: scenario.address,
      items: [{ id: 'dish', name: 'Бизнес-ланч', qty: 2, price: 400, productId: 'dish-guid' }],
      deliveryTime: scenario.deliveryTime,
      deliveryTimeCustom: scenario.deliveryTimeCustom,
    }) as never);

    expect(response.status).toBe(scenario.status);
    await expect(response.json()).resolves.toMatchObject({ error: scenario.error });
    expect(mocks.getIikoMenu).not.toHaveBeenCalled();
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });

  it('returns a safe no-fallback response when the authoritative menu is unavailable', async () => {
    mocks.getIikoMenu.mockRejectedValueOnce(new Error('catalog offline'));
    const response = await POST(makeReq({
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{ id: 'dish', name: 'Бизнес-ланч', qty: 2, price: 400, productId: 'dish-guid' }],
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-13T15:30:00',
    }) as never);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: 'menu_unavailable',
    });
    expect(mocks.getStopListProductIds).not.toHaveBeenCalled();
    expect(mocks.createSiteOrder).not.toHaveBeenCalled();
  });
});
