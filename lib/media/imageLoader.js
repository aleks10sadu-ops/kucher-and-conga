'use client';

export default function imageLoader({ src, width, quality }) {
  if (!src.startsWith('/') || src.startsWith('//')) {
    try {
      const url = new URL(src);
      const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
      if (url.origin !== origin || !url.pathname.startsWith('/storage/v1/object/public/')) return src;
    } catch {
      return src;
    }
  }
  if (/\.(svg|gif)(?:\?|$)/i.test(src)) return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
  return `/media/optimized?src=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}
