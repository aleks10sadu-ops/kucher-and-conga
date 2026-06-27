import { NextRequest, NextResponse } from 'next/server';
import { invalidateMenuCache } from '@/lib/iiko';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.IIKO_ADMIN_SECRET || secret !== process.env.IIKO_ADMIN_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  invalidateMenuCache();
  return NextResponse.json({ ok: true });
}
