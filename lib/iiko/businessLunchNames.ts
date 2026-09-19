import { getToken } from './auth';
import { iikoPost, IikoError } from './client';
import { getIikoConfig } from './config';
import type { MenuCategory } from '@/types/index';
import { getServerProductNames, hasDirectNamesSource } from './serverNames';

let cached: { names: Map<string, string>; expires: number } | undefined;
let pending: Promise<Map<string, string>> | undefined;

// Direct server names avoid the Office -> Cloud export delay.
// IDs, availability, groups and prices still come from the external menu.
export async function getBusinessLunchNames(): Promise<Map<string, string>> {
  if (cached && cached.expires > Date.now()) return cached.names;
  if (pending) return pending;
  pending = (async () => {
    if (hasDirectNamesSource()) {
      const names = await getServerProductNames();
      cached = { names, expires: Date.now() + 60_000 };
      return names;
    }
    const request = async (force: boolean) => iikoPost<{
      products: { id: string; name: string; isDeleted?: boolean }[];
    }>('/api/1/nomenclature', {
      organizationId: getIikoConfig().organizationId, startRevision: 0,
    }, await getToken(force));
    let response;
    try { response = await request(false); }
    catch (error) {
      if (!(error instanceof IikoError) || error.status !== 401) throw error;
      response = await request(true);
    }
    if (!Array.isArray(response.products)) throw new Error('Invalid iiko nomenclature response');
    const names = new Map(response.products
      .filter((p) => !p.isDeleted && p.id && p.name?.trim())
      .map((p) => [p.id, p.name.trim()]));
    cached = { names, expires: Date.now() + 60_000 };
    return names;
  })();
  try { return await pending; }
  finally { pending = undefined; }
}

export function applyBusinessLunchNames(categories: MenuCategory[], names: Map<string, string>): MenuCategory[] {
  return categories.map((category) => ({ ...category, items: category.items.map((item) => ({
    ...item,
    name: names.get(String(item.id)) ?? item.name,
    modifierGroups: item.modifierGroups?.map((group) => ({ ...group,
      // These two labels describe website choices, not product names.
      options: group.name === 'Хлеб' ? group.options : group.options.map((option) => ({
        ...option, name: names.get(String(option.id)) ?? option.name,
      })),
    })),
  })) }));
}
