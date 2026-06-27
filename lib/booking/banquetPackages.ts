export interface BanquetPackage {
  id: string;
  venue: 'conga' | 'kucher';
  name: string;
  pricePerPerson: number;
  weightGrams: number;
}

// Соответствует содержимому BanquetMenuModal (Conga 7500/6000 ~1460 г, Кучер 5000 ~1480 г).
export const BANQUET_PACKAGES: BanquetPackage[] = [
  { id: 'conga-7500', venue: 'conga', name: 'Conga — банкет 7500 ₽/чел', pricePerPerson: 7500, weightGrams: 1460 },
  { id: 'conga-6000', venue: 'conga', name: 'Conga — банкет 6000 ₽/чел', pricePerPerson: 6000, weightGrams: 1460 },
  { id: 'kucher-5000', venue: 'kucher', name: 'Кучер — банкет 5000 ₽/чел', pricePerPerson: 5000, weightGrams: 1480 },
];

export function packagesForFilter(filter: 'conga' | 'all' | null): BanquetPackage[] {
  if (!filter) return [];
  if (filter === 'conga') return BANQUET_PACKAGES.filter((p) => p.venue === 'conga');
  return BANQUET_PACKAGES;
}
