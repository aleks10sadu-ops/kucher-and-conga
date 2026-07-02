import { describe, it, expect, beforeAll } from 'vitest';
import {
  isIikoImageUrl,
  iikoImageFilename,
  mirrorObjectName,
  mirroredPublicUrl,
  collectImageUrls,
} from './imageMirror';
import type { MenuCategory } from '../../types/index';

const IIKO_URL =
  'https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/kucher/18232/images/items/2A3BA8F8292A81CFA777ACBC1F5E8F93.PNG';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mmyfglktqvojwpycreko.supabase.co';
});

describe('isIikoImageUrl', () => {
  it('matches selstorage hosts', () => {
    expect(isIikoImageUrl(IIKO_URL)).toBe(true);
    expect(isIikoImageUrl('https://x.selstorage.ru/a.png')).toBe(true);
  });
  it('rejects others / nullish', () => {
    expect(isIikoImageUrl('https://mmyfglktqvojwpycreko.supabase.co/x.png')).toBe(false);
    expect(isIikoImageUrl('/local/wine.webp')).toBe(false);
    expect(isIikoImageUrl(null)).toBe(false);
    expect(isIikoImageUrl(undefined)).toBe(false);
    // не должен матчить домен, который лишь содержит подстроку
    expect(isIikoImageUrl('https://evilselstorage.ru.attacker.com/a.png')).toBe(false);
  });
});

describe('iikoImageFilename', () => {
  it('returns lowercased filename', () => {
    expect(iikoImageFilename(IIKO_URL)).toBe('2a3ba8f8292a81cfa777acbc1f5e8f93.png');
  });
  it('handles bad input', () => {
    expect(iikoImageFilename(null)).toBeNull();
    expect(iikoImageFilename('not a url')).toBeNull();
  });
});

describe('mirrorObjectName', () => {
  it('uses a .webp extension (transcoded on upload)', () => {
    expect(mirrorObjectName(IIKO_URL)).toBe('2a3ba8f8292a81cfa777acbc1f5e8f93.webp');
  });
  it('is null for bad input', () => {
    expect(mirrorObjectName('nope')).toBeNull();
  });
});

describe('mirroredPublicUrl', () => {
  it('builds a deterministic supabase public webp url', () => {
    expect(mirroredPublicUrl(IIKO_URL)).toBe(
      'https://mmyfglktqvojwpycreko.supabase.co/storage/v1/object/public/dish-images/iiko/2a3ba8f8292a81cfa777acbc1f5e8f93.webp',
    );
  });
  it('is null for non-derivable input', () => {
    expect(mirroredPublicUrl(null)).toBeNull();
  });
});

describe('collectImageUrls', () => {
  it('collects only iiko image urls from menu', () => {
    const menu: Record<string, { categories: MenuCategory[] }> = {
      main: {
        categories: [
          {
            id: 'c1',
            name: 'Cat',
            items: [
              { id: '1', name: 'A', description: '', price: 1, weight: null, image: IIKO_URL } as any,
              { id: '2', name: 'B', description: '', price: 1, weight: null, image: null } as any,
            ],
          },
        ],
      },
      wine: {
        categories: [
          {
            id: 'c2',
            name: 'Wine',
            items: [
              { id: '3', name: 'C', description: '', price: 1, weight: null, image: '/local/wine.webp' } as any,
            ],
          },
        ],
      },
    };
    expect(collectImageUrls(menu)).toEqual([IIKO_URL]);
  });
});
