import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { invalidateMenuCache, getIikoMenu } from '@/lib/iiko';
import { collectImageUrls, mirrorIikoImages } from '@/lib/iiko/imageMirror';

export const dynamic = 'force-dynamic';
// Зеркалирование тянет файлы с медленного Selectel — даём функции больше времени.
export const maxDuration = 60;

function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Ручной триггер (вебхук iiko / админ): заголовок x-iiko-secret == IIKO_ADMIN_SECRET
function manualAuthorized(req: NextRequest): boolean {
  return safeEqual(process.env.IIKO_ADMIN_SECRET, req.headers.get('x-iiko-secret'));
}

// Vercel Cron шлёт GET с заголовком Authorization: Bearer ${CRON_SECRET}
function cronAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return safeEqual(process.env.CRON_SECRET, token);
}

// Тюнинг сидинга (origin Selectel медленный/флапающий): ?budgetMs= и ?concurrency=.
// Параллелизм держим низким — параллельные медленные connect'ы к Selectel глушат
// друг друга по таймауту. ?full=1 — режим первичного заполнения.
function tune(req: NextRequest, defBudgetMs: number, defConcurrency: number) {
  const sp = req.nextUrl.searchParams;
  const num = (key: string, def: number, max: number) => {
    const v = parseInt(sp.get(key) || '', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, max) : def;
  };
  const full = sp.get('full') === '1';
  return {
    budgetMs: num('budgetMs', full ? 55_000 : defBudgetMs, 290_000),
    concurrency: num('concurrency', full ? 3 : defConcurrency, 8),
  };
}

async function runRevalidate(opts: { budgetMs: number; concurrency: number }) {
  invalidateMenuCache();
  revalidatePath('/menu'); // ISR-страница меню пересоберётся на ближайшем запросе
  try {
    const menu = await getIikoMenu();
    const urls = collectImageUrls(menu);
    return await mirrorIikoImages(urls, opts);
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

// Ручной вызов (вебхук iiko при изменении меню) — короткий бюджет, realtime.
export async function POST(req: NextRequest) {
  if (!manualAuthorized(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const mirror = await runRevalidate(tune(req, 8_000, 2));
  return NextResponse.json({ ok: true, mirror });
}

// Vercel Cron (GET) — плановый «догон» зеркалирования новых картинок.
// Бюджет 35 с: оставляем запас под холодный fetch меню iiko (~17 с) в пределах maxDuration.
// Ручной GET с x-iiko-secret тоже допустим.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req) && !manualAuthorized(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const mirror = await runRevalidate(tune(req, 35_000, 3));
  return NextResponse.json({ ok: true, mirror });
}
