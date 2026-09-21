import type { FulfillmentType } from '@/lib/delivery/types';

type MenuByType = Record<string, { categories?: unknown[] } | undefined>;
type MenuCategory = { id: string | number; name?: string | null };

const ALWAYS_AVAILABLE_TYPES = new Set(['delivery', 'main', 'bar', 'wine', 'banquet']);
const DATA_BACKED_TYPES = new Set(['business', 'kids', 'promotions']);
const DELIVERY_CATEGORY_ALIASES: Record<string, string> = {
    shashlyk: 'ШАШЛЫК ИЗ МЯСА И СЕТЫ',
    khinkali: 'ГОРЯЧИЕ МЯСНЫЕ БЛЮДА',
};

function readHashValue(hash: string): string {
    const raw = hash.replace(/^#/, '').trim().toLowerCase();
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export function resolveMenuDeepLink(hash: string, menuByType: MenuByType, fallback: string): string {
    const requested = readHashValue(hash);
    if (ALWAYS_AVAILABLE_TYPES.has(requested)) return requested;
    if (DATA_BACKED_TYPES.has(requested) && (menuByType[requested]?.categories?.length ?? 0) > 0) return requested;
    return fallback;
}

export function readMenuSearch(search: string, section: string): string {
    if (section !== 'delivery') return '';
    return new URLSearchParams(search).get('search')?.trim() || '';
}

export function readFulfillmentPreference(search: string): FulfillmentType {
    return new URLSearchParams(search).get('fulfillment') === 'pickup' ? 'pickup' : 'delivery';
}

function normalizeCategoryName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('ru-RU');
}

export function resolveMenuCategoryDeepLink(
    search: string,
    section: string,
    categories: MenuCategory[],
): string {
    if (section !== 'delivery') return '';
    const requestedName = new URLSearchParams(search).get('category');
    if (!requestedName) return '';

    const categoryName = DELIVERY_CATEGORY_ALIASES[requestedName.trim().toLowerCase()] || requestedName;
    const normalizedRequest = normalizeCategoryName(categoryName);
    const category = categories.find(({ name }) => (
        normalizeCategoryName(String(name || '')) === normalizedRequest
    ));
    return category ? String(category.id) : '';
}
