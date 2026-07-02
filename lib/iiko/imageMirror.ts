// Зеркалирование картинок блюд iiko в Supabase Storage (быстрый origin + CDN).
//
// Зачем: iiko отдаёт фото как несжатые PNG ~2.7 МБ с медленного Selectel
// (~17 с на файл). Оптимизатор Next.js при ПЕРВОМ обращении всё равно тянет
// оригинал с Selectel — это риск таймаута и медленный первый показ. Зеркалируем
// файлы в Supabase Storage (bucket `dish-images`, папка `iiko/`) в фоне (на синке),
// а на чтении переписываем URL меню на быстрый Supabase-origin.
//
// Имя файла у iiko — это хэш контента (`<hash>.PNG`), поэтому путь в Storage
// детерминированный и идемпотентный: один файл = один объект, повторная заливка
// пропускается. Только сервер: модуль использует service-role ключ и НЕ должен
// импортироваться клиентским кодом.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MenuCategory } from '../../types/index';

const BUCKET = 'dish-images';
const FOLDER = 'iiko';

// ---------- Чистые помощники (юнит-тестируемые) ----------

/** Это URL картинки из хранилища iiko (Selectel)? */
export function isIikoImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith('.selstorage.ru');
  } catch {
    return false;
  }
}

/** Исходное имя файла из URL iiko: `<hash>.<ext>` в нижнем регистре. */
export function iikoImageFilename(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const name = new URL(url).pathname.split('/').pop() || '';
    return name ? name.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Имя объекта-зеркала в Storage: `<hash>.webp`. Картинки транскодируются в WebP
 * перед заливкой (iiko отдаёт несжатый PNG ~2.7 МБ, а bucket лимитирован 1 МБ).
 */
export function mirrorObjectName(url: string | null | undefined): string | null {
  const filename = iikoImageFilename(url);
  if (!filename) return null;
  return filename.replace(/\.[^.]+$/, '') + '.webp';
}

/** Публичный Supabase-URL зеркала для данного iiko-URL (детерминированный). */
export function mirroredPublicUrl(url: string | null | undefined): string | null {
  const name = mirrorObjectName(url);
  if (!name) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${FOLDER}/${name}`;
}

// ---------- Storage I/O ----------

// Ленивая загрузка: не тянем `../supabase/server` (и next/headers) на верхнем уровне,
// чтобы чистые помощники оставались импортируемыми в юнит-тестах.
async function adminOrNull(): Promise<SupabaseClient | null> {
  try {
    const { createSupabaseAdminClient } = await import('../supabase/server');
    return createSupabaseAdminClient();
  } catch {
    return null; // нет service-role ключа — тихо отключаемся
  }
}

/** Список уже зеркалированных имён файлов (одна папка `iiko/`, с пагинацией). */
async function listMirroredFilenames(admin: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .list(FOLDER, { limit: PAGE, offset });
    if (error || !data || data.length === 0) break;
    for (const f of data) if (f.name) set.add(f.name.toLowerCase());
    if (data.length < PAGE) break;
  }
  return set;
}

// ---------- Кэш набора зеркал для пути ЧТЕНИЯ ----------

const SET_TTL_MS = 5 * 60 * 1000;
let setCache: { set: Set<string>; expiresAt: number } | null = null;

async function getMirroredSet(): Promise<Set<string>> {
  const now = Date.now();
  if (setCache && setCache.expiresAt > now) return setCache.set;
  const admin = await adminOrNull();
  if (!admin) return new Set();
  try {
    const set = await listMirroredFilenames(admin);
    setCache = { set, expiresAt: now + SET_TTL_MS };
    return set;
  } catch {
    return setCache?.set ?? new Set();
  }
}

export function __resetMirrorSetCache(): void {
  setCache = null;
}

/**
 * Переписывает image-URL блюд на зеркало в Supabase, НО только для тех картинок,
 * что уже зеркалированы (иначе оставляем оригинальный iiko-URL как фолбэк).
 * Безопасно для статических меню (бар/вино): их URL не совпадут с набором зеркал.
 */
export async function rewriteMenuImagesToMirror(
  menu: Record<string, { categories: MenuCategory[] }>,
): Promise<Record<string, { categories: MenuCategory[] }>> {
  const mirrored = await getMirroredSet();
  if (mirrored.size === 0) return menu;

  const out: Record<string, { categories: MenuCategory[] }> = {};
  for (const [key, group] of Object.entries(menu)) {
    out[key] = {
      categories: group.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => {
          const name = mirrorObjectName(it.image);
          if (name && mirrored.has(name)) {
            return { ...it, image: mirroredPublicUrl(it.image)! };
          }
          return it;
        }),
      })),
    };
  }
  return out;
}

// ---------- Путь ЗАПИСИ: фоновое зеркалирование ----------

export interface MirrorResult {
  total: number;
  mirrored: number;
  skipped: number;
  failed: number;
  timedOut: boolean;
}

// Origin Selectel часто зависает на connect (как и хост iiko, см. client.ts).
// Ретраим сетевые сбои; HTTP 4xx/5xx — это ответ сервера, не ретраим.
async function fetchImageWithRetry(url: string, attempts = 3): Promise<Buffer | null> {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (!res.ok) return null; // реальный ответ сервера — не ретраим
      return Buffer.from(await res.arrayBuffer());
    } catch {
      if (i < attempts) await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
  return null;
}

async function mirrorOne(
  admin: SupabaseClient,
  url: string,
): Promise<'ok' | 'failed'> {
  const name = mirrorObjectName(url);
  if (!name) return 'failed';
  try {
    const original = await fetchImageWithRetry(url);
    if (!original) return 'failed';

    // Транскодируем в WebP (≤1280px, q80): iiko-PNG ~2.7 МБ → ~150–200 КБ,
    // помещается в лимит bucket (1 МБ) и даёт быстрый origin для оптимизатора.
    const { default: sharp } = await import('sharp');
    const webp = await sharp(original)
      .rotate()
      .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(`${FOLDER}/${name}`, webp, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
    // "already exists" — гонка двух синков, это успех
    if (error && !/exist/i.test(error.message)) return 'failed';
    return 'ok';
  } catch {
    return 'failed';
  }
}

/**
 * Зеркалирует переданные URL картинок в Supabase Storage.
 * Идемпотентно (пропускает уже залитые). Ограничено по времени (budgetMs),
 * чтобы укладываться в лимит serverless-функции; недосделанное доберётся
 * на следующем вызове (webhook iiko или повторный запуск).
 */
export async function mirrorIikoImages(
  urls: string[],
  opts: { budgetMs?: number; concurrency?: number } = {},
): Promise<MirrorResult> {
  const budgetMs = opts.budgetMs ?? 8_000;
  const concurrency = opts.concurrency ?? 4;
  const startedAt = Date.now();

  const admin = await adminOrNull();
  const uniq = Array.from(new Set(urls.filter(isIikoImageUrl)));
  const result: MirrorResult = {
    total: uniq.length,
    mirrored: 0,
    skipped: 0,
    failed: 0,
    timedOut: false,
  };
  if (!admin) {
    result.failed = uniq.length;
    return result;
  }

  let existing: Set<string>;
  try {
    existing = await listMirroredFilenames(admin);
  } catch {
    existing = new Set();
  }

  const todo = uniq.filter((u) => {
    const name = mirrorObjectName(u);
    if (name && existing.has(name)) {
      result.skipped++;
      return false;
    }
    return true;
  });

  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      if (Date.now() - startedAt > budgetMs) {
        result.timedOut = true;
        return;
      }
      const url = todo[cursor++];
      const r = await mirrorOne(admin!, url);
      if (r === 'ok') result.mirrored++;
      else result.failed++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));

  if (result.mirrored > 0) __resetMirrorSetCache(); // обновить кэш чтения
  return result;
}

/** Достаёт все URL картинок блюд из собранного меню (для зеркалирования). */
export function collectImageUrls(menu: Record<string, { categories: MenuCategory[] }>): string[] {
  const urls: string[] = [];
  for (const group of Object.values(menu)) {
    for (const cat of group.categories) {
      for (const it of cat.items) {
        if (it.image && isIikoImageUrl(it.image)) urls.push(it.image);
      }
    }
  }
  return urls;
}
