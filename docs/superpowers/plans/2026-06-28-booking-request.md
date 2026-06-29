# Бронь как заявка с авто-валидацией — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить бронирование в простую заявку (подтверждается звонком администратора) с раздельными полями взрослые/дети, типом брони (по факту / предзаказ / банкет) и авто-валидацией по правилам прямо на этапе выбора.

**Architecture:** Вся логика правил — в чистом, юнит-тестируемом модуле `lib/booking/rules.ts` (`evaluateBooking` + хелперы). Форма брони в `app/page.tsx` только отображает результат через новый презентационный компонент `BookingTypeSelector` и условные блоки (корзина предзаказа, выбор банкетного пакета). Проверка занятости (CRM) удаляется; заявка уходит в CRM RPC (status `new`) и в Telegram. Спека: `docs/superpowers/specs/2026-06-27-booking-request-design.md`.

**Tech Stack:** Next.js 16 (App Router), React 18, TypeScript, vitest (уже настроен, glob `lib/**/*.test.ts`).

## Global Constraints

- Часовой пояс ресторана — фикс. `Europe/Moscow` = UTC+3 без перехода. Все вычисления дат/сроков — в нём.
- Пороги по ВЗРОСЛЫМ (дети не учитываются): банкет от 6; от 9 — нет «по факту»; от 12 — только банкет.
- Сроки: предзаказ — не позже 16:00 (МСК) дня до мероприятия (день-в-день нельзя); банкет — дата ≥ +2 дня.
- Минимум предзаказа по сумме еды в корзине: `conga` = 4000 ₽, `kucher` = 3000 ₽, `other` = нет (→ «свяжется администратор»). Ниже минимума (conga/kucher) — отправка заблокирована.
- Классификация зала по имени: содержит «Conga» → `conga`; содержит «банкет» или «беседк» → `other`; иначе → `kucher`.
- Банкетные пакеты по залу: зал `conga` → только Conga (7500/6000); любой не-`conga` → все (Conga 7500/6000 + Кучер 5000).
- Двухуровневое поведение: недопустимые ТИПЫ отключаются с причиной; случаи предоплаты/«прочих» залов/банкета — заявку отправить можно с info «свяжется администратор».
- Тип брони по умолчанию — `onsite`, если доступен, иначе первый доступный.
- Сабмит: CRM RPC `create_public_reservation` (status `new`, без проверки доступности) + Telegram. Онлайн-оплаты нет.
- Значения `BookingType`: `'onsite' | 'preorder' | 'banquet'`. `HallGroup`: `'conga' | 'kucher' | 'other'`.

---

### Task 1: Чистый модуль правил `lib/booking/rules.ts`

**Files:**
- Create: `lib/booking/rules.ts`
- Create: `lib/booking/rules.test.ts`

**Interfaces:**
- Produces:
  - `type BookingType = 'onsite' | 'preorder' | 'banquet'`
  - `type HallGroup = 'conga' | 'kucher' | 'other'`
  - `interface BookingRuleInput { adults: number; children: number; eventDate: string; eventTime: string; now: Date; hallGroup: HallGroup | null; type: BookingType | null; cartFoodSum: number }`
  - `interface TypeAvailability { type: BookingType; allowed: boolean; reason?: string }`
  - `interface BookingValidation { availableTypes: TypeAvailability[]; canSubmit: boolean; blocking: string[]; info: string[] }`
  - `function evaluateBooking(input: BookingRuleInput): BookingValidation`
  - `function classifyHall(hallName: string | null | undefined): HallGroup | null`
  - `function preorderMinimum(group: HallGroup): number | null`
  - `function banquetPackagesForHall(group: HallGroup | null): 'conga' | 'all' | null`

