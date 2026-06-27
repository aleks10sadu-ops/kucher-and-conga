# Интеграция меню iiko — Фаза 1A: карточки блюд Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать iiko единственным источником меню и показать карточки блюд (картинка, название, описание, цена, КБЖУ на 100 г) по 18 категориям на главной и на `/menu`.

**Architecture:** Серверный модуль `lib/iiko/` авторизуется в iiko Cloud API, тянет внешнее меню «Яндекс» (`/api/2/menu/by_id`), кэширует токен (~55 мин) и меню (5 мин) в памяти модуля со stale-fallback, и чистой функцией `mapExternalMenu` приводит ответ к формату `{ main: { categories } }`, который уже потребляют `getMenuData`/`EnhancedMenuSection`. Все вызовы — только на сервере.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 18, vitest (новый, для юнит-тестов чистой логики), нативный `fetch`.

## Global Constraints

- Все обращения к iiko — только на сервере (Server Actions / Route Handlers / серверные модули). Ключ и токен на клиент не попадают.
- Секреты только в env (`.env*.local` уже в `.gitignore`); в код не хардкодить.
- Базовый URL iiko: `https://api-ru.iiko.services`.
- Организация: `IIKO_ORGANIZATION_ID = 2418cf7b-1870-4e84-a181-4afc3d2d2506` («Кучер»).
- Внешнее меню: `IIKO_EXTERNAL_MENU_ID = 79802` («Яндекс»).
- Цена — целое число рублей из `itemSizes[0].prices[0].price`. КБЖУ — `nutritionPerHundredGrams` как есть (на 100 г), без пересчёта.
- Формат данных меню для UI не менять: `Record<slugString, { categories: MenuCategory[] }>`, дефолтный slug — `main`.
- В `lib/iiko/*` использовать относительные импорты (без алиаса `@/`), чтобы vitest работал без доп. плагинов.

---

### Task 1: Тест-раннер + конфиг iiko + типы

**Files:**
- Modify: `package.json` (devDeps + scripts)
- Create: `vitest.config.ts`
- Create: `lib/iiko/types.ts`
- Create: `lib/iiko/config.ts`
- Create: `lib/iiko/config.test.ts`
- Modify: `.env.local` (добавить переменные iiko)

**Interfaces:**
- Produces:
  - `getIikoConfig(): IikoConfig` где `IikoConfig = { apiLogin, organizationId, externalMenuId, baseUrl }` — бросает `Error`, если не заданы `IIKO_API_LOGIN` / `IIKO_ORGANIZATION_ID` / `IIKO_EXTERNAL_MENU_ID`.
  - Типы сырого ответа iiko: `IikoExternalMenu`, `IikoCategory`, `IikoItem`, `IikoItemSize`, `IikoNutrition`, `IikoPrice`.

- [ ] **Step 1: Установить vitest**

Run:
```bash
cd /c/Users/potyl/Projects/Kongotest && npm install -D vitest@^2
```
Expected: vitest добавлен в `devDependencies`. Если npm-реестр недоступен из РФ — повторить через корпоративный proxy/VPN; vitest нужен только для локальных тестов и в прод-сборку не входит.

- [ ] **Step 2: Добавить скрипты в `package.json`**

В блок `"scripts"` добавить:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Создать `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Создать `lib/iiko/types.ts`**

```ts
// Минимально необходимые поля сырого ответа iiko Cloud API (/api/2/menu/by_id).

export interface IikoNutrition {
  fats: number | null;
  proteins: number | null;
  carbs: number | null;
  energy: number | null;
}

export interface IikoPrice {
  organizationId: string;
  price: number | null;
}

export interface IikoItemSize {
  sku?: string;
  sizeName?: string;
  portionWeightGrams?: number | null;
  prices?: IikoPrice[];
  buttonImageUrl?: string | null;
  nutritionPerHundredGrams?: IikoNutrition | null;
  itemModifierGroups?: unknown[];
}

export interface IikoItem {
  itemId: string;
  sku?: string;
  name: string;
  description?: string;
  isHidden?: boolean;
  type?: string;
  itemSizes?: IikoItemSize[];
}

export interface IikoCategory {
  id: string;
  name: string;
  items?: IikoItem[];
}

export interface IikoExternalMenu {
  id?: number | string;
  name?: string;
  itemCategories?: IikoCategory[];
}
```

- [ ] **Step 5: Написать падающий тест `lib/iiko/config.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getIikoConfig } from './config';

