import { NextRequest } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

const WIDTHS = new Set([16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200]);
const QUALITIES = new Set([60, 70, 75, 80, 85, 90]);
const MAX_BYTES = 10_000_000;
const PUBLIC_STORAGE = '/storage/v1/object/public/';
const PROXY = '/media/supabase/';
const BUCKETS = new Set(['dish-images', 'content-images']);

function sourceUrl(src: string, request: NextRequest): URL | null {
  try {
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const storageOrigin = configured ? new URL(configured).origin : null;
    let url = new URL(src, request.nextUrl.origin);

    if (src.startsWith('/') && !src.startsWith('//') && url.origin === request.nextUrl.origin) {
      if (url.pathname.startsWith(PROXY)) {
        if (!storageOrigin) return null;
        const path = url.pathname.slice(PROXY.length);
        if (/%2f|%5c/i.test(path)) return null;
        const parts = path.split('/').map(decodeURIComponent);
        if (parts.length < 2 || !BUCKETS.has(parts[0]) || parts.some((part) => !part || part === '.' || part === '..')) return null;
        url = new URL(`${PUBLIC_STORAGE}${parts.map(encodeURIComponent).join('/')}`, storageOrigin);
      } else if (!/\.(png|jpe?g|webp|avif)$/i.test(url.pathname)) {
        return null;
      }
    } else {
      if (url.protocol !== 'https:' || url.origin !== storageOrigin || !url.pathname.startsWith(PUBLIC_STORAGE)) return null;
      const [bucket, object] = url.pathname.slice(PUBLIC_STORAGE.length).split('/');
      if (!BUCKETS.has(bucket) || !object) return null;
    }

    if (url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  const width = Number(request.nextUrl.searchParams.get('w'));
    const quality = Number(request.nextUrl.searchParams.get('q'));
  const source = src && sourceUrl(src, request);
  if (!source || !WIDTHS.has(width) || !QUALITIES.has(quality)) return new Response('Invalid image', { status: 400 });

  try {
    if (source.hostname === 'localhost') source.hostname = '127.0.0.1';
    const upstream = await fetch(source, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) return new Response('Image source unavailable', { status: 502 });
    if (!/^image\/(jpeg|png|webp|avif)(?:;|$)/i.test(upstream.headers.get('content-type') || '')) {
      return new Response('Invalid image type', { status: 415 });
    }
    if (Number(upstream.headers.get('content-length')) > MAX_BYTES) return new Response('Image too large', { status: 413 });

    const reader = upstream.body?.getReader();
    if (!reader) return new Response('Image source unavailable', { status: 502 });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return new Response('Image too large', { status: 413 });
      }
      chunks.push(value);
    }

    const image = await sharp(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image source unavailable', { status: 502 });
  }
}