- [ ] **Step 1: Написать падающий тест `lib/booking/rules.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import {
  evaluateBooking,
  classifyHall,
  preorderMinimum,
  banquetPackagesForHall,
  type BookingRuleInput,
} from './rules';

// now = 2026-06-28 13:00 МСК (10:00 UTC). "today" в МСК = 28 июня.
const NOW = new Date('2026-06-28T10:00:00Z');

function base(over: Partial<BookingRuleInput> = {}): BookingRuleInput {
  return {
    adults: 2,
    children: 0,
    eventDate: '2026-06-30', // +2 дня
    eventTime: '18:00',
    now: NOW,
    hallGroup: 'conga',
    type: 'onsite',
    cartFoodSum: 0,
    ...over,
  };
}
const allowed = (v: ReturnType<typeof evaluateBooking>, t: string) =>
  v.availableTypes.find((x) => x.type === t)!.allowed;

describe('classifyHall', () => {
  it('maps names to groups', () => {
    expect(classifyHall('Conga')).toBe('conga');
    expect(classifyHall('Морской (Кучер)')).toBe('kucher');
    expect(classifyHall('Летняя веранда')).toBe('kucher');
    expect(classifyHall('Банкетные залы')).toBe('other');
    expect(classifyHall('Беседки')).toBe('other');
    expect(classifyHall(null)).toBeNull();
  });
});

describe('preorderMinimum / banquetPackagesForHall', () => {
  it('returns minimums', () => {
    expect(preorderMinimum('conga')).toBe(4000);
    expect(preorderMinimum('kucher')).toBe(3000);
    expect(preorderMinimum('other')).toBeNull();
  });
  it('filters banquet packages by hall', () => {
    expect(banquetPackagesForHall('conga')).toBe('conga');
    expect(banquetPackagesForHall('kucher')).toBe('all');
    expect(banquetPackagesForHall('other')).toBe('all');
    expect(banquetPackagesForHall(null)).toBeNull();
  });
});

describe('type availability by adults', () => {
  it('<6 adults: onsite+preorder yes, banquet no (min 6)', () => {
    const v = evaluateBooking(base({ adults: 4 }));
    expect(allowed(v, 'onsite')).toBe(true);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(false);
  });
  it('6-8 adults: all allowed (date +2)', () => {
    const v = evaluateBooking(base({ adults: 7 }));
    expect(allowed(v, 'onsite')).toBe(true);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(true);
  });
  it('9-11 adults: onsite disabled', () => {
    const v = evaluateBooking(base({ adults: 10 }));
    expect(allowed(v, 'onsite')).toBe(false);
    expect(allowed(v, 'preorder')).toBe(true);
    expect(allowed(v, 'banquet')).toBe(true);
  });
  it('12+ adults: only banquet', () => {
    const v = evaluateBooking(base({ adults: 12 }));
    expect(allowed(v, 'onsite')).toBe(false);
    expect(allowed(v, 'preorder')).toBe(false);
    expect(allowed(v, 'banquet')).toBe(true);
  });
});

describe('timing', () => {
  it('preorder for tomorrow allowed before 16:00 МСК', () => {
    // now 13:00 МСК, event tomorrow -> cutoff today 16:00 МСК -> ok
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-29', type: 'preorder', hallGroup: 'conga', cartFoodSum: 5000 }));
    expect(allowed(v, 'preorder')).toBe(true);
  });
  it('preorder for tomorrow blocked after 16:00 МСК', () => {
    const lateNow = new Date('2026-06-28T14:00:00Z'); // 17:00 МСК
    const v = evaluateBooking(base({ now: lateNow, adults: 2, eventDate: '2026-06-29', type: 'preorder' }));
    expect(allowed(v, 'preorder')).toBe(false);
  });
  it('preorder same-day blocked', () => {
    const v = evaluateBooking(base({ adults: 2, eventDate: '2026-06-28', type: 'preorder' }));
    expect(allowed(v, 'preorder')).toBe(false);
  });
  it('banquet needs +2 days (tomorrow blocked)', () => {
    const v = evaluateBooking(base({ adults: 8, eventDate: '2026-06-29', type: 'banquet' }));
    expect(allowed(v, 'banquet')).toBe(false);
  });
});

describe('preorder minimum gating', () => {
  it('conga below 4000 blocks submit', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 1500 }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/2500/); // доберите ещё 2500
  });
  it('conga at/above 4000 can submit', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 4000 }));
    expect(v.canSubmit).toBe(true);
  });
  it('other hall: no minimum, admin-contact info, can submit non-empty', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'other', eventDate: '2026-06-30', cartFoodSum: 500 }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/админ/i);
  });
  it('empty cart blocks preorder', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'kucher', eventDate: '2026-06-30', cartFoodSum: 0 }));
    expect(v.canSubmit).toBe(false);
  });
  it('preorder shows the cart hint as info', () => {
    const v = evaluateBooking(base({ type: 'preorder', hallGroup: 'conga', eventDate: '2026-06-30', cartFoodSum: 5000 }));
    expect(v.info.join(' ')).toMatch(/корзин/i);
  });
});

describe('banquet submit + no-type-available', () => {
  it('banquet allowed -> admin-contact info, can submit with hall', () => {
    const v = evaluateBooking(base({ adults: 8, type: 'banquet', hallGroup: 'kucher', eventDate: '2026-07-05' }));
    expect(v.canSubmit).toBe(true);
    expect(v.info.join(' ')).toMatch(/предоплат/i);
  });
  it('12+ adults tomorrow -> no type available, blocked with call message', () => {
    const v = evaluateBooking(base({ adults: 14, eventDate: '2026-06-29', type: null }));
    expect(v.canSubmit).toBe(false);
    expect(v.blocking.join(' ')).toMatch(/позвоните администратору/i);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd /c/Users/potyl/Projects/Kongotest && npm test -- lib/booking/rules.test.ts`
Expected: FAIL — модуль `./rules` не найден.

- [ ] **Step 3: Создать `lib/booking/rules.ts`**

