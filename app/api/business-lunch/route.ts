import { NextResponse } from 'next/server';
import { getIikoMenu } from '@/lib/iiko';
import { hasDirectNamesSource } from '@/lib/iiko/serverNames';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const menu = await getIikoMenu({ requireCurrentNames: true });
    return NextResponse.json(menu.business ?? { categories: [] }, { headers: {
      ...headers,
      'X-Menu-Names-Source': hasDirectNamesSource() ? 'iiko-server' : 'iiko-cloud',
    } });
  } catch {
    // A failure must not replace the browser's last good menu with an empty fallback.
    return NextResponse.json({ error: 'Menu temporarily unavailable' }, { status: 503, headers });
  }
}
