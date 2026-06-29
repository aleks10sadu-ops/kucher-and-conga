import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, __resetTokenCache } from './auth';

describe('getToken', () => {
  beforeEach(() => {
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
  });

  it('requests once and caches the token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => JSON.stringify({ token: 'T1' }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await getToken()).toBe('T1');
    expect(await getToken()).toBe('T1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-requests when forceRefresh is true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: 'T1' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: 'T2' }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await getToken()).toBe('T1');
    expect(await getToken(true)).toBe('T2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
