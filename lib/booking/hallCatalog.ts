import type { BanquetPackageId } from './banquetPackages';
import type { BookingType, HallGroup } from './rules';
import type { Hall } from '../halls/halls-data';
import { russianPublicText } from '../content/russianPublicText';

export type BookingHall = Omit<Hall, 'id'> & {
  key: string;
  crmHallId: string | null;
  sourceHallId: string;
  editorAccess: 'editable' | 'view-only';
  group: HallGroup;
  defaultBookingType?: 'banquet';
  allowedBookingTypes: readonly BookingType[];
  minimumOrder: number | null;
  banquetMenus: readonly BanquetPackageId[];
  detailSlug: string | null;
};

const EXACT_BANQUET_HALLS = [
  { key: 'emerald', name: 'Изумрудный зал', capacity: 30, minimumOrder: 70000, detailSlug: 'izumrudnyj-zal', image: '/halls/izumrudnyj-zal.webp' },
  { key: 'ruby', name: 'Рубиновый зал', capacity: 18, minimumOrder: 45000, detailSlug: 'rubinovyj-zal', image: '/halls/rubin.webp' },
  { key: 'chocolate', name: 'Шоколадный зал', capacity: 30, minimumOrder: 70000, detailSlug: 'shokoladnyj-zal', image: '/halls/shokoladnyj-zal.webp' },
] as const;

const ALL_MENUS = ['conga-7500', 'conga-6000', 'kucher-5000'] as const satisfies readonly BanquetPackageId[];
const CONGA_MENUS = ['conga-7500', 'conga-6000'] as const satisfies readonly BanquetPackageId[];
const STANDARD_BOOKING_TYPES = ['onsite', 'preorder', 'banquet'] as const satisfies readonly BookingType[];
const BANQUET_BOOKING_TYPES = ['preorder', 'banquet'] as const satisfies readonly BookingType[];

const HALL_KEY_BY_NAME: Record<string, string> = {
  'Конга': 'conga',
  'Морской зал': 'marine',
  'Барный зал': 'bar',
  'Веранда (Кучер)': 'veranda-kucher',
  'Летняя веранда': 'summer-veranda',
  'Беседки (Кучер)': 'gazebos-kucher',
  'Изумрудный зал': 'emerald',
  'Рубиновый зал': 'ruby',
  'Шоколадный зал': 'chocolate',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bookingHallKeyForName(name: string): string | null {
  return HALL_KEY_BY_NAME[russianPublicText(name)] ?? null;
}

export function isExactBanquetHall(hall: BookingHall | null | undefined): boolean {
  return hall?.key === 'emerald' || hall?.key === 'ruby' || hall?.key === 'chocolate';
}

export function isBookingHallEditable(hall: BookingHall | null | undefined): boolean {
  return hall?.editorAccess === 'editable';
}

export function bookingHallForLegacyEditor(hall: BookingHall | null | undefined): Hall | null {
  if (!hall || !isBookingHallEditable(hall)) return null;
  return {
    id: hall.crmHallId ?? hall.sourceHallId,
    name: hall.name,
    capacity: hall.capacity,
    description: hall.description,
    image: hall.image,
    gallery: hall.gallery,
    dbId: hall.dbId,
  };
}

export function bookingHallByKey(halls: readonly BookingHall[], key: string | null): BookingHall | null {
  return halls.find((hall) => hall.key === key) ?? null;
}

export function banquetFilterForHall(hall: BookingHall | null): 'conga' | 'all' | null {
  if (!hall) return null;
  return hall.key === 'conga' ? 'conga' : 'all';
}

function hallGroupForKey(key: string): HallGroup {
  if (key === 'conga') return 'conga';
  if (key === 'gazebos-kucher' || key === 'emerald' || key === 'ruby' || key === 'chocolate') return 'other';
  return 'kucher';
}

function crmHallIdFor(sourceHallId: string): string | null {
  return UUID_PATTERN.test(sourceHallId) ? sourceHallId : null;
}

function standardBookingHall(hall: Hall, key: string): BookingHall {
  const { id: sourceHallId, ...hallDetails } = hall;
  return {
    ...hallDetails,
    name: russianPublicText(hallDetails.name),
    key,
    sourceHallId,
    crmHallId: crmHallIdFor(sourceHallId),
    editorAccess: 'editable',
    group: hallGroupForKey(key),
    allowedBookingTypes: STANDARD_BOOKING_TYPES,
    minimumOrder: null,
    banquetMenus: key === 'conga' ? CONGA_MENUS : ALL_MENUS,
    detailSlug: null,
  };
}

export function normalizeBookingHalls(halls: readonly Hall[]): BookingHall[] {
  const genericBanquetHall = halls.find((hall) => hall.name.trim().toLowerCase() === 'банкетные залы');
  const exactRows = new Map<string, Hall>();

  for (const hall of halls) {
    const key = bookingHallKeyForName(hall.name.trim());
    if (key && EXACT_BANQUET_HALLS.some((definition) => definition.key === key) && !exactRows.has(key)) {
      exactRows.set(key, hall);
    }
  }

  const seenStandardKeys = new Set<string>();
  const standardHalls = halls.flatMap((hall) => {
    if (hall === genericBanquetHall) return [];
    const key = bookingHallKeyForName(hall.name.trim());
    if (!key || EXACT_BANQUET_HALLS.some((definition) => definition.key === key) || seenStandardKeys.has(key)) {
      return [];
    }
    seenStandardKeys.add(key);
    return [standardBookingHall(hall, key)];
  });

  const exactHalls = EXACT_BANQUET_HALLS.flatMap((exactHall) => {
    const legacyExactHall = exactRows.get(exactHall.key);
    const contentSource = legacyExactHall ?? genericBanquetHall;
    const identitySource = genericBanquetHall ?? legacyExactHall;
    if (!contentSource || !identitySource) return [];

    const { id: _contentSourceId, ...hallDetails } = contentSource;
    return [{
      ...hallDetails,
      ...exactHall,
      sourceHallId: identitySource.id,
      crmHallId: crmHallIdFor(identitySource.id),
      editorAccess: 'view-only' as const,
      group: 'other' as const,
      defaultBookingType: 'banquet' as const,
      allowedBookingTypes: BANQUET_BOOKING_TYPES,
      banquetMenus: ALL_MENUS,
    }];
  });

  return [...standardHalls, ...exactHalls];
}
