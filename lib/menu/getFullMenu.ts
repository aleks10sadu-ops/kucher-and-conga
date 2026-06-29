import { getIikoMenu } from '@/lib/iiko';
import { barMenuData } from '@/app/data/barMenuData';
import { wineMenuData } from '@/app/data/wineMenuData';
import { kidsMenuData } from '@/app/data/kidsMenuData';
import { promotionsData } from '@/app/data/promotionsData';
import { assembleFullMenu } from './fullMenu.core';
import type { MenuCategory } from '@/types/index';

export async function getFullMenu(): Promise<Record<string, { categories: MenuCategory[] }>> {
  let iiko: Record<string, { categories: MenuCategory[] }> = {};
  try {
    iiko = await getIikoMenu();
  } catch (e) {
    console.error('getFullMenu: iiko fetch failed, serving static-only menu', e);
  }
  return assembleFullMenu(iiko, {
    bar: barMenuData as any,
    wine: wineMenuData as any,
    kids: kidsMenuData as any,
    promotions: promotionsData as any,
  });
}