```ts
export type BookingType = 'onsite' | 'preorder' | 'banquet';
export type HallGroup = 'conga' | 'kucher' | 'other';

export interface BookingRuleInput {
  adults: number;
  children: number;
  eventDate: string; // 'YYYY-MM-DD'
  eventTime: string; // 'HH:mm'
  now: Date;
  hallGroup: HallGroup | null;
  type: BookingType | null;
  cartFoodSum: number; // ₽
}

export interface TypeAvailability {
  type: BookingType;
  allowed: boolean;
  reason?: string;
}

export interface BookingValidation {
  availableTypes: TypeAvailability[];
  canSubmit: boolean;
  blocking: string[];
  info: string[];
}

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const ADULTS_BANQUET_MIN = 6;
const ADULTS_NO_ONSITE = 9;
const ADULTS_BANQUET_ONLY = 12;
const BANQUET_LEAD_DAYS = 2;
const PREORDER_CUTOFF_HOUR_MSK = 16;
const PREORDER_MIN: Record<HallGroup, number | null> = { conga: 4000, kucher: 3000, other: null };

const PREORDER_HINT =
  'Предзаказ отправляется администраторам на рассмотрение через набор блюд в корзину на сайте — наберите позиции, и заявка с их составом уйдёт на согласование.';
const ADMIN_CONTACT_PREPAY = 'Свяжется администратор для предоплаты и деталей.';
const ADMIN_CONTACT_HALL = 'Для этого зала свяжется администратор.';
const CALL_ADMIN = 'Онлайн-заявка для такого числа гостей и срока недоступна — позвоните администратору.';

export function classifyHall(hallName: string | null | undefined): HallGroup | null {
  if (!hallName) return null;
  const n = hallName.toLowerCase();
  if (n.includes('conga')) return 'conga';
  if (n.includes('банкет') || n.includes('беседк')) return 'other';
  return 'kucher';
}

export function preorderMinimum(group: HallGroup): number | null {
  return PREORDER_MIN[group];
}

export function banquetPackagesForHall(group: HallGroup | null): 'conga' | 'all' | null {
  if (!group) return null;
  return group === 'conga' ? 'conga' : 'all';
}

function eventDateParts(eventDate: string): { y: number; mo: number; day: number } {
  const [y, mo, day] = eventDate.split('-').map(Number);
  return { y, mo: mo - 1, day };
}

function preorderCutoffMs(eventDate: string): number {
  const { y, mo, day } = eventDateParts(eventDate);
  // 16:00 МСК дня (eventDate - 1) = (16 - 3)=13:00 UTC; Date.UTC корректно переносит day-1 через границу месяца.
  return Date.UTC(y, mo, day - 1, PREORDER_CUTOFF_HOUR_MSK - 3, 0, 0, 0);
}

function daysUntilEvent(now: Date, eventDate: string): number {
  const msk = new Date(now.getTime() + MSK_OFFSET_MS);
  const todayUTC = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate());
  const { y, mo, day } = eventDateParts(eventDate);
  const evUTC = Date.UTC(y, mo, day);
  return Math.round((evUTC - todayUTC) / 86400000);
}

function preorderTimeEligible(now: Date, eventDate: string): boolean {
  return now.getTime() <= preorderCutoffMs(eventDate);
}

function banquetDateEligible(now: Date, eventDate: string): boolean {
  return daysUntilEvent(now, eventDate) >= BANQUET_LEAD_DAYS;
}

export function evaluateBooking(input: BookingRuleInput): BookingValidation {
  const { adults, eventDate, now, hallGroup, type, cartFoodSum } = input;

  // Доступность типов
  const onsiteAllowed = adults < ADULTS_NO_ONSITE;
  const preorderAllowed = adults < ADULTS_BANQUET_ONLY && preorderTimeEligible(now, eventDate);
  const banquetAllowed = adults >= ADULTS_BANQUET_MIN && banquetDateEligible(now, eventDate);

  const onsiteReason = onsiteAllowed
    ? undefined
    : adults >= ADULTS_BANQUET_ONLY
      ? 'От 12 взрослых — только банкет'
      : 'От 9 взрослых — только предзаказ или банкет';
  const preorderReason = preorderAllowed
    ? undefined
    : adults >= ADULTS_BANQUET_ONLY
      ? 'От 12 взрослых — только банкет'
      : 'Предзаказ — не позже 16:00 дня до мероприятия (день-в-день нельзя)';
  const banquetReason = banquetAllowed
    ? undefined
    : adults < ADULTS_BANQUET_MIN
      ? 'Банкет — от 6 взрослых'
      : 'Банкет — минимум за 2 дня до мероприятия';

  const availableTypes: TypeAvailability[] = [
    { type: 'onsite', allowed: onsiteAllowed, reason: onsiteReason },
    { type: 'preorder', allowed: preorderAllowed, reason: preorderReason },
    { type: 'banquet', allowed: banquetAllowed, reason: banquetReason },
  ];

  const blocking: string[] = [];
  const info: string[] = [];
  const anyAllowed = availableTypes.some((t) => t.allowed);

  if (!anyAllowed) {
    blocking.push(CALL_ADMIN);
    return { availableTypes, canSubmit: false, blocking, info };
  }

  if (!type) {
    return { availableTypes, canSubmit: false, blocking, info };
  }

  const selected = availableTypes.find((t) => t.type === type)!;
  if (!selected.allowed) {
    if (selected.reason) blocking.push(selected.reason);
    return { availableTypes, canSubmit: false, blocking, info };
  }

  let canSubmit = true;

  if (type === 'onsite') {
    // правил-доменных блокировок нет
  } else if (type === 'preorder') {
    info.push(PREORDER_HINT);
    if (!hallGroup) {
      blocking.push('Выберите зал.');
      canSubmit = false;
    } else if (cartFoodSum <= 0) {
      blocking.push('Наберите блюда в корзину для предзаказа.');
      canSubmit = false;
    } else {
      const min = preorderMinimum(hallGroup);
      if (min != null && cartFoodSum < min) {
        blocking.push(`Минимум предзаказа для этого зала ${min} ₽. Доберите ещё ${min - cartFoodSum} ₽.`);
        canSubmit = false;
      } else if (min == null) {
        info.push(ADMIN_CONTACT_HALL);
      }
    }
  } else if (type === 'banquet') {
    info.push(ADMIN_CONTACT_PREPAY);
    if (!hallGroup) {
      blocking.push('Выберите зал для банкета.');
      canSubmit = false;
    }
  }

  return { availableTypes, canSubmit, blocking, info };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/booking/rules.test.ts`
