// Структурированные поля адреса доставки (для iiko и для человека).
export interface AddressExtra {
  house?: string | null;
  building?: string | null;
  entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
  intercom?: string | null;
}

// Человекочитаемая строка «дом 28, корп. 2, подъезд 1, этаж 5, кв. 12, домофон 45».
export function composeAddressDetails(a: AddressExtra): string {
  const p: string[] = [];
  if (a.house?.trim()) p.push(`дом ${a.house.trim()}`);
  if (a.building?.trim()) p.push(`корп. ${a.building.trim()}`);
  if (a.entrance?.trim()) p.push(`подъезд ${a.entrance.trim()}`);
  if (a.floor?.trim()) p.push(`этаж ${a.floor.trim()}`);
  if (a.apartment?.trim()) p.push(`кв. ${a.apartment.trim()}`);
  if (a.intercom?.trim()) p.push(`домофон ${a.intercom.trim()}`);
  return p.join(', ');
}
