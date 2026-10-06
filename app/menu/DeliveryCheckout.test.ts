import { describe, expect, it, vi } from 'vitest';
import {
  buildScheduledOrderDateTime,
  formatOrderTimeInput,
  normalizeOrderTimeInput,
  submitCheckoutOrder,
} from '@/lib/delivery/checkout';

describe('DeliveryCheckout manual scheduled time', () => {
  it('formats keyboard input like booking and combines arbitrary minutes with the date', () => {
    expect(formatOrderTimeInput('1807')).toBe('18:07');
    expect(normalizeOrderTimeInput('7:05')).toBe('07:05');
    expect(buildScheduledOrderDateTime('2026-08-24', '18:07')).toBe('2026-08-24T18:07:00');
    expect(buildScheduledOrderDateTime('2026-08-24', '')).toBe('');
  });
});

const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('DeliveryCheckout order boundary', () => {
  it('keeps one request ID and the full validated input on a network fallback', async () => {
    const fetcher=vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce(response(200,{ok:true}));
    await submitCheckoutOrder({fulfillmentType:'pickup',coordinates:[56,37],requestId:'10236bd8-014b-4020-97e8-92a0b5b507e9'},fetcher,{type:'delivery',address:'old display string'});
    const first=JSON.parse(String(fetcher.mock.calls[0][1]?.body)),second=JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(second).toMatchObject({...first,type:'delivery'});expect(second.coordinates).toEqual([56,37]);
  });
  it('does not submit a delivery before its zone is resolved', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(200, { ok: true }));

    const result = await submitCheckoutOrder({ fulfillmentType: 'delivery' }, fetcher);

    expect(result).toEqual({
      ok: false,
      message: 'Не удалось определить зону доставки. Уточните адрес или выберите точку на карте.',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('shows a schedule rejection without Telegram fallback or success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(409, {
      ok: false,
      error: 'order_time_outside_schedule',
      message: 'Выберите время в интервале 12:00–21:45.',
    }));

    const result = await submitCheckoutOrder({ fulfillmentType: 'pickup' }, fetcher);

    expect(result).toEqual({ ok: false, message: 'Выберите время в интервале 12:00–21:45.' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/orders', expect.any(Object));
  });

  it('shows the MIN_ORDER message without Telegram fallback or success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response(422, {
      ok: false,
      error: 'MIN_ORDER',
      message: 'Минимальный заказ на самовывоз — 1 000 ₽ или от 2 бизнес-ланчей.',
    }));

    const result = await submitCheckoutOrder({ fulfillmentType: 'pickup' }, fetcher);

    expect(result).toEqual({
      ok: false,
      message: 'Минимальный заказ на самовывоз — 1 000 ₽ или от 2 бизнес-ланчей.',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/api/orders', expect.any(Object));
  });

  it('reports failure when the orders 500 fallback receives Telegram 502', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(500, { ok: false, error: 'iiko_unavailable' }))
      .mockResolvedValueOnce(response(502, { ok: false, error: 'telegram_unavailable' }));

    const result = await submitCheckoutOrder({ fulfillmentType: 'pickup' }, fetcher);

    expect(result).toEqual({
      ok: false,
      message: 'Не удалось отправить заказ. Позвоните нам, пожалуйста.',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(2, '/api/telegram', expect.any(Object));
  });
});
