import { afterEach, describe, expect, it, vi } from 'vitest';
import { startBusinessLunchRefresh } from './liveBusinessLunch';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('business lunch refresh on an already open page', () => {
  it('loads at mount, polls, refreshes on focus and keeps the last menu on failure', async () => {
    vi.useFakeTimers();
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', doc);
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ categories: [{ id: 'old' }] }) });
    vi.stubGlobal('fetch', fetcher);
    const receive = vi.fn();
    const stop = startBusinessLunchRefresh(receive);
    await vi.advanceTimersByTimeAsync(1);
    expect(receive).toHaveBeenLastCalledWith({ categories: [{ id: 'old' }] });
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ categories: [{ id: 'renamed' }] }) });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(receive).toHaveBeenLastCalledWith({ categories: [{ id: 'renamed' }] });
    const count = receive.mock.calls.length;
    fetcher.mockRejectedValue(new Error('offline'));
    win.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(1);
    expect(receive).toHaveBeenCalledTimes(count);
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
    stop();
    const requests = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120_000);
    win.dispatchEvent(new Event('focus'));
    expect(fetcher).toHaveBeenCalledTimes(requests);
  });
});
