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

// «Промышленная, дом 20Б» → «Промышленная»; «Загорская 32» → «Загорская».
// Гости пишут дом в поле улицы как угодно — перед сопоставлением со
// справочником хвост с номером дома отрезаем.
export function stripHouse(part: string): string {
  return String(part)
    .replace(/,?\s*(?:дом|д\.)\s*[\wа-яё/\\-]+\s*$/i, '')
    .replace(/,?\s+\d+[\wа-яё/\\-]*\s*$/i, '')
    .trim();
}

/**
 * Кандидаты в название улицы из свободной строки адреса.
 * Части через запятую, без номеров домов; часть со словом «улица» — первая.
 */
export function streetCandidates(raw: string): string[] {
  const parts = String(raw).split(',').map((s) => stripHouse(s)).filter(Boolean);
  const withKeyword = parts.filter((p) => /(улица|ул\.)/i.test(p));
  const rest = parts.filter((p) => !withKeyword.includes(p));
  return [...withKeyword, ...rest];
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

/**
 * Резолвит улицу из свободной строки адреса: перебирает кандидатов
 * (части адреса без номеров домов) до первого совпадения со справочником.
 * «Промышленная», «Промышленная, дом 20Б», «Дмитров, Промышленная улица, 46» —
 * все варианты находят улицу «Промышленная».
 */
export async function resolveStreetFromAddress(
  rawAddress: string,
  cityHint: string | null,
): Promise<ResolvedStreet | null> {
  for (const candidate of streetCandidates(rawAddress)) {
    // кандидат может оказаться городом («Дмитров») — резолвер его просто не найдёт
    const hit = await resolveStreet(cityHint, candidate);
    if (hit) return hit;
  }
  return null;
}
