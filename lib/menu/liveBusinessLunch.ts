import type { MenuCategory } from '@/types/index';

export type BusinessLunchMenu = { categories: MenuCategory[] };

// Independent of the ISR HTML: open tabs also receive office renames.
export function startBusinessLunchRefresh(receive: (menu: BusinessLunchMenu) => void): () => void {
  let disposed = false;
  let controller: AbortController | undefined;
  const refresh = async () => {
    if (disposed || controller || document.visibilityState === 'hidden') return;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 55_000);
    try {
      const response = await fetch('/api/business-lunch', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const menu = await response.json();
      if (!disposed && Array.isArray(menu?.categories)) receive(menu);
    } catch {
      // Keep the last successful menu during an iiko/network outage; retry next minute.
    } finally {
      clearTimeout(timeout);
      controller = undefined;
    }
  };
  void refresh();
  const interval = setInterval(refresh, 60_000);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    disposed = true;
    clearInterval(interval);
    controller?.abort();
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}
