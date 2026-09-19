import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyBusinessLunchNames } from './businessLunchNames';

afterEach(() => {
  vi.useRealTimers(); vi.resetModules();
  vi.doUnmock('./serverNames');
});

describe('live business lunch names', () => {
  it('uses direct saved names instead of stale Cloud names and retries after an outage', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const direct = vi.fn()
      .mockResolvedValueOnce(new Map([['dish', 'Сохранено в Office']]))
      .mockRejectedValueOnce(new Error('server temporarily offline'))
      .mockResolvedValueOnce(new Map([['dish', 'Ещё одно переименование']]));
    const cloud = vi.fn();
    vi.doMock('./serverNames', () => ({ hasDirectNamesSource: () => true, getServerProductNames: direct }));
    vi.doMock('./client', () => ({ iikoPost: cloud, IikoError: class extends Error {} }));
    const { getBusinessLunchNames } = await import('./businessLunchNames');
    const first = await Promise.all([getBusinessLunchNames(), getBusinessLunchNames()]);
    expect(first[0].get('dish')).toBe('Сохранено в Office');
    expect(direct).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(getBusinessLunchNames()).rejects.toThrow('server temporarily offline');
    expect((await getBusinessLunchNames()).get('dish')).toBe('Ещё одно переименование');
    expect(cloud).not.toHaveBeenCalled();
  });

  const categories = [{ id: 'bl', name: 'БИЗНЕС ЛАНЧ', items: [{
    id: 'set', name: 'Сет', price: 580, modifierGroups: [{
      id: 'main', name: 'Второе', options: [{ id: 'dish', name: 'Старое имя', price: 0 }],
    }],
  }] }] as any;

  it('tracks arbitrary renames and removal of the garnish marker without changing order IDs/prices', () => {
    for (const name of ['Лазанья (БЕЗ ГАРНИРА)', 'Лазанья с гарниром', 'Другое блюдо']) {
      const result = applyBusinessLunchNames(categories, new Map([['dish', name]]));
      expect(result[0].items[0].modifierGroups![0].options[0]).toEqual({ id: 'dish', name, price: 0 });
      expect(result[0].items[0].price).toBe(580);
    }
    expect(categories[0].items[0].modifierGroups[0].options[0].name).toBe('Старое имя');
  });

  it('retains external names for products missing from the office response', () => {
    expect(applyBusinessLunchNames(categories, new Map())).toEqual(categories);
  });

  it('refreshes office names after one minute and coalesces simultaneous requests', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.doMock('./auth', () => ({ getToken: vi.fn().mockResolvedValue('token') }));
    vi.doMock('./config', () => ({ getIikoConfig: () => ({ organizationId: 'org' }) }));
    const post = vi.fn().mockResolvedValueOnce({ products: [{ id: 'dish', name: 'Первое имя' }] })
      .mockResolvedValueOnce({ products: [{ id: 'dish', name: 'Новое имя' }] });
    vi.doMock('./client', () => ({ iikoPost: post, IikoError: class extends Error {} }));
    const { getBusinessLunchNames } = await import('./businessLunchNames');
    const first = await Promise.all([getBusinessLunchNames(), getBusinessLunchNames()]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(first[0].get('dish')).toBe('Первое имя');
    await vi.advanceTimersByTimeAsync(60_001);
    expect((await getBusinessLunchNames()).get('dish')).toBe('Новое имя');
    expect(post).toHaveBeenCalledTimes(2);
  });
});
