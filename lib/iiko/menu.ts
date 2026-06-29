import { iikoPost, IikoError } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';
import type { IikoExternalMenu } from './types';

const TTL_MS = 5 * 60 * 1000;
let cache: { data: IikoExternalMenu; expiresAt: number } | null = null;
let lastGood: IikoExternalMenu | null = null;

async function requestExternalMenu(): Promise<IikoExternalMenu> {
  const { organizationId, externalMenuId } = getIikoConfig();
  const body = { externalMenuId, organizationIds: [organizationId], language: 'ru' };
  try {
    const token = await getToken();
    return await iikoPost<IikoExternalMenu>('/api/2/menu/by_id', body, token);
  } catch (e) {
    if (e instanceof IikoError && e.status === 401) {
      const token = await getToken(true);
      return await iikoPost<IikoExternalMenu>('/api/2/menu/by_id', body, token);
    }
    throw e;
  }
}

export async function fetchExternalMenu(): Promise<IikoExternalMenu> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  try {
    const data = await requestExternalMenu();
    cache = { data, expiresAt: now + TTL_MS };
    lastGood = data;
    return data;
  } catch (e) {
    if (lastGood) {
      console.warn('[iiko] serving stale menu after fetch failure', e);
      return lastGood; // stale-while-error
    }
    throw e;
  }
}

export function invalidateMenuCache(): void {
  cache = null;
}

export function __resetMenuCache(): void {
  cache = null;
  lastGood = null;
}
