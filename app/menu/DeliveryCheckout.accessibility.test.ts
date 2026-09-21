import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useEffect: vi.fn(),
    useState: vi.fn((initial) => {
      const value = typeof initial === 'function' ? initial() : initial;
      if (value && typeof value === 'object' && 'deliveryTime' in value) {
        return [{ ...value, deliveryTime: 'custom' }, vi.fn()];
      }
      return [value, vi.fn()];
    }),
  };
});

import DeliveryCheckout from './DeliveryCheckout';

type ElementNode = {
  props?: {
    'aria-label'?: string;
    'aria-pressed'?: boolean;
    ariaLabel?: string;
    dateOnly?: boolean;
    children?: unknown;
    id?: string;
    inputMode?: string;
    role?: string;
    showTime?: boolean;
    type?: string;
    value?: string;
  };
};

function findElement(node: unknown, predicate: (element: ElementNode) => boolean): ElementNode | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (!node || typeof node !== 'object' || !('props' in node)) return undefined;
  const element = node as ElementNode;
  return predicate(element) ? element : findElement(element.props?.children, predicate);
}

describe('DeliveryCheckout fulfillment selector accessibility', () => {
  afterEach(() => vi.useRealTimers());

  it('exposes a labelled pressed-button group with delivery selected by default', () => {
    const checkout = DeliveryCheckout({
      items: [],
      subtotal: 0,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    });
    const group = findElement(checkout, (element) => element.props?.role === 'group');
    const delivery = findElement(checkout, (element) => element.props?.children === 'Доставка');
    const pickup = findElement(checkout, (element) => element.props?.children === 'Самовывоз');

    expect(group?.props?.['aria-label']).toBe('Способ получения заказа');
    expect(delivery?.props?.['aria-pressed']).toBe(true);
    expect(pickup?.props?.['aria-pressed']).toBe(false);
  });

  it('can open with pickup selected from an SEO deep link', () => {
    const checkout = DeliveryCheckout({
      items: [],
      subtotal: 0,
      initialFulfillmentType: 'pickup',
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    });
    const delivery = findElement(checkout, (element) => element.props?.children === 'Доставка');
    const pickup = findElement(checkout, (element) => element.props?.children === 'Самовывоз');

    expect(delivery?.props?.['aria-pressed']).toBe(false);
    expect(pickup?.props?.['aria-pressed']).toBe(true);
  });

  it('renders separate booking-style date and time fields with today selected', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T10:00:00.000Z'));

    const checkout = DeliveryCheckout({
      items: [],
      subtotal: 0,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    });
    const date = findElement(checkout, (element) => element.props?.ariaLabel === 'Дата получения');
    const time = findElement(checkout, (element) => element.props?.id === 'order-time');

    expect(date?.props?.dateOnly).toBe(true);
    expect(date?.props?.showTime).toBe(false);
    expect(date?.props?.value).toBe('2026-08-24');
    expect(time?.props?.type).toBe('text');
    expect(time?.props?.inputMode).toBe('numeric');
  });
});
