# Вкладки меню + конструктор бизнес-ланча на iiko-модификаторах — дизайн (подпроект A)

**Дата:** 2026-06-28
**Проект:** Kongotest (`kucher-conga-website`, Next.js 16 / App Router, Vercel)
**Статус:** дизайн одобрен пользователем (подход A); на ревью спека

## Цель

Вернуть на сайт вкладки меню (Кухня / Бизнес-ланч / Бар / Винная карта / Банкетное /
Детское / Акции) после перехода на iiko-«единственный источник», и реализовать
**конструктор бизнес-ланча на модификаторах iiko**. Кухня и бизнес-ланч — из iiko;
Бар/Вино/Детское/Акции — из существующих статичных файлов; Банкет — модалка.

## Решения (одобрены)

- Источник Бар/Вино/Детское/Акции — **статичные файлы** (`barMenuData`, `wineMenuData`,
  `kidsMenuData`, `promotionsData`), которые сейчас «мертвы» для UI.
- **Бизнес-ланч** — отдельная вкладка с конструктором: 4 сета iiko, в каждом выбор по
  группам модификаторов; собранный сет → в корзину по цене сета. Категория «БИЗНЕС ЛАНЧ»
  убирается из грида «Кухня».
- Модификаторы iiko маппятся **обобщённо** (но единственный потребитель сейчас —
  конструктор бизнес-ланча; в меню «Яндекс» модификаторы есть только у сетов).
- Охват — **главная (`EnhancedMenuSection`) и витрина `/menu`**.
- Архитектура — **подход A**: единый серверный модуль-слияние, оба экрана потребляют один формат.

## Текущее состояние (из карты кода)

- `lib/iiko/mapMenu.ts` возвращает `{ main: { categories } }` (18 категорий iiko, вкл.
  «БИЗНЕС ЛАНЧ»); `itemModifierGroups` **отбрасываются** (в `types.ts` — `unknown[]`).
- `EnhancedMenuSection.tsx`: `availableMenuTypes` строится из ключей iiko (только `main`),
  таб-бар скрыт при одном типе; `getMenuDataByType` сведён к `default: return null`;
  ветка `selectedMenuType === 'business'` рендерит `BusinessLunchBuilder` (на статике);
  `handleMenuTypeChange('banquet')` открывает `BanquetMenuModal`.
- `BusinessLunchBuilder.tsx` (734 стр.) — конструктор на `businessLunchData` (+ Supabase override).
- `BanquetMenuModal.tsx` — модалка (view-only + selectable для броней).
- `/menu` (`app/menu/page.tsx`) — рендерит только `data.main.categories`, без вкладок.

## Архитектура (подход A)

### 1. Модификаторы iiko → данные

- `lib/iiko/types.ts`: типизировать сырой модификатор:
  `IikoModifierGroup { name; description?; restrictions?: { minQuantity; maxQuantity; byDefault }; items?: IikoModifierItem[]; itemGroupId?; sku? }`,
  `IikoModifierItem { sku?; name; itemId?; prices?: IikoPrice[] }`.
  Поле `IikoItemSize.itemModifierGroups?: IikoModifierGroup[]`.
- `types/index.ts`: добавить
  `ModifierOption { id: string; name: string; price: number }`,
  `ModifierGroup { id: string; name: string; min: number; max: number; options: ModifierOption[] }`,
  и `MenuItem.modifierGroups?: ModifierGroup[]`.
- `lib/iiko/mapMenu.ts`:
  - функция `mapModifierGroups(size)` → `ModifierGroup[]` (id = `itemGroupId || sku`;
    `min = restrictions?.minQuantity ?? 0`; `max = restrictions?.maxQuantity ?? 1`;
    options из `group.items` → `{ id: itemId||sku, name, price: prices?.[0]?.price ?? 0 }`);
    группы без опций отбрасываются.
  - на каждое блюдо проставлять `modifierGroups` (непустые) — фактически только у сетов.
  - **Разделение ключей:** категорию с именем `БИЗНЕС ЛАНЧ` выносить под ключ `business`,
    остальные — под `main`. Итог `mapExternalMenu` → `{ main: {categories}, business: {categories} }`
    (если в меню нет БИЗНЕС-ЛАНЧ — `business` пустой/отсутствует).

### 2. Слияние `lib/menu/getFullMenu.ts`

- `normalizeStatic(data): MenuCategory[]` — приводит статичные `*.categories` к `MenuCategory[]`
  (гарантирует `id/name/items[]`, у item — `id/name/price/description/weight/image`,
  лишние поля бара/вина — passthrough; винные `price_750/price_125` → `variants`).
