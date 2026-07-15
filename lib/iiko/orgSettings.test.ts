import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAddressFormat, __resetAddressFormatCache } from './orgSettings';
import { __resetTokenCache } from './auth';

function ok(json: unknown) {
  return { ok: true, text: async () => JSON.stringify(json) };
}

describe('getAddressFormat', () => {
  beforeEach(() => {
    __resetAddressFormatCache();
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '1';
  });

  it('Legacy → legacy и кеширует результат', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T' }))
      .mockResolvedValueOnce(ok({ organizations: [{ addressFormatType: 'Legacy' }] }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getAddressFormat()).toBe('legacy');
    expect(await getAddressFormat()).toBe('legacy'); // из кеша
    expect(fetchMock).toHaveBeenCalledTimes(2); // токен + organizations, второй раз не ходили
  });

  it('City → city', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok({ token: 'T' }))
      .mockResolvedValueOnce(ok({ organizations: [{ addressFormatType: 'City' }] })));
    expect(await getAddressFormat()).toBe('city');
  });

  it('International / IntNoPostcode тоже требуют line1 → city', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok({ token: 'T' }))
      .mockResolvedValueOnce(ok({ organizations: [{ addressFormatType: 'International' }] })));
    expect(await getAddressFormat()).toBe('city');
  });

  it('переиспользует переданный токен, не запрашивая новый', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok({ organizations: [{ addressFormatType: 'City' }] }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getAddressFormat('given-token')).toBe('city');
    expect(fetchMock).toHaveBeenCalledTimes(1); // только organizations
  });

  it('при сбое без кеша откатывается на legacy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await getAddressFormat()).toBe('legacy');
  });
});
