import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { getServerProductNames } from './serverNames';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function configure() {
  vi.stubEnv('IIKO_SERVER_URL', 'https://restaurant.example/resto');
  vi.stubEnv('IIKO_SERVER_LOGIN', 'menu-reader');
  vi.stubEnv('IIKO_SERVER_PASSWORD_SHA1', createHash('sha1').update('test-secret').digest('hex'));
}

describe('direct iikoServer names', () => {
  it('reads saved names by ID and releases the API session', async () => {
    configure();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('11111111-1111-1111-1111-111111111111'))
      .mockResolvedValueOnce(Response.json([
        { id: 'dish', name: 'Котлета по-киевски 123 ', type: 'MODIFIER' },
        { id: 'deleted', name: 'Удалённое', deleted: true },
      ]))
      .mockResolvedValueOnce(new Response(''));
    vi.stubGlobal('fetch', fetcher);
    expect(await getServerProductNames()).toEqual(new Map([['dish', 'Котлета по-киевски 123']]));
    const auth = new URL(String(fetcher.mock.calls[0][0]));
    expect(auth.pathname).toBe('/resto/api/auth');
    expect(auth.searchParams.get('pass')).toBe(createHash('sha1').update('test-secret').digest('hex'));
    expect(new URL(String(fetcher.mock.calls[1][0])).pathname).toBe('/resto/api/v2/entities/products/list');
    expect(new URL(String(fetcher.mock.calls[2][0])).pathname).toBe('/resto/api/logout');
    expect(fetcher.mock.calls.every(([, opts]) => opts.cache === 'no-store' && opts.redirect === 'error')).toBe(true);
  });

  it('releases a session after a product request fails and does not leak response details', async () => {
    configure();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('11111111-1111-1111-1111-111111111111'))
      .mockResolvedValueOnce(new Response('private server details', { status: 403 }))
      .mockResolvedValueOnce(new Response(''));
    vi.stubGlobal('fetch', fetcher);
    await expect(getServerProductNames()).rejects.toThrow('iikoServer products HTTP 403');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('rejects invalid product responses instead of accepting an empty successful menu', async () => {
    configure();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('11111111-1111-1111-1111-111111111111'))
      .mockResolvedValueOnce(Response.json({ error: 'unexpected response' }))
      .mockResolvedValueOnce(new Response('')));
    await expect(getServerProductNames()).rejects.toThrow('Invalid iikoServer products response');
  });

  it('requires HTTPS and complete credentials before making a request', async () => {
    configure();
    vi.stubEnv('IIKO_SERVER_URL', 'http://restaurant.example/resto');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(getServerProductNames()).rejects.toThrow('HTTPS');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
