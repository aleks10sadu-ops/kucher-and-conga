import { iikoPost, IikoError } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';

// Стоп-лист iiko: продукты с balance <= 0 недоступны для заказа.
// Кеш 60 секунд — стопы меняются в течение дня, свежесть важна.
// При недоступности iiko отдаём последний удачный список (или пустой):
// заказы не блокируем из-за сетевого сбоя, финальную проверку сделает терминал.
const TTL_MS = 60 * 1000;
let cache: { ids: Set<string>; expiresAt: number } | null = null;
let lastGood: Set<string> | null = null;

async function requestStopList(): Promise<Set<string>> {
  const { organizationId } = getIikoConfig();
  const terminalGroupId = process.env.IIKO_TERMINAL_GROUP_ID || null;
  const attempt = async (force: boolean) => {
    const token = await getToken(force);
    return await iikoPost<any>('/api/1/stop_lists', { organizationIds: [organizationId] }, token);
  };
  let data: any;
  try {
    data = await attempt(false);
  } catch (e) {
    if (e instanceof IikoError && e.status === 401) data = await attempt(true);
    else throw e;
  }
  const ids = new Set<string>();
  for (const org of data?.terminalGroupStopLists ?? []) {
    for (const tg of org?.items ?? []) {
      if (terminalGroupId && tg?.terminalGroupId && tg.terminalGroupId !== terminalGroupId) continue;
      for (const it of tg?.items ?? []) {
        if ((it?.balance ?? 0) <= 0 && it?.productId) ids.add(String(it.productId));
      }
    }
  }
  return ids;
}

export async function getStopListProductIds(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.ids;
  try {
    const ids = await requestStopList();
    cache = { ids, expiresAt: now + TTL_MS };
    lastGood = ids;
    return ids;
  } catch (e) {
    console.warn('[iiko] stop list fetch failed', e);
    return lastGood ?? new Set();
  }
}

export function __resetStopListCache(): void {
  cache = null;
  lastGood = null;
}
