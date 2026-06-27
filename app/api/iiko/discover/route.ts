import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/iiko/auth';
import { iikoPost } from '@/lib/iiko/client';
import { getIikoConfig } from '@/lib/iiko/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.IIKO_ADMIN_SECRET || secret !== process.env.IIKO_ADMIN_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const { organizationId } = getIikoConfig();
    const token = await getToken();
    const orgs = await iikoPost('/api/1/organizations', {}, token);
    const menus = await iikoPost('/api/2/menu', { organizationId }, token);
    const terminals = await iikoPost('/api/1/terminal_groups', { organizationIds: [organizationId] }, token);
    return NextResponse.json({ organizations: orgs, externalMenus: menus, terminalGroups: terminals });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
