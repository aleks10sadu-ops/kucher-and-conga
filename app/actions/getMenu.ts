'use server';

import { getFullMenu } from '@/lib/menu/getFullMenu';

export async function getMenuData() {
  try {
    return await getFullMenu();
  } catch (error) {
    console.error('Server Action getMenuData (full menu) error:', error);
    throw error;
  }
}