- `getFullMenu(): Promise<Record<string, { categories: MenuCategory[] }>>` —
  собирает `{ main, business }` из `getIikoMenu()` + `{ bar, wine, kids, promotions }` из
  нормализованной статики. Пустые ключи (нет категорий) опускаются.
- Чистая часть (нормализация + сборка ключей из переданных частей) — юнит-тестируемая;
  сетевой `getIikoMenu` инжектируется/мокается в тестах.

### 3. Переключатель `getMenuData` и точки потребления

- `app/actions/getMenu.ts → getMenuData()` теперь возвращает `getFullMenu()` (формат
  `Record<slug,{categories}>`). Stale-fallback iiko сохраняется (для `main`/`business`).
- `lib/menu/getMenuByType.ts` — отдаёт `getFullMenu()[slug]?.categories`.

### 4. Вкладки на главной (`EnhancedMenuSection.tsx`)

- `availableMenuTypes`: фиксированный список с подписями и порядком, фильтруемый по наличию
  данных в загруженном меню + спец-вкладка «Банкетное меню»:
  `main → Кухня`, `business → Бизнес-ланч`, `bar → Бар`, `wine → Винная карта`,
  `banquet → Банкетное меню` (спец), `kids → Детское`, `promotions → Акции`.
  Вкладка показывается, если для её slug есть категории (кроме `banquet` — всегда, это модалка).
- `getMenuDataByType(slug)` возвращает категории из загруженного `Record<slug,…>`.
- `selectedMenuType === 'business'` → рендер переработанного конструктора (см. §5)
  вместо грида. `handleMenuTypeChange('banquet')` → открывает `BanquetMenuModal` (view-only).
- Таб-бар (lines ~447–463) показывается при `length > 1` (теперь типов несколько).

### 5. Конструктор бизнес-ланча

- Переработать `BusinessLunchBuilder.tsx` (или новый `BusinessLunchConstructor.tsx`):
  источник — сеты из `business` (каждый сет = `MenuItem` c `modifierGroups`), а НЕ
  `businessLunchData`. UI:
  - список сетов (название + цена сета);
  - для выбранного сета — по каждой `ModifierGroup` выбор опции (radio; до `max`,
    обычно 1); группа с `min ≥ 1` обязательна;
  - кнопка «Добавить» активна, когда все обязательные группы выбраны; добавляет в корзину
    одну позицию: `id` = `setId` + хэш выбранных опций, `name` = имя сета, `price` = цена сета,
    в составе позиции — выбранные опции (для отображения в корзине/Telegram).
- Зависимость от `businessLunchData`/Supabase-таблиц бизнес-ланча удаляется из этого пути
  (статический файл может остаться в репо, но UI его не использует).

### 6. Витрина `/menu` (`app/menu/page.tsx`)

- Добавить таб-бар по тем же ключам (Кухня/Бизнес-ланч/Бар/Винная карта/Банкетное/Детское/Акции).
- Рендер категорий выбранной вкладки карточками (как сейчас на `/menu`).
- Вкладка «Бизнес-ланч» — сеты read-only (название, цена, состав групп/опций; без корзины).
- Вкладка «Банкетное» — открывает `BanquetMenuModal` (view-only). Витрина без корзины.

### 7. Статичные данные

- Бар/Вино/Детское/Акции берутся из существующих файлов через `normalizeStatic`.
  Эти позиции добавляемы в корзину на главной (как обычные карточки). Цены/состав
  правятся только в коде (вне scope — редактор).

## Тестирование

- Юнит-тесты `lib/iiko/mapMenu.ts`: маппинг `modifierGroups` (id/min/max/options, фильтр
  пустых групп), вынос категории «БИЗНЕС ЛАНЧ» в ключ `business`, отсутствие БИЗНЕС-ЛАНЧ → нет ключа.
- Юнит-тесты `lib/menu/getFullMenu.ts`: набор ключей при наличии/отсутствии частей,
  `normalizeStatic` (форма item, винные variants), опускание пустых ключей.
- Ручная проверка (dev): на главной видны все вкладки с данными; переключение работает;
  «Бизнес-ланч» — конструктор собирает сет и кладёт в корзину; «Банкетное» — модалка;
  на `/menu` те же вкладки, бизнес-ланч read-only.

## Вне scope (YAGNI)

- Редактирование статики/цен бара/вина/детского/акций (правки в коде).
- Полноценный конструктор бизнес-ланча на `/menu` (там — read-only состав).
- Перенос Бар/Вино в iiko (отдельные внешние меню) — отдельная задача, если потребуется.
- Модификаторы у обычных блюд (в текущем меню их нет; маппинг общий, но не используется).
- Подпроект C (дизайн-проход) — отдельным циклом.
