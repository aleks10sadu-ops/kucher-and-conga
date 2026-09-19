import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getIikoMenu } from '@/lib/iiko';

vi.mock('@/lib/iiko', () => ({ getIikoMenu: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('live business lunch endpoint', () => {
  it('returns current names without CDN or browser caching', async () => {
    const business = { categories: [{ id: 'bl', name: 'БИЗНЕС ЛАНЧ', items: [] }] };
    vi.mocked(getIikoMenu).mockResolvedValue({ business, main: { categories: [] } });
    const response = await GET();
    expect(await response.json()).toEqual(business);
    expect(getIikoMenu).toHaveBeenCalledWith({ requireCurrentNames: true });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store');
  });

  it('signals an outage instead of replacing existing menu data with an empty success', async () => {
    vi.mocked(getIikoMenu).mockRejectedValue(new Error('iiko unavailable'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).not.toHaveProperty('categories');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
