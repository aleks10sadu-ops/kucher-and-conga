import { iikoPost, IikoError } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';
import type { IikoExternalMenu } from './types';

const TTL_MS = 5 * 60 * 1000;
const MENU_ID_TTL_MS = 60 * 60 * 1000;
let cache: { data: IikoExternalMenu; expiresAt: number } | null = null;
let lastGood: IikoExternalMenu | null = null;
let resolvedMenu: { id: string; expiresAt: number } | null = null;

// Сайт работает с внешним меню iiko по ИМЕНИ (IIKO_EXTERNAL_MENU_NAME, по умолчанию
// «Сайт» — без наценки), а не по захардкоженному GUID: меню можно пересоздавать в
// iikoWeb без правки env. Если меню с таким именем не нашлось или список недоступен —
// откат на IIKO_EXTERNAL_MENU_ID, чтобы сайт не остался без меню.
async function resolveExternalMenuId(token: string): Promise<string> {
  const { organizationId, externalMenuId, externalMenuName } = getIikoConfig();
  if (!externalMenuName) return externalMenuId;
  const now = Date.now();
  if (resolvedMenu && resolvedMenu.expiresAt > now) return resolvedMenu.id;
  try {
    const list = await iikoPost<{ externalMenus?: { id: string; name: string }[] }>(
      '/api/2/menu', { organizationId }, token,
    );
    const target = externalMenuName.toLowerCase();
    const found = (list.externalMenus ?? []).find((m) => (m.name ?? '').trim().toLowerCase() === target);
    if (found) {
      console.log(`[iiko] external menu resolved by name: "${externalMenuName}" -> ${found.id} (of ${(list.externalMenus ?? []).length}: ${(list.externalMenus ?? []).map((m) => `${m.name}=${m.id}`).join(', ')})`);
      resolvedMenu = { id: found.id, expiresAt: now + MENU_ID_TTL_MS };
      return found.id;
    }
    console.warn(`[iiko] external menu "${externalMenuName}" not found (have: ${(list.externalMenus ?? []).map((m) => m.name).join(', ')}), falling back to IIKO_EXTERNAL_MENU_ID`);
  } catch (e) {
    if (e instanceof IikoError && e.status === 401) throw e; // токен протух — пусть ретраится уровнем выше
    console.warn('[iiko] external menu list fetch failed, falling back to IIKO_EXTERNAL_MENU_ID', e);
  }
  return externalMenuId;
}

async function requestExternalMenu(): Promise<IikoExternalMenu> {
  const { organizationId } = getIikoConfig();
  const attempt = async (forceToken: boolean) => {
    const token = await getToken(forceToken);
    const externalMenuId = await resolveExternalMenuId(token);
    const body = { externalMenuId, organizationIds: [organizationId], language: 'ru' };
    return await iikoPost<IikoExternalMenu>('/api/2/menu/by_id', body, token);
  };
  try {
    return await attempt(false);
  } catch (e) {
    if (e instanceof IikoError && e.status === 401) return await attempt(true);
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
  resolvedMenu = null;
}
