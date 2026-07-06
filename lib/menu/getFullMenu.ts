import { getIikoMenu } from '@/lib/iiko';
import { rewriteMenuImagesToMirror } from '@/lib/iiko/imageMirror';
import { assembleFullMenu } from './fullMenu.core';
import type { MenuCategory } from '@/types/index';

export async function getFullMenu(): Promise<Record<string, { categories: MenuCategory[] }>> {
  let iiko: Record<string, { categories: MenuCategory[] }> = {};
  try {
    iiko = await getIikoMenu();
  } catch (e) {
    console.error('getFullMenu: iiko fetch failed, serving static-only menu', e);
  }
  const assembled = assembleFullMenu(iiko);
  // Переписываем URL картинок блюд на зеркало в Supabase Storage (если уже залиты).
  // Не бросает: при отсутствии зеркал/ключа возвращает меню без изменений.
  try {
    return await rewriteMenuImagesToMirror(assembled);
  } catch (e) {
    console.error('getFullMenu: image mirror rewrite failed, serving original URLs', e);
    return assembled;
  }
}
