import { readFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { afterEach, expect, it, vi } from 'vitest';
import imageLoader from '../../../lib/media/imageLoader';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('serves a responsive WebP without the Vercel image endpoint', async () => {
  const original = await readFile('public/hero-image.webp');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(original), {
    headers: { 'content-type': 'image/webp', 'content-length': String(original.length) },
  })));

  const path = imageLoader({ src: '/hero-image.webp', width: 384, quality: 75 });
  expect(path).toContain('/media/optimized?');
  expect(path).not.toContain('/_next/image');
  const response = await GET(new NextRequest(new URL(path, 'http://localhost:3000')));
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/webp');
  expect(response.headers.get('cache-control')).toContain('s-maxage=31536000');
  const result = Buffer.from(await response.arrayBuffer());
  expect((await sharp(result).metadata()).width).toBe(384);
  expect(result.length).toBeLessThan(original.length);

  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://images.supabase.co');
  const remotePath = imageLoader({ src: '/media/supabase/dish-images/iiko/dish.webp', width: 256, quality: 60 });
  const remote = await GET(new NextRequest(new URL(remotePath, 'http://localhost:3000')));
  expect(remote.status).toBe(200);
  expect(vi.mocked(fetch).mock.calls[1][0].toString()).toBe(
    'https://images.supabase.co/storage/v1/object/public/dish-images/iiko/dish.webp',
  );

  const blocked = await GET(new NextRequest('http://localhost:3000/media/optimized?src=https%3A%2F%2Fexample.com%2Fa.jpg&w=384&q=75'));
  expect(blocked.status).toBe(400);
  const wrongBucket = imageLoader({ src: 'https://images.supabase.co/storage/v1/object/public/other/a.jpg', width: 384, quality: 75 });
  expect((await GET(new NextRequest(new URL(wrongBucket, 'http://localhost:3000')))).status).toBe(400);
  expect(fetch).toHaveBeenCalledTimes(2);
});
