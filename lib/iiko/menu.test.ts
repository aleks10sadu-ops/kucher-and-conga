import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchExternalMenu, invalidateMenuCache, __resetMenuCache } from './menu';
import { __resetTokenCache } from './auth';

function ok(json: unknown) {
  return { ok: true, text: async () => JSON.stringify(json) };
}

describe('fetchExternalMenu', () => {
  beforeEach(() => {
    __resetMenuCache();
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
  });

  it('authenticates then fetches and caches the menu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' })) // access_token
      .mockResolvedValueOnce(ok({ itemCategories: [{ id: 'c', name: 'X', items: [] }] }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchExternalMenu();
    const second = await fetchExternalMenu(); // from cache, no new fetch
    expect(first.itemCategories?.[0].name).toBe('X');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves last good menu when a later refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' }))
      .mockResolvedValueOnce(ok({ itemCategories: [{ id: 'c', name: 'X', items: [] }] }))
      .mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const good = await fetchExternalMenu();
    expect(good.itemCategories?.[0].name).toBe('X');

    // Сбрасываем только TTL-кэш (lastGood остаётся); следующий запрос упадёт → отдаётся stale.
    invalidateMenuCache();
    const stale = await fetchExternalMenu();
    expect(stale.itemCategories?.[0].name).toBe('X');
  });
});
