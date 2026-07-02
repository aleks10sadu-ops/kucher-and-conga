export type Modifier = { group: string; option: string };

/**
 * Модификаторы для показа гостю/в заявке.
 * Служебная опция «Без хлеба» скрывается: если хлеб не выбран, строки нет.
 */
export function visibleModifiers(mods?: Modifier[]): Modifier[] {
  return (mods || []).filter((m) => m.option !== 'Без хлеба');
}
