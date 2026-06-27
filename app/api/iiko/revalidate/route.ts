import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { invalidateMenuCache } from '@/lib/iiko';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.IIKO_ADMIN_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const providedSecret = req.headers.get('x-iiko-secret');
  if (!providedSecret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const expectedBuf = Buffer.from(expectedSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  invalidateMenuCache();
  return NextResponse.json({ ok: true });
}
