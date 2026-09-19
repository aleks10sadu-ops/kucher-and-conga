import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { buildMessage, POST } from './route';

vi.mock('@/lib/iiko/stopList', () => ({ getStopListProductIds: vi.fn(async () => new Set()) }));

describe('telegram booking delivery', () => {
  const booking = {
    type: 'booking', firstName: 'Анна', lastName: 'Иванова', name: 'Анна Иванова',
    phone: '+79991112233', date: '2026-09-18', time: '17:00', adults: 4, children: 2,
    bookingType: 'onsite', mode: 'self', hallName: 'Изумрудный зал', cartItems: [], cartFoodSum: 0,
  };
  const longBooking = {
    ...booking, bookingType: 'preorder',
    cartItems: Array.from({ length: 45 }, (_, index) => ({ name: `Блюдо ${index} с длинным названием`, qty: 2, price: 500 })),
    comment: 'Пожелания гостя. '.repeat(40),
  };
  const request = (body: unknown) => new NextRequest('http://localhost/api/telegram', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const configure = () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
    vi.stubEnv('TELEGRAM_CHAT_ID', 'delivery-chat');
    vi.stubEnv('TELEGRAM_BOOKING_CHAT_ID', 'booking-chat');
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the full request and copy block together to the booking chat', async () => {
    configure();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 42 } })));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(request(booking));
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent).toMatchObject({ chat_id: 'booking-chat', parse_mode: 'HTML' });
    expect(sent.text).toContain('Когда: 17:00 18.09.26');
    expect(sent.text).toContain('Зал: Изумрудный зал');
    expect(sent.text).toContain(`<pre>${'Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 2 На 17:00 Комм: —; Тип заказа: По факту'.padEnd(76, '\u00a0')}</pre>`);
    expect(sent).not.toHaveProperty('reply_markup');
  });

  it('links an oversized copy block to the original request', async () => {
    configure();
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 42 } })));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(request(longBooking));
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const sent = fetcher.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(sent[0].text).toContain('Зал: Изумрудный зал');
    expect(sent[0]).not.toHaveProperty('reply_parameters');
    expect(sent[1].text).toContain('Для Excel:\n<pre>');
    expect(sent[1].text).toContain('Блюдо 44 с длинным названием × 2');
    expect(sent[1]).toMatchObject({ chat_id: 'booking-chat', reply_parameters: { message_id: 42 } });
    expect(sent[0]).not.toHaveProperty('reply_markup');
    expect(sent[1]).not.toHaveProperty('reply_markup');
  });

  it('reports failure if Telegram rejects the copy block', async () => {
    configure();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { message_id: 42 } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, description: 'Telegram unavailable' })));
    vi.stubGlobal('fetch', fetcher);
    const response = await POST(request(longBooking));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: 'Telegram unavailable' });
  });
});

describe('telegram booking API message boundary', () => {
  it('passes a separate event ref into the escaped Telegram source line', () => {
    const message = buildMessage({
      type: 'booking',
      name: 'Анна Иванова',
      firstName: 'Анна',
      lastName: 'Иванова',
      phone: '+7 999 111-22-33',
      date: '2026-08-20',
      time: '19:00',
      adults: 2,
      children: 0,
      bookingType: 'onsite',
      hallName: null,
      cartItems: [],
      cartFoodSum: 0,
      source: 'страница события',
      sourceRef: '<jazz&vecher>',
    });

    expect(message).toContain('Источник: страница события — &lt;jazz&amp;vecher&gt;');
    expect(message.match(/^Источник:/gm)).toHaveLength(1);
  });
});

describe('telegram delivery fallback formatting', () => {
  it.each([
    ['Зона 400₽', 400],
    ['Бесплатная доставка', 0],
  ])('includes the resolved delivery zone %s', (zoneName, deliveryPrice) => {
    const message = buildMessage({
      type: 'delivery',
      fulfillmentType: 'delivery',
      name: 'Ксения',
      phone: '+79253207589',
      address: 'Дмитров, Новосиньковское, д. 41',
      items: [{ name: 'Блюдо', qty: 1, price: 1000 }],
      zoneName,
      deliveryPrice,
      total: 1000 + deliveryPrice,
      deliveryTime: 'asap',
      paymentMethod: 'card',
    });

    expect(message).toContain(`<b>Зона доставки:</b> ${zoneName}`);
  });

  it('formats pickup without a courier address', () => {
    const message = buildMessage({
      type: 'delivery',
      fulfillmentType: 'pickup',
      name: 'Анна',
      phone: '+79161112233',
      address: '',
      items: [{ name: 'Пицца', qty: 1, price: 1000 }],
      total: 1000,
      deliveryTime: 'custom',
      deliveryTimeCustom: '2026-07-17T19:30:00',
      paymentMethod: 'card',
    });

    expect(message).toContain('Заявка: Самовывоз');
    expect(message).toContain('Дмитров, Промышленная улица, 20Б');
    expect(message).toContain('17 июля 2026 г. в 19:30');
    expect(message).not.toContain('<b>Адрес доставки:</b>');
  });

  it('keeps a legacy payload formatted as delivery', () => {
    const message = buildMessage({
      type: 'delivery',
      name: 'Анна',
      phone: '+79161112233',
      address: 'Профессиональная, 1',
      items: [],
      total: 0,
      deliveryTime: 'asap',
      paymentMethod: 'card',
    });

    expect(message).toContain('Заявка: Доставка');
    expect(message).toContain('<b>Адрес доставки:</b> Профессиональная, 1');
  });
});