describe('getIikoConfig', () => {
  beforeEach(() => {
    delete process.env.IIKO_API_LOGIN;
    delete process.env.IIKO_ORGANIZATION_ID;
    delete process.env.IIKO_EXTERNAL_MENU_ID;
    delete process.env.IIKO_BASE_URL;
  });

  it('throws and names every missing variable', () => {
    expect(() => getIikoConfig()).toThrowError(
      /IIKO_API_LOGIN.*IIKO_ORGANIZATION_ID.*IIKO_EXTERNAL_MENU_ID/,
    );
  });

  it('returns config with default baseUrl when all set', () => {
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
    expect(getIikoConfig()).toEqual({
      apiLogin: 'login',
      organizationId: 'org',
      externalMenuId: '79802',
      baseUrl: 'https://api-ru.iiko.services',
    });
  });
});
```

- [ ] **Step 6: Запустить тест — убедиться, что падает**

Run: `npm test -- lib/iiko/config.test.ts`
Expected: FAIL — модуль `./config` не найден.

- [ ] **Step 7: Создать `lib/iiko/config.ts`**

```ts
export interface IikoConfig {
  apiLogin: string;
  organizationId: string;
  externalMenuId: string;
  baseUrl: string;
}

export function getIikoConfig(): IikoConfig {
  const apiLogin = process.env.IIKO_API_LOGIN;
  const organizationId = process.env.IIKO_ORGANIZATION_ID;
  const externalMenuId = process.env.IIKO_EXTERNAL_MENU_ID;

  const missing = (
    [
      ['IIKO_API_LOGIN', apiLogin],
      ['IIKO_ORGANIZATION_ID', organizationId],
      ['IIKO_EXTERNAL_MENU_ID', externalMenuId],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`iiko config: missing env ${missing.join(', ')}`);
  }

  return {
    apiLogin: apiLogin!,
    organizationId: organizationId!,
    externalMenuId: externalMenuId!,
    baseUrl: process.env.IIKO_BASE_URL || 'https://api-ru.iiko.services',
  };
}
```

- [ ] **Step 8: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/iiko/config.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 9: Добавить переменные в `.env.local`**

Дописать в конец `.env.local` (НЕ коммитится):
```
# iiko Cloud API
IIKO_API_LOGIN=c547814490384a059920ff297d86bc2a
IIKO_ORGANIZATION_ID=2418cf7b-1870-4e84-a181-4afc3d2d2506
IIKO_EXTERNAL_MENU_ID=79802
```
Эти же три переменные добавить в Vercel → Project → Settings → Environment Variables (Production + Preview). Ключ рекомендуется перевыпустить в iiko, так как он засветился в переписке.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/iiko/types.ts lib/iiko/config.ts lib/iiko/config.test.ts
git commit -m "feat(iiko): add config, raw types and vitest"
```

---

### Task 2: HTTP-клиент iiko + кэш токена

**Files:**
- Create: `lib/iiko/client.ts`
- Create: `lib/iiko/auth.ts`
- Create: `lib/iiko/auth.test.ts`

**Interfaces:**
- Consumes: `getIikoConfig` (Task 1).
- Produces:
  - `iikoPost<T>(path: string, body: unknown, token?: string): Promise<T>` — бросает `IikoError { status, body }` при не-2xx.
  - `getToken(forceRefresh?: boolean): Promise<string>` — кэш ~55 мин в памяти модуля.
  - `__resetTokenCache(): void` — сброс кэша для тестов.

- [ ] **Step 1: Создать `lib/iiko/client.ts`**

```ts
import { getIikoConfig } from './config';

export class IikoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'IikoError';
  }
}

export async function iikoPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const { baseUrl } = getIikoConfig();
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new IikoError(`iiko ${path} -> ${res.status}`, res.status, text.slice(0, 500));
  }
  return JSON.parse(text) as T;
}
```

- [ ] **Step 2: Написать падающий тест `lib/iiko/auth.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, __resetTokenCache } from './auth';

describe('getToken', () => {
  beforeEach(() => {
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
  });

  it('requests once and caches the token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => JSON.stringify({ token: 'T1' }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await getToken()).toBe('T1');
    expect(await getToken()).toBe('T1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-requests when forceRefresh is true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: 'T1' }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ token: 'T2' }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await getToken()).toBe('T1');
    expect(await getToken(true)).toBe('T2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `npm test -- lib/iiko/auth.test.ts`
Expected: FAIL — модуль `./auth` не найден.

- [ ] **Step 4: Создать `lib/iiko/auth.ts`**

```ts
import { iikoPost } from './client';
import { getIikoConfig } from './config';

