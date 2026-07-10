import { iikoPost } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';

interface City { id: string; name: string }
interface Street { id: string; name: string }

const DAY = 24 * 60 * 60 * 1000;
let citiesCache: { at: number; items: City[] } | null = null;
const streetsCache = new Map<string, { at: number; items: Street[] }>();

// Нормализация для сопоставления со справочником iiko:
// убираем «улица/ул.» (в справочнике улицы без этого слова: «Промышленная», не «Промышленная улица»),
// но «проезд/переулок/бульвар/…» НЕ трогаем — они входят в название улицы в справочнике.
function norm(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/\s*(улица|ул\.)\s*/gi, ' ')
    .replace(/ё/g, 'е')
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getCities(token: string): Promise<City[]> {
  if (citiesCache && Date.now() - citiesCache.at < DAY) return citiesCache.items;
  const { organizationId } = getIikoConfig();
  const r = await iikoPost<{ cities: { items: City[] }[] }>(
    '/api/1/cities',
    { organizationIds: [organizationId] },
    token,
  );
  const items = (r.cities || []).flatMap((c) => c.items || []);
  citiesCache = { at: Date.now(), items };
  return items;
}

async function getStreets(cityId: string, token: string): Promise<Street[]> {
  const cached = streetsCache.get(cityId);
  if (cached && Date.now() - cached.at < DAY) return cached.items;
  const { organizationId } = getIikoConfig();
  const r = await iikoPost<{ streets: Street[] }>(
    '/api/1/streets/by_city',
    { organizationId, cityId },
    token,
  );
  const items = r.streets || [];
  streetsCache.set(cityId, { at: Date.now(), items });
  return items;
}

export interface ResolvedStreet {
  streetId: string;
  streetName: string;
  cityId: string;
}

/**
 * Находит streetId в справочнике улиц iiko по названию города и улицы.
 * Возвращает null, если улицы нет в справочнике или запрос упал —
 * вызывающий код в этом случае откатывается на передачу имени улицы строкой.
 */
export async function resolveStreet(
  cityName: string | null,
  streetName: string | null,
): Promise<ResolvedStreet | null> {
  if (!streetName) return null;
  try {
    const token = await getToken();
    const cities = await getCities(token);
    const wanted = norm(cityName || 'Дмитров');
    const city =
      cities.find((c) => norm(c.name) === wanted) ||
      cities.find((c) => norm(c.name) === 'дмитров');
    if (!city) return null;

    const streets = await getStreets(city.id, token);
    const target = norm(streetName);
    const hit = streets.find((s) => norm(s.name) === target);
    return hit ? { streetId: hit.id, streetName: hit.name, cityId: city.id } : null;
  } catch (e) {
    console.error('resolveStreet failed:', e);
    return null;
  }
}
