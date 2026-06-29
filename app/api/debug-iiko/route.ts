import { NextResponse } from 'next/server';
import { getIikoMenu } from '@/lib/iiko';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ВРЕМЕННЫЙ диагностический роут: проверяет доступность iiko с Vercel.
// Не отдаёт секреты — только наличие переменных (boolean) и результат запроса.
export async function GET() {
  const env = {
    IIKO_API_LOGIN: !!process.env.IIKO_API_LOGIN,
    IIKO_ORGANIZATION_ID: !!process.env.IIKO_ORGANIZATION_ID,
    IIKO_EXTERNAL_MENU_ID: !!process.env.IIKO_EXTERNAL_MENU_ID,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_CRM_SUPABASE_URL: !!process.env.NEXT_PUBLIC_CRM_SUPABASE_URL,
    region: process.env.VERCEL_REGION || null,
  };

  const start = Date.now();
  try {
    const iiko = await getIikoMenu();
    const mainCats = iiko.main?.categories || [];
    const mainItems = mainCats.reduce((s, c) => s + (c.items?.length || 0), 0);
    const withMods = mainCats.reduce(
      (s, c) => s + (c.items || []).filter((it: any) => it.modifierGroups?.length).length,
      0,
    );
    return NextResponse.json({
      ok: true,
      ms: Date.now() - start,
      env,
      mainCategories: mainCats.length,
      mainItems,
      dishesWithModifiers: withMods,
      businessSets: (iiko.business?.categories || []).reduce((s, c) => s + (c.items?.length || 0), 0),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      ms: Date.now() - start,
      env,
      errorName: e?.name || null,
      errorMessage: String(e?.message || e).slice(0, 300),
      errorCause: String(e?.cause?.code || e?.cause || '').slice(0, 200),
    });
  }
}