interface TokenResponse {
  token: string;
}

const TTL_MS = 55 * 60 * 1000;
let cached: { token: string; expiresAt: number } | null = null;

export async function getToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.token;
  }
  const { apiLogin } = getIikoConfig();
  const data = await iikoPost<TokenResponse>('/api/1/access_token', { apiLogin });
  cached = { token: data.token, expiresAt: now + TTL_MS };
  return data.token;
}

export function __resetTokenCache(): void {
  cached = null;
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/iiko/auth.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add lib/iiko/client.ts lib/iiko/auth.ts lib/iiko/auth.test.ts
git commit -m "feat(iiko): http client and cached access token"
```

---

### Task 3: Чистый маппер `mapExternalMenu` (ядро)

**Files:**
- Modify: `types/index.ts` (добавить тип `Nutrition` и поля в `MenuItem`)
- Create: `lib/iiko/mapMenu.ts`
- Create: `lib/iiko/mapMenu.test.ts`

**Interfaces:**
- Consumes: типы из `lib/iiko/types.ts` (Task 1), `MenuCategory`/`MenuItem`/`Nutrition` из `types/index.ts`.
- Produces: `mapExternalMenu(raw: IikoExternalMenu): Record<string, { categories: MenuCategory[] }>` — всегда ключ `main`; пустые категории и блюда без цены/`isHidden` отброшены.

- [ ] **Step 1: Расширить `types/index.ts`**

Добавить тип `Nutrition` и поля `nutrition`/`sku` в `MenuItem`:
```ts
export type Nutrition = {
    calories: number | null; // ккал на 100 г (energy)
    proteins: number | null;
    fats: number | null;
    carbs: number | null;
    per: 'per100g';
};
```
В существующем `export type MenuItem = { ... }` добавить поля:
```ts
    sku?: string | null;
    nutrition?: Nutrition | null;
```

- [ ] **Step 2: Написать падающий тест `lib/iiko/mapMenu.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mapExternalMenu } from './mapMenu';
import type { IikoExternalMenu } from './types';

const raw: IikoExternalMenu = {
  itemCategories: [
    {
      id: 'cat-1',
      name: 'САЛАТЫ',
      items: [
        {
          itemId: 'i1',
          sku: '001',
          name: 'Цезарь',
          description: '  Классический  ',
          itemSizes: [
            {
              sku: '001',
              portionWeightGrams: 250,
              buttonImageUrl: 'http://img/1.png',
              prices: [{ organizationId: 'o', price: 450 }],
              nutritionPerHundredGrams: { fats: 10, proteins: 8, carbs: 5, energy: 150 },
            },
          ],
        },
        {
          itemId: 'i2',
          name: 'Скрытый',
          isHidden: true,
          itemSizes: [{ prices: [{ organizationId: 'o', price: 300 }] }],
        },
        {
          itemId: 'i3',
          name: 'Без цены',
          itemSizes: [{ prices: [{ organizationId: 'o', price: 0 }] }],
        },
      ],
    },
    {
      id: 'cat-2',
      name: 'СУПЫ',
      items: [
        {
          itemId: 'i4',
          name: 'Борщ',
          description: '',
          itemSizes: [
            {
              portionWeightGrams: 350,
              prices: [{ organizationId: 'o', price: 380 }],
              nutritionPerHundredGrams: { fats: null, proteins: null, carbs: null, energy: null },
            },
          ],
        },
      ],
    },
    { id: 'cat-empty', name: 'ПУСТО', items: [] },
  ],
};