Expected: PASS (все describe-блоки зелёные).

- [ ] **Step 5: Commit**

```bash
git add lib/booking/rules.ts lib/booking/rules.test.ts
git commit -m "feat(booking): pure rules engine for booking requests"
```

---

### Task 2: Данные банкетных пакетов + выбираемая `BanquetMenuModal`

**Files:**
- Create: `lib/booking/banquetPackages.ts`
- Modify: `app/components/BanquetMenuModal.tsx`

**Interfaces:**
- Consumes: `banquetPackagesForHall` (Task 1).
- Produces:
  - `interface BanquetPackage { id: string; venue: 'conga' | 'kucher'; name: string; pricePerPerson: number; weightGrams: number }`
  - `const BANQUET_PACKAGES: BanquetPackage[]` — 3 пакета: `conga-7500`, `conga-6000`, `kucher-5000`.
  - `function packagesForFilter(filter: 'conga' | 'all' | null): BanquetPackage[]`
  - `BanquetMenuModal` получает новые опциональные пропсы: `selectable?: boolean; selectedPackageId?: string | null; onSelectPackage?: (id: string) => void; hallFilter?: 'conga' | 'all' | null`.

- [ ] **Step 1: Создать `lib/booking/banquetPackages.ts`**

```ts
export interface BanquetPackage {
  id: string;
  venue: 'conga' | 'kucher';
  name: string;
  pricePerPerson: number;
  weightGrams: number;
}

// Соответствует содержимому BanquetMenuModal (Conga 7500/6000 ~1460 г, Кучер 5000 ~1480 г).
export const BANQUET_PACKAGES: BanquetPackage[] = [
  { id: 'conga-7500', venue: 'conga', name: 'Conga — банкет 7500 ₽/чел', pricePerPerson: 7500, weightGrams: 1460 },
  { id: 'conga-6000', venue: 'conga', name: 'Conga — банкет 6000 ₽/чел', pricePerPerson: 6000, weightGrams: 1460 },
  { id: 'kucher-5000', venue: 'kucher', name: 'Кучер — банкет 5000 ₽/чел', pricePerPerson: 5000, weightGrams: 1480 },
];

export function packagesForFilter(filter: 'conga' | 'all' | null): BanquetPackage[] {
  if (!filter) return [];
  if (filter === 'conga') return BANQUET_PACKAGES.filter((p) => p.venue === 'conga');
  return BANQUET_PACKAGES;
}
```

- [ ] **Step 2: Сделать пакеты в `BanquetMenuModal.tsx` выбираемыми**

Прочитать `app/components/BanquetMenuModal.tsx`. Добавить в пропсы:
```tsx
type FoodDetailModalProps = { /* существующие */ isOpen: boolean; onClose: () => void; } & {
    selectable?: boolean;
    selectedPackageId?: string | null;
    onSelectPackage?: (id: string) => void;
    hallFilter?: 'conga' | 'all' | null;
};
```
Импортировать `BANQUET_PACKAGES, packagesForFilter` из `@/lib/booking/banquetPackages`. У каждого ценового блока (Conga 7500, Conga 6000, Кучер 5000) сопоставить `id` (`conga-7500`/`conga-6000`/`kucher-5000`). Когда `selectable === true`:
- скрывать блоки, не входящие в `packagesForFilter(hallFilter)`;
- у каждого видимого пакета показать кнопку «Выбрать этот пакет» (или подсветку выбранного), которая вызывает `onSelectPackage(id)`;
- выбранный (`selectedPackageId === id`) визуально выделяется (рамка `border-amber-400`), кнопка → «Выбрано ✓».
Когда `selectable` не задан — поведение модалки прежнее (просто просмотр).

- [ ] **Step 3: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в этих двух файлах.

- [ ] **Step 4: Commit**

```bash
git add lib/booking/banquetPackages.ts app/components/BanquetMenuModal.tsx
git commit -m "feat(booking): selectable banquet packages"
```

---

### Task 3: Тип `BookingData` + payload заявки (CRM)

**Files:**
- Modify: `types/index.ts` (тип `BookingData`)
- Create: `lib/booking/composeReservation.ts`
- Create: `lib/booking/composeReservation.test.ts`
- Modify: `lib/reservations.ts`

**Interfaces:**
- Consumes: `BookingType` (Task 1), `BanquetPackage` (Task 2).
- Produces:
  - Обновлённый `BookingData` с полями `adults: number; children: number; bookingType: BookingType; banquetPackageId?: string | null` (вместо `guests`).
  - `interface ComposeInput { adults: number; children: number; bookingType: BookingType; hallName: string | null; cartItems: { name: string; qty: number; price: number }[]; cartFoodSum: number; banquetPackageName?: string | null; comment?: string }`
  - `function composeReservationComment(input: ComposeInput): string` — человекочитаемый свод для `p_comments`.

- [ ] **Step 1: Обновить тип `BookingData` в `types/index.ts`**

Найти `export type BookingData = { ... }`. Заменить поле `guests: number;` на:
```ts
    adults: number;
    children: number;
    bookingType: 'onsite' | 'preorder' | 'banquet';
    banquetPackageId?: string | null;
```
(Оставить `firstName/lastName/phone/date/time/comment/hallId`. Удалить legacy `name?` если есть — не трогать, если используется в других местах.)

