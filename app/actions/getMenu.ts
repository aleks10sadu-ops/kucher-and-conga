'use server';

import { getIikoMenu } from '@/lib/iiko';

export async function getMenuData() {
  try {
    return await getIikoMenu();
  } catch (error) {
    console.error('Server Action getMenuData (iiko) error:', error);
    throw error;
  }
}