describe('mapExternalMenu', () => {
  const result = mapExternalMenu(raw);
  const cats = result.main.categories;

  it('returns under main slug and drops empty categories', () => {
    expect(Object.keys(result)).toEqual(['main']);
    expect(cats.map((c) => c.name)).toEqual(['САЛАТЫ', 'СУПЫ']);
  });

  it('maps fields and trims description', () => {
    const cezar = cats[0].items.find((i) => i.id === 'i1')!;
    expect(cezar.name).toBe('Цезарь');
    expect(cezar.description).toBe('Классический');
    expect(cezar.price).toBe(450);
    expect(cezar.weight).toBe(250);
    expect(cezar.image).toBe('http://img/1.png');
    expect(cezar.nutrition).toEqual({
      calories: 150,
      proteins: 8,
      fats: 10,
      carbs: 5,
      per: 'per100g',
    });
  });

  it('filters hidden and zero-price items', () => {
    expect(cats[0].items.map((i) => i.id)).toEqual(['i1']);
  });

  it('returns null nutrition when all values are null', () => {
    const borsch = cats[1].items[0];
    expect(borsch.description).toBe('');
    expect(borsch.nutrition).toBeNull();
  });
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `npm test -- lib/iiko/mapMenu.test.ts`
Expected: FAIL — модуль `./mapMenu` не найден.

- [ ] **Step 4: Создать `lib/iiko/mapMenu.ts`**

```ts
import type { IikoExternalMenu, IikoItem, IikoItemSize, IikoNutrition } from './types';
import type { MenuCategory, MenuItem, Nutrition } from '../../types/index';

function pickSize(item: IikoItem): IikoItemSize | undefined {
  const sizes = item.itemSizes || [];
  return sizes.find((s) => (s.prices || []).some((p) => (p.price ?? 0) > 0)) || sizes[0];
}

function priceOf(size: IikoItemSize | undefined): number {
  return (size?.prices || []).map((p) => p.price ?? 0).find((p) => p > 0) ?? 0;
}

function toNutrition(n?: IikoNutrition | null): Nutrition | null {
  if (!n) return null;
  const { energy, proteins, fats, carbs } = n;
  if ([energy, proteins, fats, carbs].every((v) => v == null)) return null;
  return {
    calories: energy ?? null,
    proteins: proteins ?? null,
    fats: fats ?? null,
    carbs: carbs ?? null,
    per: 'per100g',
  };
}

export function mapExternalMenu(
  raw: IikoExternalMenu,
): Record<string, { categories: MenuCategory[] }> {
  const categories: MenuCategory[] = (raw.itemCategories || [])
    .map((cat) => {
      const items: MenuItem[] = (cat.items || [])
        .filter((it) => !it.isHidden)
        .map((it) => {
          const size = pickSize(it);
          const item: MenuItem = {
            id: it.itemId,
            sku: it.sku ?? null,
            name: it.name,
            description: it.description?.trim() || '',
            price: priceOf(size),
            weight: size?.portionWeightGrams ?? null,
            image: size?.buttonImageUrl ?? null,
            nutrition: toNutrition(size?.nutritionPerHundredGrams),
            categoryId: cat.id,
          };
          return item;
        })
        .filter((it) => (it.price ?? 0) > 0);

      const category: MenuCategory = { id: cat.id, name: cat.name, items };
      return category;
    })
    .filter((c) => c.items.length > 0);

  return { main: { categories } };
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/iiko/mapMenu.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/iiko/mapMenu.ts lib/iiko/mapMenu.test.ts
git commit -m "feat(iiko): pure external-menu mapper with nutrition"
```

---

### Task 4: Получение меню с кэшем + сборка модуля

**Files:**
- Create: `lib/iiko/menu.ts`
- Create: `lib/iiko/index.ts`
- Create: `lib/iiko/menu.test.ts`

**Interfaces:**
- Consumes: `iikoPost` (Task 2), `getToken` (Task 2), `getIikoConfig` (Task 1), `mapExternalMenu` (Task 3).
- Produces:
  - `fetchExternalMenu(): Promise<IikoExternalMenu>` — кэш 5 мин в памяти, stale-fallback при сбое, реавторизация при 401.
  - `invalidateMenuCache(): void`, `__resetMenuCache(): void` (тест).
  - `getIikoMenu(): Promise<Record<string, { categories: MenuCategory[] }>>`.
  - `getIikoMenuByType(slug?: string): Promise<MenuCategory[]>`.

- [ ] **Step 1: Создать `lib/iiko/menu.ts`**

```ts
import { iikoPost, IikoError } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';
import type { IikoExternalMenu } from './types';

const TTL_MS = 5 * 60 * 1000;
let cache: { data: IikoExternalMenu; expiresAt: number } | null = null;
let lastGood: IikoExternalMenu | null = null;

async function requestExternalMenu(): Promise<IikoExternalMenu> {
  const { organizationId, externalMenuId } = getIikoConfig();
  const body = { externalMenuId, organizationIds: [organizationId], language: 'ru' };
  try {
    const token = await getToken();
    return await iikoPost<IikoExternalMenu>('/api/2/menu/by_id', body, token);
  } catch (e) {
    if (e instanceof IikoError && e.status === 401) {
      const token = await getToken(true);
      return await iikoPost<IikoExternalMenu>('/api/2/menu/by_id', body, token);
    }
    throw e;
  }
}

export async function fetchExternalMenu(): Promise<IikoExternalMenu> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  try {
    const data = await requestExternalMenu();
    cache = { data, expiresAt: now + TTL_MS };
    lastGood = data;
    return data;
  } catch (e) {
    if (lastGood) return lastGood; // stale-while-error
    throw e;
  }
}

export function invalidateMenuCache(): void {
  cache = null;
}

export function __resetMenuCache(): void {
  cache = null;
  lastGood = null;
}
```

- [ ] **Step 2: Создать `lib/iiko/index.ts`**

```ts
import { fetchExternalMenu } from './menu';
import { mapExternalMenu } from './mapMenu';
import type { MenuCategory } from '../../types/index';

export { invalidateMenuCache } from './menu';

export async function getIikoMenu(): Promise<Record<string, { categories: MenuCategory[] }>> {
  const raw = await fetchExternalMenu();
  return mapExternalMenu(raw);
}

export async function getIikoMenuByType(slug = 'main'): Promise<MenuCategory[]> {
  const menu = await getIikoMenu();
  return menu[slug]?.categories || menu.main?.categories || [];
}
```

- [ ] **Step 3: Написать тест `lib/iiko/menu.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchExternalMenu, invalidateMenuCache, __resetMenuCache } from './menu';
import { __resetTokenCache } from './auth';

function ok(json: unknown) {
  return { ok: true, text: async () => JSON.stringify(json) };
}

describe('fetchExternalMenu', () => {
  beforeEach(() => {
    __resetMenuCache();
    __resetTokenCache();
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
  });

  it('authenticates then fetches and caches the menu', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' })) // access_token
      .mockResolvedValueOnce(ok({ itemCategories: [{ id: 'c', name: 'X', items: [] }] }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchExternalMenu();
    const second = await fetchExternalMenu(); // from cache, no new fetch
    expect(first.itemCategories?.[0].name).toBe('X');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves last good menu when a later refresh fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ token: 'T1' }))
      .mockResolvedValueOnce(ok({ itemCategories: [{ id: 'c', name: 'X', items: [] }] }))
      .mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const good = await fetchExternalMenu();
    expect(good.itemCategories?.[0].name).toBe('X');

    // Сбрасываем только TTL-кэш (lastGood остаётся); следующий запрос упадёт → отдаётся stale.
    invalidateMenuCache();
    const stale = await fetchExternalMenu();
    expect(stale.itemCategories?.[0].name).toBe('X');
  });
});
```

- [ ] **Step 4: Запустить тесты — все зелёные**

Run: `npm test`
Expected: PASS — все файлы (config, auth, mapMenu, menu).

- [ ] **Step 5: Commit**

```bash
git add lib/iiko/menu.ts lib/iiko/index.ts lib/iiko/menu.test.ts
git commit -m "feat(iiko): cached external menu fetch with stale fallback"
```

---

### Task 5: Переключить источники меню сайта на iiko

**Files:**
- Modify: `app/actions/getMenu.ts`
- Modify: `lib/menu/getMenuByType.ts`

**Interfaces:**
- Consumes: `getIikoMenu`, `getIikoMenuByType` (Task 4).
- Produces: `getMenuData()` теперь возвращает данные iiko в формате `Record<slug,{categories}>`; `getMenuByType(slug)` — массив `MenuCategory[]` из iiko.

- [ ] **Step 1: Переписать `app/actions/getMenu.ts`**

Полное содержимое файла:
```ts
'use server';

import { getIikoMenu } from '@/lib/iiko';

export async function getMenuData() {
  try {
    return await getIikoMenu();
  } catch (error) {
    console.error('Server Action getMenuData (iiko) error:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Переписать `lib/menu/getMenuByType.ts`**

Полное содержимое файла:
```ts
import { getIikoMenuByType } from '@/lib/iiko';
import { menuData } from '../../app/data/menu';
import { MenuCategory } from '@/types/index';

// iiko — единственный источник меню. Статика остаётся лишь как аварийный фолбэк,
// если iiko недоступен и кэша ещё нет.
export async function getMenuByType(menuTypeSlug: string = 'main'): Promise<MenuCategory[]> {
  try {
    const categories = await getIikoMenuByType(menuTypeSlug);
    if (categories.length > 0) return categories;
  } catch (error) {
    console.error('getMenuByType (iiko) error:', error);
  }
  return (menuData.categories || []) as MenuCategory[];
}
```

- [ ] **Step 3: Проверка сборки типов**

Run: `npx tsc --noEmit`
Expected: без ошибок в `app/actions/getMenu.ts` и `lib/menu/getMenuByType.ts` (предупреждения в несвязанных файлах игнорируем, если они были и до изменений).

- [ ] **Step 4: Ручная проверка главной страницы**

Run: `npm run dev`, открыть `http://localhost:3000`.
Expected: секция меню показывает блюда из iiko (18 категорий под дефолтным типом). Если локально `fetch` к `api-ru.iiko.services` таймаутит (особенность undici/IPv6 в Node на Windows) — проверить через Preview-деплой Vercel; там сеть до РФ-хоста работает. В этом случае задать env в Vercel и проверить на preview-URL.

- [ ] **Step 5: Commit**

```bash
git add app/actions/getMenu.ts lib/menu/getMenuByType.ts
git commit -m "feat(iiko): serve site menu from iiko instead of Supabase"
```

---

### Task 6: КБЖУ в карточке + страница `/menu` из iiko

**Files:**
- Modify: `app/components/MenuItem.tsx` (вывод КБЖУ)
- Modify: `app/menu/page.tsx` (источник iiko, 18 категорий, КБЖУ, без вкладок Кухня/Бар/Акции)

**Interfaces:**
- Consumes: `MenuItem.nutrition` (Task 3), `getMenuData()` (Task 5).

- [ ] **Step 1: Добавить вывод КБЖУ в `app/components/MenuItem.tsx`**

Сразу после блока с весом (`{item.weight && ( ... )}`, рядом со строкой 324–325) добавить:
```tsx
                                {item.nutrition && (
                                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-neutral-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                        {item.nutrition.calories != null && (
                                            <span>{Math.round(item.nutrition.calories)} ккал</span>
                                        )}
                                        {item.nutrition.proteins != null && (
                                            <span>Б {item.nutrition.proteins}</span>
                                        )}
                                        {item.nutrition.fats != null && (
                                            <span>Ж {item.nutrition.fats}</span>
                                        )}
                                        {item.nutrition.carbs != null && (
                                            <span>У {item.nutrition.carbs}</span>
                                        )}
                                        <span className="opacity-60">/ 100 г</span>
                                    </div>
                                )}
```

- [ ] **Step 2: Перевести `app/menu/page.tsx` на iiko и КБЖУ**

Заменить статические данные на данные из iiko и убрать вкладки Кухня/Бар/Акции. Внутри `MenuContent` заменить блок источника данных:

Удалить импорты статики и `useSearchParams`-логику вкладок; вместо `const categories = getCurrentData();` использовать состояние, загружаемое через server action:
```tsx
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        getMenuData()
            .then((data: any) => {
                if (!active) return;
                const cats = data?.main?.categories || [];
                setCategories(cats);
                if (cats.length > 0) setActiveCategory(cats[0].id);
            })
            .catch((e) => console.error('menu load error', e))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, []);
```
Добавить импорт в начало файла:
```tsx
import { getMenuData } from '../actions/getMenu';
```
Удалить вёрстку трёх кнопок вкладок (`🥗 Кухня` / `🍷 Бар` / `🎁 Акции`) — оставить только навигацию по категориям и сам список категорий (он уже строится из `categories`).

В карточке блюда (после блока веса `⚖️ {item.weight}`) добавить вывод КБЖУ:
```tsx
                                                {item.nutrition && (
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs md:text-sm text-neutral-500 mt-1">
                                                        {item.nutrition.calories != null && (
                                                            <span>{Math.round(item.nutrition.calories)} ккал</span>
                                                        )}
                                                        {item.nutrition.proteins != null && <span>Б {item.nutrition.proteins}</span>}
                                                        {item.nutrition.fats != null && <span>Ж {item.nutrition.fats}</span>}
                                                        {item.nutrition.carbs != null && <span>У {item.nutrition.carbs}</span>}
                                                        <span className="opacity-60">/ 100 г</span>
                                                    </div>
                                                )}
```
Для `item.weight` из iiko (число грамм) выводить как `⚖️ {item.weight} г`.

- [ ] **Step 3: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в изменённых файлах.

- [ ] **Step 4: Ручная проверка**

Run: `npm run dev`, открыть `/menu` и главную.
Expected: карточки показывают картинку, название, описание, цену и КБЖУ (… ккал / Б / Ж / У / 100 г); на `/menu` нет вкладок Кухня/Бар/Акции, есть навигация по 18 категориям iiko. (При локальном таймауте к iiko — проверка на Vercel preview.)

- [ ] **Step 5: Commit**

```bash
git add app/components/MenuItem.tsx app/menu/page.tsx
git commit -m "feat(iiko): show КБЖУ on cards and render /menu from iiko"
```

---

### Task 7: Сервисные роуты — discover и revalidate

**Files:**
- Create: `app/api/iiko/discover/route.ts`
- Create: `app/api/iiko/revalidate/route.ts`
- Modify: `.env.local` (добавить `IIKO_ADMIN_SECRET`)

**Interfaces:**
- Consumes: `getToken`, `iikoPost` (Task 2), `getIikoConfig` (Task 1), `invalidateMenuCache` (Task 4).

- [ ] **Step 1: Создать `app/api/iiko/discover/route.ts`**

```ts
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
```

- [ ] **Step 2: Создать `app/api/iiko/revalidate/route.ts`**

```ts
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
```

- [ ] **Step 3: Добавить секрет в `.env.local` и Vercel**

В `.env.local`:
```
IIKO_ADMIN_SECRET=<длинная-случайная-строка>
```
Ту же переменную добавить в Vercel.

- [ ] **Step 4: Ручная проверка discover**

Run: `npm run dev`, открыть `http://localhost:3000/api/iiko/discover?secret=<секрет>`.
Expected: JSON с организацией «Кучер», внешним меню «Яндекс» (79802) и списком терминальных групп (понадобятся в Фазе 2). Без секрета — 403.

- [ ] **Step 5: Commit**

```bash
git add app/api/iiko/discover/route.ts app/api/iiko/revalidate/route.ts
git commit -m "feat(iiko): add protected discover and cache-revalidate routes"
```

---

## Self-Review

**Spec coverage:**
- Конфиг/секреты/env → Task 1, Task 7 (`.env.local` + Vercel). ✓
- Модуль `lib/iiko/` (config, client, auth, menu, mapMenu, index, types) → Tasks 1–4. ✓
- Чистый маппер в формат `get_active_menu` + КБЖУ → Task 3. ✓
- Переключение `getMenuData`/`getMenuByType`/`/menu` на iiko → Tasks 5–6. ✓
- КБЖУ на 100 г в карточке → Tasks 3, 6. ✓
- Кэш токена ~55 мин / меню 5 мин + stale-fallback + 401-ретрай → Tasks 2, 4. ✓
- Упразднение вкладок Кухня/Бар/Акции, 18 категорий iiko → Task 6. ✓
- Discover + revalidate роуты → Task 7. ✓
- Тесты чистой логики/кэша → Tasks 1–4. ✓
- Вне scope (стоп-лист 1C, бизнес-ланч 1B, заказы Фаза 2) — не входят в этот план намеренно. ✓

**Placeholder scan:** код приведён полностью во всех шагах; плейсхолдеров `TODO/TBD` нет. ✓

**Type consistency:** `getIikoConfig`, `iikoPost`, `IikoError`, `getToken`, `fetchExternalMenu`, `invalidateMenuCache`, `getIikoMenu`, `getIikoMenuByType`, `mapExternalMenu`, `Nutrition` — имена согласованы между задачами и блоками Interfaces. ✓

**Известный риск:** локальный `fetch` из Node на Windows к `api-ru.iiko.services` может таймаутить (undici/IPv6) — `curl` при этом работает. Юнит-тесты мокают `fetch` и не зависят от сети; живая проверка — на Vercel preview либо с принудительным IPv4. Если потребуется — в Фазе 1C добавить undici-агент с `connect: { family: 4 }`.
