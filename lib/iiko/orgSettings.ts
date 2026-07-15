import { iikoPost } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';

// Формат адреса доставки, который ждёт iiko при создании заказа.
// 'legacy' — старый разбор на улицу/дом/корпус (deliveries/create → address.type "legacy").
// 'city'   — новый формат: весь адрес одной строкой в line1 (address.type "city").
export type AddressFormat = 'legacy' | 'city';

const DAY = 24 * 60 * 60 * 1000;
let cache: { value: AddressFormat; at: number } | null = null;

interface OrganizationsResponse {
  // при returnAdditionalInfo: true в каждой организации приходит addressFormatType
  organizations?: Array<{ addressFormatType?: string }>;
}

/**
 * Узнаёт у iiko, какой формат адреса включён у организации, и запоминает на сутки.
 *
 * Источник истины — сама настройка iiko (галочка «новый формат адресов»), поэтому
 * сайт подстраивается автоматически: до включения галочки шлём legacy, после —
 * city (line1). Не нужно синхронизировать деплой с моментом переключения.
 *
 * addressFormatType бывает Legacy | City | International | IntNoPostcode, но в
 * deliveries/create дискриминатор адреса всего два: legacy и city. Всё, что не
 * Legacy, требует адрес одной строкой в line1 — маппим в 'city'.
 *
 * При сбое запроса возвращаем последнее известное значение (даже устаревшее),
 * иначе — 'legacy' (текущее поведение, чтобы ничего не регрессировало).
 */
export async function getAddressFormat(token?: string): Promise<AddressFormat> {
  if (cache && Date.now() - cache.at < DAY) return cache.value;
  try {
    const { organizationId } = getIikoConfig();
    const t = token || (await getToken());
    const r = await iikoPost<OrganizationsResponse>(
      '/api/1/organizations',
      { organizationIds: [organizationId], returnAdditionalInfo: true },
      t,
    );
    const fmt = r.organizations?.[0]?.addressFormatType;
    const value: AddressFormat = fmt && fmt !== 'Legacy' ? 'city' : 'legacy';
    cache = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error('getAddressFormat failed:', e);
    if (cache) return cache.value; // отдаём известное значение, пусть и просроченное
    return 'legacy';
  }
}

export function __resetAddressFormatCache(): void {
  cache = null;
}