- [ ] **Step 2: Написать падающий тест `lib/booking/composeReservation.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { composeReservationComment } from './composeReservation';

describe('composeReservationComment', () => {
  it('includes adults/children/type/hall and preorder items+sum', () => {
    const s = composeReservationComment({
      adults: 10,
      children: 2,
      bookingType: 'preorder',
      hallName: 'Conga',
      cartItems: [
        { name: 'Цезарь', qty: 2, price: 450 },
        { name: 'Борщ', qty: 1, price: 380 },
      ],
      cartFoodSum: 1280,
      comment: 'У окна',
    });
    expect(s).toMatch(/Взрослых: 10/);
    expect(s).toMatch(/Детей: 2/);
    expect(s).toMatch(/предзаказ/i);
    expect(s).toMatch(/Conga/);
    expect(s).toMatch(/Цезарь × 2/);
    expect(s).toMatch(/1280/);
    expect(s).toMatch(/У окна/);
  });

  it('includes banquet package when banquet', () => {
    const s = composeReservationComment({
      adults: 20,
      children: 0,
      bookingType: 'banquet',
      hallName: 'Морской (Кучер)',
      cartItems: [],
      cartFoodSum: 0,
      banquetPackageName: 'Кучер — банкет 5000 ₽/чел',
    });
    expect(s).toMatch(/банкет/i);
    expect(s).toMatch(/5000/);
    expect(s).not.toMatch(/Цезарь/);
  });
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `npm test -- lib/booking/composeReservation.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 4: Создать `lib/booking/composeReservation.ts`**

