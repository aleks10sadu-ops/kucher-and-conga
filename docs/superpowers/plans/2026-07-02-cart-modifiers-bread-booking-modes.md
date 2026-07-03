# Cart Modifiers, Bread Category & Booking Modes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show item modifiers and business-lunch composition in the cart and in Telegram, split bread out of the bread+drinks iiko group into its own «Хлеб» category, and give the booking form two modes («Связаться с администратором» default / «Выберу сам»).

**Architecture:** One structured field `CartItem.modifiers: {group, option}[]` (the shape `BusinessLunchConstructor` already emits) becomes the single source of truth. A pure `visibleModifiers` helper filters the synthetic «Без хлеба» option. `FoodDetailModal` starts emitting that shape instead of gluing modifiers into the name; `CartDrawer` and both Telegram formatters render it. Bread is separated at the data layer in `lib/iiko/mapMenu.ts`. The booking mode is a local toggle in `HomeClient` that hides/shows the existing `BookingTypeSelector`.

**Tech Stack:** Next.js 16, React 18, TypeScript, Vitest (`npm test` → `vitest run`), Tailwind.

## Global Constraints

- Bread options have **price 0** — bread choice never changes any total.
- Bread category: option order fixed `[«С хлебом», «Без хлеба»]`; «С хлебом» is the default. When «Без хлеба» is chosen it must **not** appear in cart or Telegram.
- Booking default mode is **«Связаться с администратором»** (`admin`). Confirmation is always via administrator — do not add any auto-confirm path.
- The modifier object shape is exactly `{ group: string; option: string }` everywhere. Do not introduce a second shape.
- Do not touch VK (#5) or «Отправить в iiko» (#6) — out of scope.
- Russian-language UI copy; keep existing wording/tone.
- Bread detection heuristic is name-match `/хлеб/i`; mark it with a `// ponytail:` comment noting the ceiling.

---

### Task 1: `modifiers` field, `visibleModifiers` helper, cart rendering

**Files:**
- Modify: `types/index.ts:10-17` (add field to `CartItem`)
- Create: `lib/booking/modifiers.ts`
- Test: `lib/booking/modifiers.test.ts`
- Modify: `app/components/CartDrawer.tsx:152-220` (`CartItemComponent`)

**Interfaces:**
- Produces: `type Modifier = { group: string; option: string }`; `visibleModifiers(mods?: Modifier[]): Modifier[]` (drops entries whose `option === 'Без хлеба'`). `CartItem.modifiers?: Modifier[]`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

Create `lib/booking/modifiers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { visibleModifiers } from './modifiers';

describe('visibleModifiers', () => {
  it('returns [] for undefined', () => {
    expect(visibleModifiers(undefined)).toEqual([]);
  });

  it('keeps normal modifiers', () => {
    const mods = [
      { group: 'Гарнир', option: 'Пюре' },
      { group: 'Напиток', option: 'Чай' },
    ];
    expect(visibleModifiers(mods)).toEqual(mods);
  });

  it('drops the «Без хлеба» option but keeps «С хлебом»', () => {
    expect(visibleModifiers([{ group: 'Хлеб', option: 'Без хлеба' }])).toEqual([]);
    expect(visibleModifiers([{ group: 'Хлеб', option: 'С хлебом' }])).toEqual([
      { group: 'Хлеб', option: 'С хлебом' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/booking/modifiers.test.ts`
Expected: FAIL — cannot find module `./modifiers`.

- [ ] **Step 3: Create the helper**

Create `lib/booking/modifiers.ts`:

```ts
export type Modifier = { group: string; option: string };

/**
 * Модификаторы для показа гостю/в заявке.
 * Служебная опция «Без хлеба» скрывается: если хлеб не выбран, строки нет.
 */
export function visibleModifiers(mods?: Modifier[]): Modifier[] {
  return (mods || []).filter((m) => m.option !== 'Без хлеба');
}
```

- [ ] **Step 4: Add the field to `CartItem`**

In `types/index.ts`, inside the `CartItem` type (currently lines 10-17), add above the index signature:

```ts
    modifiers?: { group: string; option: string }[];
```

Result:

```ts
export type CartItem = {
    id: string | number;
    name: string;
    price: number;
    img?: string;
    qty: number;
    modifiers?: { group: string; option: string }[];
    [key: string]: any; // For flexible properties until fully strictly typed
};
```

- [ ] **Step 5: Render modifiers in the cart**

In `app/components/CartDrawer.tsx`, add the import at the top with the other imports:

```tsx
import { visibleModifiers } from '@/lib/booking/modifiers';
```

In `CartItemComponent` (lines 152-220), inside the `<div className="flex-1">` block, immediately **after** the price line `<div className="text-sm text-neutral-400">{item.price.toLocaleString('ru-RU')} ₽</div>` and its closing `</div>` for the name/price `<div>`, insert a modifiers list. Concretely, replace this block (lines ~163-177):

```tsx
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-neutral-400">
                            {item.price.toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="p-1 rounded hover:bg-white/5"
                        aria-label="Удалить позицию"
                    >
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>
```

with:

```tsx
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="font-semibold">{item.name}</div>
                        {visibleModifiers(item.modifiers).length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                                {visibleModifiers(item.modifiers).map((m, i) => (
                                    <li key={i} className="text-xs text-neutral-400">
                                        {m.group}: <span className="text-neutral-200">{m.option}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="text-sm text-neutral-400 mt-1">
                            {item.price.toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="p-1 rounded hover:bg-white/5"
                        aria-label="Удалить позицию"
                    >
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test -- lib/booking/modifiers.test.ts`
Expected: PASS (3 tests).
Run: `npx tsc --noEmit`
Expected: no new errors from the touched files.

- [ ] **Step 7: Commit**

```bash
git add types/index.ts lib/booking/modifiers.ts lib/booking/modifiers.test.ts app/components/CartDrawer.tsx
git commit -m "feat(cart): structured modifiers field + visibleModifiers helper + cart rendering"
```

---

### Task 2: `FoodDetailModal` emits structured modifiers, clean name

**Files:**
- Modify: `app/components/FoodDetailModal.tsx:283-326` (`handleAdd`, non-variant branch)

**Interfaces:**
- Consumes: `CartItem.modifiers` (Task 1). Existing locals in the component: `modifierGroups`, `modSel`, `modsKey`, `modsExtraPrice`, `cleanOptName`.
- Produces: cart items whose `name` is the base dish name and whose `modifiers` carry the selection.

- [ ] **Step 1: Add a grouped-selection builder**

In `app/components/FoodDetailModal.tsx`, just after the existing `selectedModOptions` / `modsLabel` block (around lines 109-114), add:

```tsx
    // Структурные модификаторы для корзины/Telegram: { group, option }
    const selectedModifiers = modifierGroups.flatMap((g) =>
        (modSel[g.id] || [])
            .map((oid) => g.options.find((o) => o.id === oid))
            .filter(Boolean)
            .map((o) => ({ group: cleanOptName(g.name), option: cleanOptName((o as any).name) }))
    );
```

- [ ] **Step 2: Use base name + structured modifiers when adding**

In `handleAdd`, in the `else` branch (no variant, lines ~302-325), change the cart item so `name` is the base name and `modifiers` is attached. Replace:

```tsx
            const cartId = hasModifiers && modsKey ? `${item.id}__${modsKey}` : item.id;
            const cartName = hasModifiers && modsLabel ? `${item.name} (${modsLabel})` : item.name;
            const cartPrice = (item.price || 0) + (hasModifiers ? modsExtraPrice : 0);

            const cartItem = cartItems.find(ci => ci.id === cartId);
            const currentQty = cartItem?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: cartId,
                name: cartName,
                price: cartPrice,
                weight: item.weight || '',
                description: item.description,
                img: displayImage,
                qty: newQuantity
            });
```

with:

```tsx
            const cartId = hasModifiers && modsKey ? `${item.id}__${modsKey}` : item.id;
            const cartPrice = (item.price || 0) + (hasModifiers ? modsExtraPrice : 0);

            const cartItem = cartItems.find(ci => ci.id === cartId);
            const currentQty = cartItem?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: cartId,
                name: item.name, // базовое имя; идентичность держит cartId с modsKey
                price: cartPrice,
                weight: item.weight || '',
                description: item.description,
                img: displayImage,
                qty: newQuantity,
                modifiers: hasModifiers ? selectedModifiers : undefined,
            });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification (run the app)**

Run: `npm run dev`, open http://localhost:3000, open a dish that has modifiers (a «на выбор» group), pick options, add to cart, open the cart.
Expected: cart shows the base dish name with a small list `Группа: Опция` beneath it; price includes any paid modifier; adding the same dish+same options increments quantity (not a duplicate row).

- [ ] **Step 5: Commit**

```bash
git add app/components/FoodDetailModal.tsx
git commit -m "feat(menu): FoodDetailModal emits structured modifiers, keeps clean item name"
```

---

### Task 3: Split bread out of the bread+drinks group in `mapMenu`

**Files:**
- Modify: `lib/iiko/mapMenu.ts:20-39` (`mapModifierGroups`)
- Test: `lib/iiko/mapMenu.test.ts` (append)

**Interfaces:**
- Consumes: `ModifierGroup`, `ModifierOption` from `types/index`.
- Produces: `mapModifierGroups` now returns a dedicated «Хлеб» group `{ name: 'Хлеб', min: 1, max: 1, options: [{ id: <bread id>, name: 'С хлебом', price: 0 }, { id: 'no-bread', name: 'Без хлеба', price: 0 }] }` whenever an input group contains an option matching `/хлеб/i`; remaining options stay in the original group.

- [ ] **Step 1: Write the failing test**

Append to `lib/iiko/mapMenu.test.ts`:

```ts
import { mapExternalMenu as _mapForBread } from './mapMenu';

describe('mapModifierGroups bread split', () => {
  const rawWithBread: IikoExternalMenu = {
    itemCategories: [
      {
        id: 'bl',
        name: 'БИЗНЕС ЛАНЧ',
        items: [
          {
            itemId: 'set1',
            name: 'Сет 1',
            itemSizes: [
              {
                prices: [{ organizationId: 'o', price: 500 }],
                itemModifierGroups: [
                  {
                    name: 'Выбор хлеба и напитков',
                    restrictions: { minQuantity: 1, maxQuantity: 1 },
                    items: [
                      { itemId: 'bread1', name: 'Хлеб б/л', prices: [{ organizationId: 'o', price: 0 }] },
                      { itemId: 'tea', name: 'Чай', prices: [{ organizationId: 'o', price: 0 }] },
                      { itemId: 'coffee', name: 'Кофе', prices: [{ organizationId: 'o', price: 0 }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as any;

  it('splits bread into its own «Хлеб» group and leaves drinks separate', () => {
    const menu = _mapForBread(rawWithBread);
    const set = menu.business!.categories[0].items[0];
    const groups = set.modifierGroups!;

    const bread = groups.find((g) => g.name === 'Хлеб');
    expect(bread).toBeDefined();
    expect(bread!.min).toBe(1);
    expect(bread!.max).toBe(1);
    expect(bread!.options.map((o) => o.name)).toEqual(['С хлебом', 'Без хлеба']);
    expect(bread!.options[0].id).toBe('bread1');
    expect(bread!.options[1].id).toBe('no-bread');
    expect(bread!.options.every((o) => o.price === 0)).toBe(true);

    const drinks = groups.find((g) => g.name === 'Выбор хлеба и напитков');
    expect(drinks).toBeDefined();
    expect(drinks!.options.map((o) => o.name)).toEqual(['Чай', 'Кофе']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/iiko/mapMenu.test.ts`
Expected: FAIL — no «Хлеб» group found (`bread` is `undefined`).

- [ ] **Step 3: Implement the split**

In `lib/iiko/mapMenu.ts`, replace `mapModifierGroups` (lines 20-39) with:

```ts
// ponytail: хлеб детектируется по имени опции /хлеб/i.
// Потолок: если iiko переименует «Хлеб б/л» — перестанет матчиться.
// Апгрейд-путь: явный список id/sku хлебных опций в конфиге.
const BREAD_RE = /хлеб/i;

function mapModifierGroups(size: IikoItemSize | undefined): ModifierGroup[] {
  const groups = size?.itemModifierGroups || [];
  const result: ModifierGroup[] = [];

  for (const g of groups) {
    const options: ModifierOption[] = (g.items || []).map((mi) => ({
      id: mi.itemId || mi.sku || mi.name,
      name: mi.name,
      price: (mi.prices || []).map((p) => p.price ?? 0).find((p) => p > 0) ?? 0,
    }));
    if (options.length === 0) continue;

    const breadOpt = options.find((o) => BREAD_RE.test(o.name));
    if (breadOpt) {
      // Отдельная категория «Хлеб»: по умолчанию с хлебом, цена 0.
      result.push({
        id: `bread-${g.itemGroupId || g.sku || g.name}`,
        name: 'Хлеб',
        min: 1,
        max: 1,
        options: [
          { id: breadOpt.id, name: 'С хлебом', price: 0 },
          { id: 'no-bread', name: 'Без хлеба', price: 0 },
        ],
      });
      const rest = options.filter((o) => o.id !== breadOpt.id);
      if (rest.length > 0) {
        result.push({
          id: g.itemGroupId || g.sku || g.name,
          name: g.name,
          min: g.restrictions?.minQuantity ?? 0,
          max: g.restrictions?.maxQuantity ?? 1,
          options: rest,
        });
      }
      continue;
    }

    result.push({
      id: g.itemGroupId || g.sku || g.name,
      name: g.name,
      min: g.restrictions?.minQuantity ?? 0,
      max: g.restrictions?.maxQuantity ?? 1,
      options,
    });
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/iiko/mapMenu.test.ts`
Expected: PASS (existing tests + the new bread-split test).

- [ ] **Step 5: Commit**

```bash
git add lib/iiko/mapMenu.ts lib/iiko/mapMenu.test.ts
git commit -m "feat(iiko): split bread out of the bread+drinks modifier group into «Хлеб»"
```

---

### Task 4: Default-select bread in `BusinessLunchConstructor`

**Files:**
- Modify: `app/components/BusinessLunchConstructor.tsx:11-31` (initial choices + set switch)

**Interfaces:**
- Consumes: `ModifierGroup` with a group named `Хлеб` whose first option is `С хлебом` (Task 3). Already emits `modifiers: {group, option}[]` (line 54) — unchanged.
- Produces: `choices` pre-populated so the «Хлеб» group defaults to «С хлебом».

- [ ] **Step 1: Add a bread-default helper**

In `app/components/BusinessLunchConstructor.tsx`, add above the component (after the imports):

```tsx
// ponytail: дефолт ставим только для группы хлеба (имя /хлеб/i),
// напитки гость выбирает сам.
const BREAD_RE = /хлеб/i;

function defaultChoices(set: MenuItem | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of set?.modifierGroups || []) {
    if (BREAD_RE.test(g.name) && g.options[0]) out[g.id] = g.options[0].id;
  }
  return out;
}
```

- [ ] **Step 2: Seed initial state and reset with the default**

Replace the initial `choices` state (line 14) and `selectSet` (lines 24-27):

```tsx
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    defaultChoices(sets.find((s) => String(s.id) === String(sets[0]?.id)) || null),
  );
```

```tsx
  const selectSet = (id: string | number) => {
    setSelectedSetId(id);
    const next = sets.find((s) => String(s.id) === String(id)) || null;
    setChoices(defaultChoices(next)); // сброс, но с дефолтным «С хлебом»
  };
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification (run the app)**

Run: `npm run dev`, open the menu, switch to the «Бизнес-ланч» tab, select a set.
Expected: the «Хлеб» group shows «С хлебом» already selected; drinks are unselected until the guest picks one; picking «Без хлеба» is allowed; «Добавить» is enabled once required groups are chosen. After adding, the cart shows the composition; «Без хлеба» does not appear when chosen, «Хлеб: С хлебом» appears when с хлебом.

- [ ] **Step 5: Commit**

```bash
git add app/components/BusinessLunchConstructor.tsx
git commit -m "feat(business-lunch): default «С хлебом» in the bread group"
```

---

### Task 5: Modifiers + booking mode in Telegram

**Files:**
- Modify: `lib/booking/formatTelegram.ts:1-50`
- Modify: `lib/booking/formatTelegram.test.ts` (append)
- Modify: `app/api/telegram/route.ts:32-36` (`OrderItem`) and `:118-120` (delivery items block)
- Modify: `app/HomeClient.tsx:412-443` (preorder items carry modifiers + payload `mode`)

**Interfaces:**
- Consumes: `visibleModifiers` (Task 1), `Modifier` shape.
- Produces: `TelegramBookingInput` gains `mode?: 'admin' | 'self'` and `cartItems[].modifiers?`. `OrderItem` (route) gains `modifiers?`. Telegram output renders modifier sub-bullets and, for `mode === 'admin'`, the line `Режим: Связаться с администратором`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/booking/formatTelegram.test.ts`:

```ts
describe('formatBookingTelegram modifiers & mode', () => {
  it('renders modifier sub-bullets under a preorder item', () => {
    const msg = formatBookingTelegram({
      firstName: 'Иван', lastName: 'Петров', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 2, children: 0, bookingType: 'preorder', hallName: 'Conga',
      cartItems: [{ name: 'Стейк', qty: 1, price: 1500, modifiers: [
        { group: 'Гарнир', option: 'Пюре' },
        { group: 'Хлеб', option: 'Без хлеба' },
      ] }],
      cartFoodSum: 1500,
    });
    expect(msg).toMatch(/Стейк × 1/);
    expect(msg).toMatch(/Гарнир: Пюре/);
    // «Без хлеба» скрыто
    expect(msg).not.toMatch(/Без хлеба/);
  });

  it('shows admin mode label', () => {
    const msg = formatBookingTelegram({
      firstName: 'Анна', lastName: 'И', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 2, children: 0, bookingType: 'onsite', hallName: 'Conga',
      cartItems: [], cartFoodSum: 0, mode: 'admin',
    });
    expect(msg).toMatch(/Режим: Связаться с администратором/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/booking/formatTelegram.test.ts`
Expected: FAIL — `mode`/`modifiers` not in type; labels absent.

- [ ] **Step 3: Update `formatTelegram.ts`**

Replace the file body with (keeps existing escaping/behavior, adds modifiers + mode):

```ts
import type { BookingType } from './rules';
import { visibleModifiers } from './modifiers';

export interface TelegramBookingInput {
  firstName: string;
  lastName: string;
  phone: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  bookingType: BookingType;
  hallName: string | null;
  cartItems: { name: string; qty: number; price: number; modifiers?: { group: string; option: string }[] }[];
  cartFoodSum: number;
  banquetPackageName?: string | null;
  comment?: string;
  mode?: 'admin' | 'self';
}

const TYPE_LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

/** Escape user-supplied strings for HTML parse_mode in Telegram. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatBookingTelegram(i: TelegramBookingInput): string {
  const lines: string[] = [];
  lines.push('🍽 Новая заявка на бронь');
  lines.push(`Гость: ${escapeHtml(i.lastName)} ${escapeHtml(i.firstName)}`.trim());
  lines.push(`Телефон: ${escapeHtml(i.phone)}`);
  lines.push(`Когда: ${i.date} ${i.time}`);
  lines.push(`Взрослых: ${i.adults}`);
  lines.push(`Детей: ${i.children}`);
  if (i.hallName) lines.push(`Зал: ${escapeHtml(i.hallName)}`);
  if (i.mode === 'admin') {
    lines.push('Режим: Связаться с администратором');
  } else {
    lines.push(`Тип: ${TYPE_LABEL[i.bookingType]}`);
  }
  if (i.mode !== 'admin' && i.bookingType === 'preorder' && i.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of i.cartItems) {
      lines.push(`  • ${escapeHtml(it.name)} × ${it.qty} — ${it.price * it.qty} ₽`);
      for (const m of visibleModifiers(it.modifiers)) {
        lines.push(`      – ${escapeHtml(m.group)}: ${escapeHtml(m.option)}`);
      }
    }
    lines.push(`Сумма: ${i.cartFoodSum} ₽`);
  }
  if (i.mode !== 'admin' && i.bookingType === 'banquet' && i.banquetPackageName) {
    lines.push(`Банкетный пакет: ${escapeHtml(i.banquetPackageName)}`);
  }
  if (i.comment && i.comment.trim()) lines.push(`Комментарий: ${escapeHtml(i.comment.trim())}`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/booking/formatTelegram.test.ts`
Expected: PASS (existing 2 + new 2).

- [ ] **Step 5: Render delivery modifiers in the route**

In `app/api/telegram/route.ts`, extend `OrderItem` (lines 32-36):

```ts
interface OrderItem {
  name: string;
  qty: number;
  price: number;
  modifiers?: { group: string; option: string }[];
}
```

Add the import at the top:

```ts
import { visibleModifiers } from '@/lib/booking/modifiers';
```

Replace the delivery `itemsBlock` builder (lines ~118-120):

```ts
    const itemsBlock = allItems.length
      ? allItems.map(i => `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`).join('\n')
      : '—';
```

with:

```ts
    const itemsBlock = allItems.length
      ? allItems.map(i => {
          const head = `• ${escapeHtml(i.name)} × ${i.qty} = ${fmtCurrency(i.qty * i.price)} ₽`;
          const mods = visibleModifiers((i as OrderItem).modifiers)
            .map(m => `\n    – ${escapeHtml(m.group)}: ${escapeHtml(m.option)}`)
            .join('');
          return head + mods;
        }).join('\n')
      : '—';
```

Also add `modifiers` to the booking passthrough in `buildMessage` (the `formatBookingTelegram({...})` call, lines ~85-89): add `mode: payload.mode` and ensure `cartItems` is passed as-is (it already is). Update `BookingPayload` (lines 45-58) to include:

```ts
  mode?: 'admin' | 'self';
```

and change `cartItems: OrderItem[];` — it already is `OrderItem[]`, which now carries `modifiers`, so no further change. In the `formatBookingTelegram` call add `mode`:

```ts
    return formatBookingTelegram({
      firstName, lastName, phone, date, time,
      adults, children, bookingType, hallName,
      cartItems, cartFoodSum, banquetPackageName, comment,
      mode: payload.mode,
    });
```

(destructure `mode` from `payload` alongside the others at the top of the `type === 'booking'` block).

- [ ] **Step 6: Carry modifiers + mode from `HomeClient` booking submit**

In `app/HomeClient.tsx`, change `preorderItems` (line 412-414) to include modifiers:

```tsx
    const preorderItems = bookingType === 'preorder'
      ? items.map(c => ({ name: c.name, qty: c.qty, price: c.price, modifiers: c.modifiers }))
      : [];
```

In `telegramPayload` (lines 427-443) add the mode field (the mode state is added in Task 6; until then default to `'self'` is wrong — so this step depends on Task 6's `bookingMode`). Add:

```tsx
      mode: bookingMode,
```

to the `telegramPayload` object. (If executing Task 5 before Task 6, temporarily hardcode `mode: 'self' as const` and fix in Task 6 — but prefer executing Task 6 first if doing them together.)

- [ ] **Step 7: Run the full test suite + typecheck**

Run: `npm test`
Expected: PASS (all).
Run: `npx tsc --noEmit`
Expected: no new errors (assuming `bookingMode` exists from Task 6; otherwise use the temporary hardcode noted above).

- [ ] **Step 8: Commit**

```bash
git add lib/booking/formatTelegram.ts lib/booking/formatTelegram.test.ts app/api/telegram/route.ts app/HomeClient.tsx
git commit -m "feat(telegram): render item modifiers and admin/self booking mode"
```

---

### Task 6: Two booking modes in `HomeClient`

**Files:**
- Modify: `app/HomeClient.tsx` — new `bookingMode` state (near other booking state ~line 178), a toggle UI above the form (~line 886), conditional rendering of `BookingTypeSelector` and its dependent blocks (lines 993-1040), and submit guards (lines 367-408, 427-443).

**Interfaces:**
- Consumes: existing `bookingData`, `validation`, `BookingTypeSelector`.
- Produces: `const [bookingMode, setBookingMode] = useState<'admin' | 'self'>('admin')`, referenced by Task 5's payload.

- [ ] **Step 1: Add mode state**

In `app/HomeClient.tsx`, next to `const [selectedHallName, setSelectedHallName] = useState<string | null>(null);` (line 178), add:

```tsx
  const [bookingMode, setBookingMode] = useState<'admin' | 'self'>('admin');
```

- [ ] **Step 2: Add the mode toggle above the form**

In the booking `<form onSubmit={submitBooking} ...>` (line 886), immediately after the opening `<form ...>` tag, insert:

```tsx
                  {/* Режим брони */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingMode('admin')}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        bookingMode === 'admin'
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/15 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-sm">Связаться с администратором</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Оставьте контакты — администратор подберёт и подтвердит.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingMode('self')}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        bookingMode === 'self'
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/15 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-sm">Выберу сам</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Заказ по факту, предзаказ или банкетное меню.
                      </div>
                    </button>
                  </div>
```

- [ ] **Step 3: Show booking-type UI only in «Выберу сам» mode**

Wrap the «Тип брони» block (lines 993-1000) and its dependent blocks (preorder summary 1003-1027, banquet 1030-1040+) in `bookingMode === 'self' && ( ... )`. Concretely, change the opening of the «Тип брони» container:

```tsx
                  {/* Тип брони */}
                  <div className="md:col-span-2">
                    <BookingTypeSelector
```

to:

```tsx
                  {/* Тип брони — только в режиме «Выберу сам» */}
                  {bookingMode === 'self' && (
                  <div className="md:col-span-2">
                    <BookingTypeSelector
```

and change the two dependent conditions from `{bookingData.bookingType === 'preorder' && (` / `{bookingData.bookingType === 'banquet' && (` to also require self mode:

```tsx
                  {bookingMode === 'self' && bookingData.bookingType === 'preorder' && (
```

```tsx
                  {bookingMode === 'self' && bookingData.bookingType === 'banquet' && (
```

Add the missing closing `)}` for the «Тип брони» wrapper right after that block's closing `</div>`.

- [ ] **Step 4: Guard submit for admin mode**

In `submitBooking`, the banquet-package guard (line 401) must not fire in admin mode. Change:

```tsx
    if (bookingType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), banquetPackageId)) {
```

to:

```tsx
    if (bookingMode === 'self' && bookingType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), banquetPackageId)) {
```

In admin mode, force non-type-specific payload values. In the `telegramPayload` object (added `mode` in Task 5), also neutralize preorder/banquet fields when admin — replace the three type-dependent fields:

```tsx
      bookingType,
      hallName: selectedHallName,
      cartItems: preorderItems,
      cartFoodSum: preorderSum,
      banquetPackageName: bookingType === 'banquet' ? banquetPackageName : null,
```

with:

```tsx
      bookingType,
      hallName: selectedHallName,
      cartItems: bookingMode === 'self' ? preorderItems : [],
      cartFoodSum: bookingMode === 'self' ? preorderSum : 0,
      banquetPackageName: bookingMode === 'self' && bookingType === 'banquet' ? banquetPackageName : null,
      mode: bookingMode,
```

- [ ] **Step 5: Reset mode after successful booking**

In `resetBooking` (lines 445-461), add:

```tsx
      setBookingMode('admin');
```

- [ ] **Step 6: Typecheck + full test run**

Run: `npx tsc --noEmit`
Expected: no new errors.
Run: `npm test`
Expected: PASS (all).

- [ ] **Step 7: Manual verification (run the app)**

Run: `npm run dev`, scroll to «Забронировать стол».
Expected: «Связаться с администратором» is preselected; the type selector and preorder/banquet blocks are hidden; filling contacts + зал + пожелания and submitting succeeds. Switching to «Выберу сам» reveals the three types and their blocks. Telegram (if token configured) shows «Режим: Связаться с администратором» for the default mode and the chosen type otherwise, with modifier sub-bullets on preorder items.

- [ ] **Step 8: Commit**

```bash
git add app/HomeClient.tsx
git commit -m "feat(booking): two modes — admin contact (default) and self-select"
```

---

## Self-Review

**Spec coverage:**
- #1 modifiers/business-lunch composition in cart → Task 1 (helper + render), Task 2 (dish emit), Task 4 (business lunch already emits + default bread). ✓
- #2 bread as its own category, default с хлебом, hidden when без хлеба, price-neutral → Task 3 (split), Task 4 (default), Task 1 (`visibleModifiers` hides «Без хлеба»). ✓
- #3 modifiers in Telegram → Task 5 (booking preorder + delivery). ✓
- #4 two booking modes, пожелания already present → Task 6. ✓
- Out-of-scope #5/#6 untouched. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. The one conditional note (Task 5 Step 6 `mode` depends on Task 6) is called out explicitly with the temporary value — recommend executing Task 6 before Task 5's Step 6, or applying them together.

**Type consistency:** `{ group: string; option: string }` used identically in `types/index.ts`, `modifiers.ts`, `FoodDetailModal`, `formatTelegram`, `route.ts`. `visibleModifiers` signature identical across importers. `bookingMode: 'admin' | 'self'` matches the `mode` field on `TelegramBookingInput`/`BookingPayload`. Bread option names `'С хлебом'`/`'Без хлеба'` and id `'no-bread'` consistent between Task 3 (produce) and Task 1/Task 5 (`visibleModifiers` filter on `'Без хлеба'`).

**Cross-task dependency note:** Tasks 5 and 6 both edit `app/HomeClient.tsx` and are coupled through `bookingMode`/`mode`. Execute Task 6 before Task 5 Step 6 (or bundle their HomeClient edits) to avoid the temporary hardcode.
