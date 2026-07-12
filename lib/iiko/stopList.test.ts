import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStopListProductIds, __resetStopListCache } from './stopList';
import { __resetTokenCache } from './auth';

function ok(json: unknown) {
  return { ok: true, text: async () => JSON.stringify(json) };
}

describe('getStopListProductIds', () => {
  beforeEach(() => {
    __resetStopListCache();
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '1';
    delete process.env.IIKO_TERMINAL_GROUP_ID;
  });

  it('collects productIds with balance <= 0 and caches the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T' }))
      .mockResolvedValueOnce(ok({
        terminalGroupStopLists: [
          { organizationId: 'org', items: [{ terminalGroupId: 'tg1', items: [
            { productId: 'p-stop', balance: 0 },
            { productId: 'p-negative', balance: -2 },
            { productId: 'p-available', balance: 5 },
          ] }] },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const ids = await getStopListProductIds();
    expect(ids.has('p-stop')).toBe(true);
    expect(ids.has('p-negative')).toBe(true);
    expect(ids.has('p-available')).toBe(false);

    const again = await getStopListProductIds(); // из кеша
    expect(again).toBe(ids);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('filters by IIKO_TERMINAL_GROUP_ID when set', async () => {
    process.env.IIKO_TERMINAL_GROUP_ID = 'tg1';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T' }))
      .mockResolvedValueOnce(ok({
        terminalGroupStopLists: [
          { items: [
            { terminalGroupId: 'tg1', items: [{ productId: 'a', balance: 0 }] },
            { terminalGroupId: 'tg2', items: [{ productId: 'b', balance: 0 }] },
          ] },
        ],
      }));
    vi.stubGlobal('fetch', fetchMock);

    const ids = await getStopListProductIds();
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(false);
  });

  it('returns empty set instead of throwing when iiko is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const ids = await getStopListProductIds();
    expect(ids.size).toBe(0);
  });
});
