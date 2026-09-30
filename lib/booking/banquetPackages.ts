export type BanquetPackageId = 'conga-7500' | 'conga-6000' | 'kucher-5000';

export type BanquetSaladId =
  | 'caesar-shrimp'
  | 'caesar-chicken'
  | 'kucher'
  | 'olivier-red-fish'
  | 'olivier-beef'
  | 'duck-fruit-chutney';

export const BANQUET_MENU_BOOKING_CTA = 'Выбрать банкетное меню и перейти к бронированию';

export type BanquetSalad = {
  id: BanquetSaladId;
  name: string;
  description?: string;
  grams: number;
};

export interface BanquetPackage {
  id: BanquetPackageId;
  venue: 'conga' | 'kucher';
  name: string;
  pricePerPerson: number;
  weightGrams: number;
  requiredSalads: number;
  salads: readonly BanquetSalad[];
}

const BANQUET_SALADS: Record<BanquetSaladId, BanquetSalad> = {
  'caesar-shrimp': {
    id: 'caesar-shrimp',
    name: 'Цезарь с креветками',
    description: 'Микс-салат, креветки, Пармезан, домашние чипсы, соус «Цезарь»',
    grams: 60,
  },
  'caesar-chicken': {
    id: 'caesar-chicken',
    name: 'Цезарь с курицей',
    description: 'Микс-салат, курица, Пармезан, домашние чипсы, соус «Цезарь»',
    grams: 60,
  },
  kucher: {
    id: 'kucher',
    name: 'Кучер',
    description: 'Свинина, говядина, шампиньоны, сладкий перец, черри, Романо, Пармезан',
    grams: 60,
  },
  'olivier-red-fish': {
    id: 'olivier-red-fish',
    name: 'Оливье с красной рыбой',
    description: 'Красная рыба, горошек, картофель, морковь, яйцо, огурцы',
    grams: 60,
  },
  'olivier-beef': {
    id: 'olivier-beef',
    name: 'Оливье с говядиной',
    description: 'Говядина, горошек, картофель, морковь, яйцо, огурцы',
    grams: 60,
  },
  'duck-fruit-chutney': {
    id: 'duck-fruit-chutney',
    name: 'С уткой и фруктовым чатни',
    description: 'Утиное филе, яблочно-грушевый чатни, клюквенный соус, Пармезан, микс-салат, черри, гранатовый лук',
    grams: 60,
  },
};

const conga7500Salads = [
  BANQUET_SALADS['caesar-shrimp'],
  BANQUET_SALADS['caesar-chicken'],
  BANQUET_SALADS.kucher,
  BANQUET_SALADS['olivier-beef'],
  BANQUET_SALADS['olivier-red-fish'],
  BANQUET_SALADS['duck-fruit-chutney'],
];
const conga6000Salads = [
  BANQUET_SALADS['caesar-shrimp'],
  BANQUET_SALADS['caesar-chicken'],
  BANQUET_SALADS.kucher,
  BANQUET_SALADS['olivier-red-fish'],
  BANQUET_SALADS['olivier-beef'],
  BANQUET_SALADS['duck-fruit-chutney'],
];
const kucherSalads = conga6000Salads.filter((salad) => salad.id !== 'duck-fruit-chutney');

// Соответствует содержимому BanquetMenuModal (Конга 7500/6000 ~1460 г, Кучер 5000 ~1480 г).
export const BANQUET_PACKAGES: BanquetPackage[] = [
  {
    id: 'conga-7500',
    venue: 'conga',
    name: 'Конга — банкетное меню 7500 ₽/чел',
    pricePerPerson: 7500,
    weightGrams: 1460,
    requiredSalads: 4,
    salads: conga7500Salads,
  },
  {
    id: 'conga-6000',
    venue: 'conga',
    name: 'Конга — банкетное меню 6000 ₽/чел',
    pricePerPerson: 6000,
    weightGrams: 1460,
    requiredSalads: 3,
    salads: conga6000Salads,
  },
  {
    id: 'kucher-5000',
    venue: 'kucher',
    name: 'Кучер — банкетное меню 5000 ₽/чел',
    pricePerPerson: 5000,
    weightGrams: 1480,
    requiredSalads: 3,
    salads: kucherSalads,
  },
];

export function getBanquetPackage(id: string | null | undefined): BanquetPackage | null {
  return BANQUET_PACKAGES.find((item) => item.id === id) ?? null;
}

export function normalizeBanquetSelection(
  packageId: string | null | undefined,
  saladIds: readonly string[],
): { packageId: BanquetPackageId | null; saladIds: BanquetSaladId[] } {
  const menu = getBanquetPackage(packageId);
  if (!menu) return { packageId: null, saladIds: [] };
  const allowed = new Set(menu.salads.map((salad) => salad.id));
  const unique = Array.from(new Set(saladIds)).filter(
    (id): id is BanquetSaladId => allowed.has(id as BanquetSaladId),
  );
  return { packageId: menu.id, saladIds: unique.slice(0, menu.requiredSalads) };
}

export function isBanquetSelectionComplete(packageId: string | null, saladIds: readonly string[]): boolean {
  const menu = getBanquetPackage(packageId);
  const normalized = normalizeBanquetSelection(packageId, saladIds);
  return Boolean(menu && normalized.saladIds.length === menu.requiredSalads);
}

export function banquetSaladNames(packageId: string | null, saladIds: readonly string[]): string[] {
  const menu = getBanquetPackage(packageId);
  if (!menu) return [];
  const byId = new Map(menu.salads.map((salad) => [salad.id, salad.name]));
  return normalizeBanquetSelection(packageId, saladIds).saladIds.map((id) => byId.get(id)!);
}

export function packagesForFilter(filter: 'conga' | 'all' | null): BanquetPackage[] {
  if (!filter) return [];
  if (filter === 'conga') return BANQUET_PACKAGES.filter((p) => p.venue === 'conga');
  return BANQUET_PACKAGES;
}

/**
 * Returns true iff the given packageId is a valid package permitted by hallFilter.
 * - null hallFilter → always false (no hall selected / hall doesn't support banquets)
 * - 'conga' filter → only packages with venue 'conga' are allowed
 * - 'all' filter → any package is allowed
 */
export function isBanquetPackageAllowed(
  hallFilter: 'conga' | 'all' | null,
  packageId: string | null | undefined,
): boolean {
  if (!hallFilter || !packageId) return false;
  const pkg = BANQUET_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return false;
  if (hallFilter === 'conga') return pkg.venue === 'conga';
  return true; // 'all'
}
