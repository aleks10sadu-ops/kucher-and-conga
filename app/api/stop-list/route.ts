import { NextResponse } from 'next/server';
import { getStopListProductIds } from '@/lib/iiko/stopList';

// Актуальный стоп-лист для клиентского UI (меню, предзаказ).
// s-maxage=60: кешируется CDN и nginx-прокси — свежесть ~минута, iiko не нагружаем.
export const dynamic = 'force-dynamic';

export async function GET() {
  const ids = await getStopListProductIds();
  return NextResponse.json(
    { productIds: Array.from(ids) },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
