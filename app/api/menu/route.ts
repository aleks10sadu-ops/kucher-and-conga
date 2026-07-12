import { NextResponse } from 'next/server';
import { getFullMenu } from '@/lib/menu/getFullMenu';

// Полное меню в JSON — для модалки предзаказа на странице брони.
// s-maxage=300: кешируется CDN/прокси, как ISR-страница меню.
export const dynamic = 'force-dynamic';

export async function GET() {
  const menu = await getFullMenu();
  return NextResponse.json(menu, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
