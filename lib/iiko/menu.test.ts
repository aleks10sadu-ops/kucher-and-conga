import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchExternalMenu, invalidateMenuCache, __resetMenuCache } from './menu';
import { __resetTokenCache } from './auth';

function ok(json: unknown) {
  return { ok: true, text: async () => JSON.stringify(json) };
}

function bodyOfCall(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  return JSON.parse(fetchMock.mock.calls[index][1].body as string);
}

describe('fetchExternalMenu', () => {
  beforeEach(() => {
    __resetMenuCache();
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
    delete process.env.IIKO_EXTERNAL_MENU_NAME; // default: «Сайт»
  });

  it('authenticates, resolves menu «Сайт» by name, then fetches and caches the menu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' })) // access_token
      .mockResolvedValueOnce(ok({ externalMenus: [{ id: 'M-YA', name: 'Яндекс' }, { id: 'M-SITE', name: 'Сайт' }] }))
      .mockResolvedValueOnce(ok({ itemCategories: [{ id: 'c', name: 'X', items: [] }] }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchExternalMenu();
    const second = await fetchExternalMenu(); // from cache, no new fetch
    expect(first.itemCategories?.[0].name).toBe('X');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // by_id должен запрашиваться с id меню «Сайт», а не с env-фолбэком
    expect(bodyOfCall(fetchMock, 2).externalMenuId).toBe('M-SITE');
  });

  it('falls back to IIKO_EXTERNAL_MENU_ID when no menu named «Сайт» exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' }))
      .mockResolvedValueOnce(ok({ externalMenus: [{ id: 'M-YA', name: 'Яндекс' }] }))
      .mockResolvedValueOnce(ok({ itemCategories: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchExternalMenu();
    expect(bodyOfCall(fetchMock, 2).externalMenuId).toBe('79802');
  });

  it('skips name resolution when IIKO_EXTERNAL_MENU_NAME is empty', async () => {
    process.env.IIKO_EXTERNAL_MENU_NAME = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' }))
      .mockResolvedValueOnce(ok({ itemCategories: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchExternalMenu();
    expect(fetchMock).toHaveBeenCalledTimes(2); // без вызова списка меню
    expect(bodyOfCall(fetchMock, 1).externalMenuId).toBe('79802');
  });

  it('serves last good menu when a later refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' }))
      .mockResolvedValueOnce(ok({ externalMenus: [{ id: 'M-SITE', name: 'Сайт' }] }))
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