```ts
import type { BookingType } from './rules';

export interface ComposeInput {
  adults: number;
  children: number;
  bookingType: BookingType;
  hallName: string | null;
  cartItems: { name: string; qty: number; price: number }[];
  cartFoodSum: number;
  banquetPackageName?: string | null;
  comment?: string;
}

const TYPE_LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

export function composeReservationComment(input: ComposeInput): string {
  const lines: string[] = [];
  lines.push(`Тип: ${TYPE_LABEL[input.bookingType]}`);
  lines.push(`Взрослых: ${input.adults}; Детей: ${input.children}`);
  if (input.hallName) lines.push(`Зал: ${input.hallName}`);

  if (input.bookingType === 'preorder' && input.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of input.cartItems) {
      lines.push(`  • ${it.name} × ${it.qty} — ${it.price * it.qty} ₽`);
    }
    lines.push(`Сумма предзаказа: ${input.cartFoodSum} ₽`);
  }
  if (input.bookingType === 'banquet' && input.banquetPackageName) {
    lines.push(`Банкетный пакет: ${input.banquetPackageName}`);
  }
  if (input.comment && input.comment.trim()) {
    lines.push(`Комментарий: ${input.comment.trim()}`);
  }
  return lines.join('\n');
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/booking/composeReservation.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 6: Обновить `lib/reservations.ts`**

Прочитать `lib/reservations.ts`. Расширить `CreateReservationData`, чтобы принимать новые поля:
`adults: number; children: number; bookingType: 'onsite' | 'preorder' | 'banquet'; composedComment: string`.
В `rpcParams`:
- `p_guests_count: data.adults + data.children`,
- `p_menu_type: data.bookingType`,
- `p_comments: data.composedComment`,
- `p_status: 'new'` (всегда; убрать ветку `'waitlist'`).
Сигнатуру `createReservation(data)` сохранить; внутри использовать новые поля. Старые поля `guests_count`/`status` из типа удалить.

- [ ] **Step 7: Проверка типов и тестов**

Run: `npx tsc --noEmit` (ожидаемо появятся ошибки в `app/page.tsx`, который ещё использует старый `BookingData.guests` — это нормально, починим в Task 7; но `lib/reservations.ts` и `lib/booking/*` должны быть чисты). Затем `npm test` — модульные тесты зелёные.
Expected: `lib/booking/*` и `lib/reservations.ts` без ошибок; `app/page.tsx` может временно ругаться (фиксится в Task 7).

- [ ] **Step 8: Commit**

```bash
git add types/index.ts lib/booking/composeReservation.ts lib/booking/composeReservation.test.ts lib/reservations.ts
git commit -m "feat(booking): adults/children + preorder/banquet reservation payload"
```

---

### Task 4: Сообщение в Telegram

**Files:**
- Create: `lib/booking/formatTelegram.ts`
- Create: `lib/booking/formatTelegram.test.ts`
- Modify: `app/api/telegram/route.ts`

**Interfaces:**
- Consumes: `ComposeInput`-подобные данные (Task 3), `BookingType` (Task 1).
- Produces:
  - `interface TelegramBookingInput { firstName: string; lastName: string; phone: string; date: string; time: string; adults: number; children: number; bookingType: BookingType; hallName: string | null; cartItems: { name: string; qty: number; price: number }[]; cartFoodSum: number; banquetPackageName?: string | null; comment?: string }`
  - `function formatBookingTelegram(input: TelegramBookingInput): string`

- [ ] **Step 1: Написать падающий тест `lib/booking/formatTelegram.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { formatBookingTelegram } from './formatTelegram';

describe('formatBookingTelegram', () => {
  it('renders a full preorder request', () => {
    const msg = formatBookingTelegram({
      firstName: 'Иван', lastName: 'Петров', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 10, children: 1, bookingType: 'preorder', hallName: 'Conga',
      cartItems: [{ name: 'Стейк', qty: 2, price: 1500 }],
      cartFoodSum: 3000, comment: 'Большой стол',
    });
    expect(msg).toMatch(/Петров Иван/);
    expect(msg).toMatch(/\+7 999 000-00-00/);
    expect(msg).toMatch(/2026-07-01 18:00/);
    expect(msg).toMatch(/Взрослых: 10/);
    expect(msg).toMatch(/Детей: 1/);
    expect(msg).toMatch(/Предзаказ/);
    expect(msg).toMatch(/Стейк × 2/);
    expect(msg).toMatch(/3000/);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- lib/booking/formatTelegram.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Создать `lib/booking/formatTelegram.ts`**

```ts
import type { BookingType } from './rules';

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
  cartItems: { name: string; qty: number; price: number }[];
  cartFoodSum: number;
  banquetPackageName?: string | null;
  comment?: string;
}

const TYPE_LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

export function formatBookingTelegram(i: TelegramBookingInput): string {
  const lines: string[] = [];
  lines.push('🍽 Новая заявка на бронь');
  lines.push(`Гость: ${i.lastName} ${i.firstName}`.trim());
  lines.push(`Телефон: ${i.phone}`);
  lines.push(`Когда: ${i.date} ${i.time}`);
  lines.push(`Гостей: взрослых ${i.adults}, детей ${i.children}`);
  if (i.hallName) lines.push(`Зал: ${i.hallName}`);
  lines.push(`Тип: ${TYPE_LABEL[i.bookingType]}`);
  if (i.bookingType === 'preorder' && i.cartItems.length > 0) {
    lines.push('Предзаказ:');
    for (const it of i.cartItems) lines.push(`  • ${it.name} × ${it.qty} — ${it.price * it.qty} ₽`);
    lines.push(`Сумма: ${i.cartFoodSum} ₽`);
  }
  if (i.bookingType === 'banquet' && i.banquetPackageName) {
    lines.push(`Банкетный пакет: ${i.banquetPackageName}`);
  }
  if (i.comment && i.comment.trim()) lines.push(`Комментарий: ${i.comment.trim()}`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- lib/booking/formatTelegram.test.ts`
Expected: PASS.

- [ ] **Step 5: Использовать в `app/api/telegram/route.ts`**

Прочитать `app/api/telegram/route.ts`. В ветке `type === 'booking'` принимать новые поля (`adults, children, bookingType, hallName, cartItems, cartFoodSum, banquetPackageName, comment`) и формировать текст через `formatBookingTelegram(...)` вместо текущей ручной сборки строки. Сохранить отправку в Telegram (тот же `sendMessage`/fetch). Обратная совместимость со старым payload не требуется (отправитель обновится в Task 7).

- [ ] **Step 6: Проверка типов и тестов**

Run: `npx tsc --noEmit` (см. оговорку про `app/page.tsx` из Task 3) и `npm test`.
Expected: `lib/booking/*` и `app/api/telegram/route.ts` чисты; модульные тесты зелёные.

- [ ] **Step 7: Commit**

```bash
git add lib/booking/formatTelegram.ts lib/booking/formatTelegram.test.ts app/api/telegram/route.ts
git commit -m "feat(booking): structured Telegram booking message"
```

---

### Task 5: Убрать проверку доступности (CRM)

**Files:**
- Modify: `app/page.tsx` (удалить вызов `useHallAvailability` и вейтлист-гейт)
- Modify: `app/components/DateTimePicker.tsx` (убрать жёлтую подсветку «занято» и легенду листа ожидания)
- Delete: `hooks/useHallAvailability.ts` (если больше нигде не импортируется)

**Interfaces:**
- Изолированное удаление. Ничего не производит для следующих задач, кроме упрощённой формы.

- [ ] **Step 1: Удалить availability из `app/page.tsx`**

Прочитать booking-секцию `app/page.tsx`. Удалить:
- импорт и вызов `useHallAvailability(...)` (переменная `availability`);
- передачу `availability` в `DateTimePicker` (проп станет не нужен);
- блок вейтлиста в `submitBooking` (`if (date && availability && availability[date]) { window.confirm(...) ... status='waitlist' }`) — `status` всегда `'new'`.

- [ ] **Step 2: Убрать подсветку «занято» в `DateTimePicker.tsx`**

Прочитать `app/components/DateTimePicker.tsx`. Сделать проп `availability` опциональным/убрать его использование: удалить вычисление `const isFull = availability?.[dayFormatted]`, жёлтый класс `bg-yellow-600` для занятых дней и легенду «Лист ожидания». Дни остаются ограниченными только админ-датами (`restricted_dates`).

- [ ] **Step 3: Удалить неиспользуемый хук**

Run:
```bash
cd /c/Users/potyl/Projects/Kongotest && grep -rn "useHallAvailability" app lib hooks --include=*.ts --include=*.tsx | grep -v "hooks/useHallAvailability.ts"
```
Expected: пусто. Затем удалить файл:
```bash
rm hooks/useHallAvailability.ts
```
Если grep что-то нашёл — сначала убрать те использования.

- [ ] **Step 4: Проверка типов**

Run: `npx tsc --noEmit`
Expected: ошибки, связанные с availability, исчезают (могут остаться ошибки из-за `BookingData.guests` из Task 3 — починятся в Task 7).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/components/DateTimePicker.tsx
git rm hooks/useHallAvailability.ts
git commit -m "refactor(booking): remove CRM availability checking and waitlist"
```

---

### Task 6: Презентационный `BookingTypeSelector`

**Files:**
- Create: `app/components/BookingTypeSelector.tsx`

**Interfaces:**
- Consumes: `BookingValidation`, `BookingType`, `TypeAvailability` (Task 1).
- Produces: компонент `BookingTypeSelector` с пропсами:
  `{ validation: BookingValidation; selectedType: BookingType | null; onSelect: (t: BookingType) => void }`.

- [ ] **Step 1: Создать `app/components/BookingTypeSelector.tsx`**

```tsx
'use client';

import React from 'react';
import type { BookingType, BookingValidation } from '@/lib/booking/rules';

const LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

type Props = {
  validation: BookingValidation;
  selectedType: BookingType | null;
  onSelect: (t: BookingType) => void;
};

export default function BookingTypeSelector({ validation, selectedType, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {validation.availableTypes.map((t) => {
          const active = selectedType === t.type;
          return (
            <button
              key={t.type}
              type="button"
              disabled={!t.allowed}
              onClick={() => t.allowed && onSelect(t.type)}
              className={`text-left rounded-xl border px-3 py-2 transition ${
                active
                  ? 'border-amber-400 bg-amber-400/10'
                  : 'border-white/15 bg-white/5 hover:bg-white/10'
              } ${!t.allowed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold text-sm">{LABEL[t.type]}</div>
              {!t.allowed && t.reason && (
                <div className="text-[11px] text-neutral-400 mt-0.5">{t.reason}</div>
              )}
            </button>
          );
        })}
      </div>

      {validation.info.map((m, i) => (
        <div key={`info-${i}`} className="text-xs text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
          {m}
        </div>
      ))}
      {validation.blocking.map((m, i) => (
        <div key={`block-${i}`} className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {m}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Проверка типов**

Run: `npx tsc --noEmit`
Expected: без новых ошибок в этом файле (ошибки из `app/page.tsx` ещё допустимы до Task 7).

- [ ] **Step 3: Commit**

```bash
git add app/components/BookingTypeSelector.tsx
git commit -m "feat(booking): BookingTypeSelector presentational component"
```

---

### Task 7: Интеграция формы в `app/page.tsx`

**Files:**
- Modify: `app/page.tsx` (поля взрослые/дети, тип брони, валидация, условные блоки, сабмит)

**Interfaces:**
- Consumes: `evaluateBooking`, `classifyHall`, `banquetPackagesForHall`, `BookingType` (Task 1); `BANQUET_PACKAGES`, `packagesForFilter` (Task 2); `composeReservationComment` (Task 3); обновлённый `createReservation` (Task 3); `BookingTypeSelector` (Task 6); `BanquetMenuModal` selectable (Task 2); `useCart` (существующий).

- [ ] **Step 1: Состояние и импорты**

Прочитать booking-секцию `app/page.tsx` (форма + `bookingData` state + `submitBooking`). Добавить импорты:
```tsx
import { evaluateBooking, classifyHall, banquetPackagesForHall, type BookingType } from '@/lib/booking/rules';
import { BANQUET_PACKAGES } from '@/lib/booking/banquetPackages';
import { composeReservationComment } from '@/lib/booking/composeReservation';
import BookingTypeSelector from './components/BookingTypeSelector';
```
В состоянии формы заменить `guests` на `adults` (default 2) и `children` (default 0), добавить `bookingType` (default `'onsite'`) и `banquetPackageId` (default `null`). Получить корзину: `const { cartItems } = useCart();` (если ещё не в скоупе) и сумму еды `const cartFoodSum = cartItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);`.

- [ ] **Step 2: Вычисление валидации**

Рядом с формой добавить:
```tsx
const selectedHall = halls.find((h: any) => String(h.id) === String(bookingData.hallId)) || null;
const hallGroup = classifyHall(selectedHall?.name);
const validation = evaluateBooking({
  adults: bookingData.adults,
  children: bookingData.children,
  eventDate: bookingData.date,
  eventTime: bookingData.time,
  now: new Date(),
  hallGroup,
  type: bookingData.bookingType,
  cartFoodSum,
});
```
(Подставить фактический источник списка залов — переменную, которую отдаёт `HallSelector`/состояние. Если список залов не поднят в этот компонент, передать `hallName` из выбранного зала тем способом, каким он уже доступен; цель — получить имя выбранного зала для `classifyHall`.)
Авто-выбор типа: в `useEffect` по изменению `validation.availableTypes`, если текущий `bookingType` недоступен — переключить на первый доступный (или оставить null, если ничего не доступно).

- [ ] **Step 3: Разметка полей и блоков**

В JSX формы:
- Заменить поле «Гостей» на два поля: «Взрослых» (number, min 1) и «Детей» (number, min 0), пишут в `adults`/`children`.
- Под полями гостей вставить `<BookingTypeSelector validation={validation} selectedType={bookingData.bookingType} onSelect={(t) => setBookingData(d => ({ ...d, bookingType: t }))} />`.
- Если `bookingType === 'preorder'`: показать сводку корзины (состав `cartItems` + `cartFoodSum`); если корзина пуста — подсказка «Наберите блюда в меню для предзаказа» (сообщения о минимуме уже идут из `validation.blocking`).
- Если `bookingType === 'banquet'`: показать кнопку «Выбрать банкетный пакет», открывающую `BanquetMenuModal` с `selectable`, `hallFilter={banquetPackagesForHall(hallGroup)}`, `selectedPackageId={bookingData.banquetPackageId}`, `onSelectPackage={(id) => setBookingData(d => ({ ...d, banquetPackageId: id }))}`. Под кнопкой — имя выбранного пакета.
- Кнопку отправки делать `disabled`, когда `!validation.canSubmit` (вместе с уже существующими проверками: согласие, телефон, имя, выбран зал, `isBookingTimeValid`). Для банкета также требовать `banquetPackageId`.

- [ ] **Step 4: Сабмит**

В `submitBooking`:
- Удалить остатки availability/waitlist (если ещё есть после Task 5).
- Собрать `banquetPackageName = BANQUET_PACKAGES.find(p => p.id === bookingData.banquetPackageId)?.name ?? null`.
- `composedComment = composeReservationComment({ adults, children, bookingType, hallName: selectedHall?.name ?? null, cartItems: bookingType==='preorder' ? cartItems.map(c => ({ name: c.name, qty: c.qty, price: c.price })) : [], cartFoodSum: bookingType==='preorder' ? cartFoodSum : 0, banquetPackageName: bookingType==='banquet' ? banquetPackageName : null, comment: bookingData.comment })`.
- Вызвать `createReservation({ ...bookingData, adults, children, bookingType, composedComment })` (новая сигнатура из Task 3).
- Telegram: отправить новый payload с полями `{ type: 'booking', firstName, lastName, phone, date, time, adults, children, bookingType, hallName, cartItems (для preorder), cartFoodSum, banquetPackageName, comment }` (роут уже умеет форматировать — Task 4).
- Сообщение успеха: «Заявка принята! Администратор свяжется с вами для подтверждения.»

- [ ] **Step 5: Проверка типов и сборка**

Run: `npx tsc --noEmit && npm test`
Expected: 0 ошибок типов; все модульные тесты зелёные (booking rules/compose/telegram + ранее существующие iiko-тесты).

- [ ] **Step 6: Ручная проверка (dev)**

Run: `npm run dev`, открыть главную, прокрутить к форме брони. Проверить:
- 2 взрослых, дата +3 дня → доступны «по факту»/«предзаказ»/«банкет» (банкет требует пакет); 10 взрослых → «по факту» отключён; 12 → только банкет; 12 на завтра → блок «позвоните администратору».
- Предзаказ: пустая корзина блокирует; набрать в меню < минимума в зале Conga → блок «доберите N ₽»; ≥ 4000 → отправка доступна; виден текст-подсказка про корзину.
- Банкет в зале Conga → только Conga-пакеты; в зале Кучера → все пакеты.
- Отправка пишет в CRM (status new) и шлёт Telegram (если токены заданы). Если CRM/Telegram недоступны локально — проверить, что форма не падает и показывает корректный статус (это среда, не код).

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat(booking): adults/children, booking types, rule validation in booking form"
```

---

## Self-Review

**Spec coverage:**
- Поля (взрослые/дети/тип/пакет) → Task 3 (тип), Task 7 (UI). ✓
- Чистый `rules.ts` (таблица, сроки, классификация, минимумы, пакеты) → Task 1. ✓
- Двухуровневое поведение + «нет типов → позвоните» → Task 1 (`evaluateBooking`), Task 6/7 (отображение). ✓
- Минимумы предзаказа по залам, жёсткая блокировка → Task 1 + Task 7. ✓
- Подсказка предзаказа про корзину → Task 1 (`info`), Task 6/7. ✓
- Банкет: зал→пакеты, выбор пакета, «свяжется администратор» → Task 1, Task 2, Task 7. ✓
- Убрать `useHallAvailability`/вейтлист/жёлтую подсветку → Task 5. ✓
- Сабмит CRM (`p_menu_type`, дети в guests_count+свод, status new) + Telegram → Task 3, Task 4, Task 7. ✓
- Оставить рабочие часы/согласие/телефон → не трогаем (Task 7 сохраняет). ✓
- Время ресторана МСК для сроков → Task 1 (константы/хелперы). ✓
- Юнит-тесты на таблицу/границы → Task 1. ✓

**Placeholder scan:** код приведён полностью в Task 1–4, 6; Task 5 и Task 7 — точечные правки большого `app/page.tsx`/компонентов, описаны по якорям (имена функций/полей) + готовый код вставок, т.к. точные номера строк в 1805-строчном файле смещаются. Это не плейсхолдеры — это инструкции интеграции с конкретным кодом.

**Type consistency:** `BookingType`/`HallGroup`/`BookingValidation`/`evaluateBooking`/`classifyHall`/`banquetPackagesForHall`/`preorderMinimum`/`composeReservationComment`/`formatBookingTelegram`/`BANQUET_PACKAGES`/`packagesForFilter`/`BookingTypeSelector` — имена согласованы между задачами и блоками Interfaces. ✓

**Риск:** Task 7 — крупная интеграция в 1805-строчный `app/page.tsx`; источник списка залов и доступ к корзине (`useCart`) в этом компоненте нужно подтвердить при реализации (реализатору указано прочитать секцию и подставить фактические переменные). Если структура не совпадёт — реализатор сообщает DONE_WITH_CONCERNS/NEEDS_CONTEXT, не ломая форму.
