import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, __resetTokenCache } from './auth';

describe('getToken', () => {
  beforeEach(() => {
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
    delete process.env.IIKO_APP_ID;
    delete process.env.IIKO_APP_SECRET;
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

  it('использует v1 (/api/1/access_token, apiLogin) когда appId/appSecret не заданы', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => JSON.stringify({ token: 'T1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await getToken();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/1/access_token');
    expect(JSON.parse(opts.body)).toEqual({ apiLogin: 'login' });
  });

  it('использует v2 (/api/v2/access_token с appId+clientSecret+apiKey) когда заданы appId/appSecret', async () => {
    process.env.IIKO_APP_ID = 'app-123';
    process.env.IIKO_APP_SECRET = 'secret-xyz';
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => JSON.stringify({ token: 'T2' }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await getToken()).toBe('T2');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v2/access_token');
    expect(JSON.parse(opts.body)).toEqual({
      apiKey: 'login',
      appId: 'app-123',
      clientSecret: 'secret-xyz',
    });
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
