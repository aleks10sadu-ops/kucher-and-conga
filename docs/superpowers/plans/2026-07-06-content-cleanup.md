# Контент-чистка Kucher&Conga — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать неактуальный/тестовый контент, добавить актуальные данные (hero-карусель, банкеты, вакансии с анкетой в Google Sheets, бар/вино как изображения, фото бизнес-ланчей), заменить старые телефоны.

**Architecture:** Next.js 16 App Router, контент частично в Supabase (`content_posts`), меню из iiko через Supabase. Новые визуальные блоки — клиентские компоненты. Анкета вакансий: форма → `/api/vacancy-apply` → Google Apps Script → Google Sheets.

**Tech Stack:** Next.js 16, React 18, Tailwind 3, framer-motion 12, Supabase, sharp, vitest.

## Global Constraints

- Спека: `docs/superpowers/specs/2026-07-06-content-cleanup-design.md`. Источник истины по банкетам — xlsx (выгрузка ниже в Task 3).
- Телефоны на сайте: только `+7 (916) 317-78-87` и `+7 (916) 297-78-87`.
- В вакансиях НЕТ кнопок «Позвонить»/«Написать в Telegram» — только анкета.
- Рабочая директория: `C:\Users\potyl\Projects\Kongotest`. Dev-сервер уже запущен на `localhost:3000` (preview-сервер `kucher-conga-web`).
- Комментарии/тексты в коде — на русском, в стиле существующего кода (4 пробела в app/, 2 в lib/components — смотреть по файлу).
- Коммит после каждой задачи. Сообщения: `feat|fix|chore: <кратко по-русски>`.

---

### Task 1: Ассеты — карусель, бар, вино

**Files:**
- Create: `public/new-dishes/slide-1.webp` … `slide-5.webp`
- Create: `public/menu-pages/bar-1.webp` … `bar-7.webp`, `public/menu-pages/wine-1.webp`, `wine-2.webp`

**Interfaces:**
- Produces: пути `/new-dishes/slide-N.webp` (Task 2) и `/menu-pages/bar-N.webp`, `/menu-pages/wine-N.webp` (Task 5).

- [ ] **Step 1: Определить порядок 5 картинок карусели.** В `C:\Users\potyl\Downloads` лежат 5 jpg от 06.07.2026 21:24 с длинными base64-подобными именами (`FFe8npqftG6...jpg`, `WPyNBiK4NPA...jpg`, `I-ByTHjOtns...jpg`, `f2mXFssgcSg...jpg`, `cDzQ3sWneKv...jpg`). Открыть каждую (Read) и определить, какая из них: (1) обложка «Новые блюда», (2) «Закуски и стартеры 2/5», (3) «Основные блюда I 3/5», (4) «Основные блюда II 4/5», (5) «Десерты 5/5».

- [ ] **Step 2: Конвертировать в webp.** Скрипт одноразовый, через установленный sharp (не коммитить):

```js
// C:\Users\potyl\AppData\Local\Temp\claude\...\scratchpad\convert.mjs — пути подставить по результату Step 1
import sharp from 'sharp';
const jobs = [
  // [источник, назначение] — порядок из Step 1
  ['C:/Users/potyl/Downloads/<обложка>.jpg', 'public/new-dishes/slide-1.webp'],
  ['C:/Users/potyl/Downloads/<закуски>.jpg', 'public/new-dishes/slide-2.webp'],
  ['C:/Users/potyl/Downloads/<основные1>.jpg', 'public/new-dishes/slide-3.webp'],
  ['C:/Users/potyl/Downloads/<основные2>.jpg', 'public/new-dishes/slide-4.webp'],
  ['C:/Users/potyl/Downloads/<десерты>.jpg', 'public/new-dishes/slide-5.webp'],
];
for (let i = 14; i <= 20; i++) jobs.push([`C:/Users/potyl/Downloads/menyu2026_mai_774_final_page-00${i}.webp`, `public/menu-pages/bar-${i - 13}.webp`]);
for (let i = 21; i <= 22; i++) jobs.push([`C:/Users/potyl/Downloads/menyu2026_mai_774_final_page-00${i}.webp`, `public/menu-pages/wine-${i - 20}.webp`]);
for (const [src, dst] of jobs) await sharp(src).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dst);
console.log('done');
```

Run: `cd C:\Users\potyl\Projects\Kongotest && node <путь к convert.mjs>` (запускать из корня проекта, чтобы разрешился sharp и относительные пути public/).

- [ ] **Step 3: Проверить.** `ls public/new-dishes public/menu-pages` → 5 + 9 файлов, каждый < 300 КБ.

- [ ] **Step 4: Commit.** `git add public/new-dishes public/menu-pages && git commit -m "feat: ассеты карусели новых блюд и страниц бар/винной карты"`

---

### Task 2: Hero-карусель «Новые блюда» вместо НГ-баннера

**Files:**
- Create: `app/components/NewDishesCarousel.tsx`
- Modify: `app/HomeClient.tsx:743-762` (блок `<a href="/events">…</a>`), `app/HomeClient.tsx:32` (импорт `events`)
- Modify: `app/data/content.ts` (удалить `events`)

**Interfaces:**
- Consumes: `/new-dishes/slide-1..5.webp` из Task 1.
- Produces: `NewDishesCarousel` — компонент без пропсов, default export.

- [ ] **Step 1: Создать компонент.**

```tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [1, 2, 3, 4, 5].map((n) => `/new-dishes/slide-${n}.webp`);
const AUTOPLAY_MS = 5000;

// Карусель анонса новых блюд на hero. Автопрокрутка, свайп, стрелки, точки.
export default function NewDishesCarousel() {
    const [index, setIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const go = useCallback((next: number) => {
        setIndex((next + SLIDES.length) % SLIDES.length);
    }, []);

    const resetTimer = useCallback(() => {
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    }, []);

    useEffect(() => {
        resetTimer();
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [resetTimer]);

    return (
        <div
            className="relative w-full h-full min-h-[280px] overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl group"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(dx) > 40) { go(dx < 0 ? index + 1 : index - 1); resetTimer(); }
            }}
        >
            {SLIDES.map((src, i) => (
                <Image
                    key={src}
                    src={src}
                    alt={`Новые блюда Kucher&Conga — слайд ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 450px"
                    className={`object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                    priority={i === 0}
                    quality={75}
                />
            ))}

            {/* Стрелки (десктоп) */}
            <button
                type="button"
                aria-label="Предыдущий слайд"
                onClick={() => { go(index - 1); resetTimer(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/60 hidden sm:block"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                type="button"
                aria-label="Следующий слайд"
                onClick={() => { go(index + 1); resetTimer(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/60 hidden sm:block"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Точки */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Слайд ${i + 1}`}
                        onClick={() => { go(i); resetTimer(); }}
                        className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-amber-400' : 'w-2 bg-white/60 hover:bg-white'}`}
                    />
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Заменить НГ-баннер в HomeClient.** Блок строк 743–762 (`<a href="/events" ...>` с `<Image src="/kongo_ng.webp" ...>`) заменить на:

```tsx
                {/* Карусель новых блюд (первым на мобильных) */}
                <div className="w-full order-1 lg:order-2 mx-auto lg:mx-0 lg:justify-self-end lg:h-full" suppressHydrationWarning>
                  <NewDishesCarousel />
                </div>
```

Добавить импорт рядом с остальными компонентами: `import NewDishesCarousel from './components/NewDishesCarousel';`
В строке 32 убрать `events` из импорта: `import { gallery } from './data/content';`

- [ ] **Step 3: Удалить `events` из content.ts** — оставить только `gallery`.

- [ ] **Step 4: Проверить на localhost.** Обновить страницу, снять скриншот: карусель на месте НГ-баннера, точки/стрелки работают, автопрокрутка листает. В консоли браузера нет ошибок. `grep -r "kongo_ng" app/` → пусто.

- [ ] **Step 5: Commit.** `git commit -am "feat: карусель новых блюд на hero вместо НГ-баннера"`

---

### Task 3: Актуальные банкетные меню (июнь 2026)

**Files:**
- Modify: `app/components/BanquetMenuModal.tsx` (функции `CongaMenu7500`, `CongaMenu6000`, `KucherMenu`, заголовки граммовок на строках 157 и 340)

**Interfaces:** без изменений внешнего API (пропсы модалки не трогаем; `MenuCard`/`Item`/`ConditionsCard` переиспользуются как есть — текст условий уже совпадает с xlsx).

Данные из xlsx (июнь 2026). Граммовки на человека: Кучер 5000 — **1350 гр.** (сейчас 1480), CONGA 6000 — **1450 гр.**, CONGA 7500 — **1435 гр.** (сейчас захардкожено 1460 для обоих CONGA).

- [ ] **Step 1: Сделать граммовку CONGA динамической.** Строка 157: `/ 1460 гр./чел.` → `/ {activeCongaMenu === '7500' ? 1435 : 1450} гр./чел.`. Строка 340 (КУЧЕР): `1480` → `1350`.

- [ ] **Step 2: Переписать состав `KucherMenu` (5000).** Заменить содержимое трёх колонок:

```tsx
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="370 гр." color="amber">
                        <Item name="Сельдь с картофелем" w="50" />
                        <Item name="Ассорти фермерских сыров" desc="с медом и горьким шоколадом: коровий выдержанный, козий выдержанный, с трюфелем, козий мягкий «Фрико», с грецким орехом, с пажитником" w="35" />
                        <Item name="Деликатесное мясное ассорти" desc="Утиный рулет с черносливом, гусиный рулет с яблоком, свиной карбонад, грудинка домашнего копчения, пармская ветчина, хрен, горчица" w="40" />
                        <Item name="Овощной букет" w="85" />
                        <Item name="Баклажанные рулетики" desc="с грецким орехом и чесноком" w="25" />
                        <Item name="Паштет из куриной печени" desc="с клюквенным конфитюром" w="50" />
                        <Item name="А-ля брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Лосось слабосолёный" w="35" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="На выбор 3 вида" weight="180 гр." color="amber">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны, сладкий перец, черри, Романо, Пармезан" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Красная рыба, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                        <Item name="Оливье с говядиной" desc="Говядина, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧАЯ ЗАКУСКА" weight="80 гр." color="amber">
                        <Item name="Хачапури по-имеретински" w="80" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="ШАШЛЫЧНЫЙ СЕТ" subtitle="с картофелем" weight="420 гр." color="amber">
                        <Item name="Баранина" w="60" />
                        <Item name="Свиная шейка" w="60" />
                        <Item name="Куриное бедро" w="60" />
                        <Item name="Люля-кебаб из говядины" w="60" />
                        <Item name="Люля-кебаб из курицы" w="60" />
                        <Item name="Картофельные дольки" w="100" />
                        <Item name="Шашлычный соус" w="20" />
                    </MenuCard>
                    <MenuCard title="ОСЕТР С ОВОЩАМИ «ЕВРОПА» НА ГРИЛЕ" weight="200 гр." color="amber">
                        <Item name="Осетр" w="100" />
                        <Item name="Овощи «Европа»" desc="Кабачок, болгарский перец, шампиньоны" w="100" />
                    </MenuCard>
                    <div className="p-3 bg-amber-600 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр./чел.</div>
                    </div>
                </div>
```

- [ ] **Step 3: Переписать состав `CongaMenu6000`.**

```tsx
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="380 гр." color="emerald">
                        <Item name="Сельдь с картофелем" w="50" />
                        <Item name="Ассорти фермерских сыров" desc="с медом и горьким шоколадом: коровий выдержанный, козий выдержанный, с трюфелем, козий мягкий «Фрико», с грецким орехом, с пажитником" w="35" />
                        <Item name="Деликатесное мясное ассорти" desc="Утиный рулет с черносливом, гусиный рулет с яблоком, свиной карбонад, грудинка домашнего копчения, пармская ветчина, хрен, горчица" w="40" />
                        <Item name="Овощной букет" desc="Помидоры, огурцы, сладкий перец, редис, зелень" w="85" />
                        <Item name="Баклажанные рулетики" desc="с грецким орехом и чесноком" w="25" />
                        <Item name="Паштет из куриной печени" desc="с клюквенным конфитюром" w="50" />
                        <Item name="А-ля брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Рыбное ассорти" desc="Масляная рыба, копчёный осётр, сёмга слабой соли" w="45" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="На выбор 3 вида" weight="180 гр." color="emerald">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны, сладкий перец, черри, Романо, Пармезан" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Красная рыба, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                        <Item name="Оливье с говядиной" desc="Говядина, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                        <Item name="С уткой и фруктовым чатни" desc="Утиное филе, яблочно-грушевый чатни, клюквенный соус, Пармезан, микс-салат, черри, гранатовый лук" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧИЕ ЗАКУСКИ" weight="170 гр." color="emerald">
                        <Item name="Хачапури по-имеретински" w="85" />
                        <Item name="Креветки «Панко»" desc="в пикантном соусе «Васаби»" w="35" />
                        <Item name="Жареный Сулугуни" desc="с клюквенным соусом" w="50" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="ШАШЛЫЧНЫЙ СЕТ" subtitle="с картофелем" weight="420 гр." color="emerald">
                        <Item name="Баранина" w="60" />
                        <Item name="Свиная шейка" w="60" />
                        <Item name="Куриное бедро" w="60" />
                        <Item name="Люля-кебаб из говядины" w="60" />
                        <Item name="Люля-кебаб из курицы" w="60" />
                        <Item name="Картофельные дольки" w="100" />
                        <Item name="Шашлычный соус" w="20" />
                    </MenuCard>
                    <MenuCard title="ОСЕТР С ОВОЩАМИ «ЕВРОПА» НА ГРИЛЕ" weight="200 гр." color="emerald">
                        <Item name="Осетр" w="100" />
                        <Item name="Овощи «Европа»" desc="Кабачок, болгарский перец, шампиньоны" w="100" />
                    </MenuCard>
                    <div className="p-3 bg-emerald-700 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр./чел.</div>
                    </div>
                </div>
```

- [ ] **Step 4: Переписать состав `CongaMenu7500`.**

```tsx
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="450 гр." color="emerald">
                        <Item name="Деликатесное мясное ассорти" desc="Утиный рулет с черносливом, гусиный рулет с яблоком, свиной карбонад, грудинка домашнего копчения, пармская ветчина, хрен, горчица" w="70" />
                        <Item name="Ассорти фермерских сыров" desc="с медом и горьким шоколадом: коровий выдержанный, козий выдержанный, с трюфелем, козий мягкий «Фрико», с грецким орехом, с пажитником" w="100" />
                        <Item name="Рыбное ассорти" desc="Масляная рыба, копчёный осётр, сёмга слабой соли" w="25" />
                        <Item name="Баклажанные рулетики" desc="с начинкой из грецкого ореха" w="25" />
                        <Item name="А-ля брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Овощной букет" w="80" />
                        <Item name="Сельдь с картофелем" w="50" />
                        <Item name="Паштет из куриной печени" desc="с клюквенным конфитюром" w="50" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="На выбор 4 вида" weight="240 гр." color="emerald">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан, домашние чипсы, соус «Цезарь»" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны, сладкий перец, черри, Романо, Пармезан" w="60" />
                        <Item name="Оливье с говядиной" desc="Говядина, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Красная рыба, горошек, картофель, морковь, яйцо, огурцы" w="60" />
                        <Item name="С уткой и фруктовым чатни" desc="Утиное филе, яблочно-грушевый чатни, клюквенный соус, Пармезан, микс-салат, черри, гранатовый лук" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧИЕ ЗАКУСКИ" weight="85 гр." color="emerald">
                        <Item name="Креветки «Панко»" desc="в пикантном соусе «Васаби»" w="35" />
                        <Item name="Жареный Сулугуни" desc="с клюквенным соусом" w="50" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="ГОРЯЧИЕ МЯСНЫЕ БЛЮДА" subtitle="порционно" weight="400 гр." color="emerald">
                        <Item name="Телячьи щёчки" desc="с запечённым бататом и сливовым соусом" w="200" />
                        <Item name="Стейк из говяжьей вырезки" desc="с картофелем «Черри» и перечным соусом" w="200" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧЕЕ РЫБНОЕ БЛЮДО" subtitle="порционно" weight="160 гр." color="emerald">
                        <Item name="Стейк из форели" desc="с птитимом и морковным гелем" w="160" />
                    </MenuCard>
                    <div className="p-3 bg-emerald-700 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр./чел.</div>
                    </div>
                </div>
```

- [ ] **Step 5: Проверить на localhost.** Открыть меню → «Банкетное меню»: вкладки CONGA (7500/6000) и Кучер показывают новые составы и граммовки (1435/1450/1350).

- [ ] **Step 6: Commit.** `git commit -am "feat: актуальные банкетные меню июнь 2026"`

---

### Task 4: Убрать Акции и Детское меню

**Files:**
- Modify: `app/components/EnhancedMenuSection.tsx:175-183` (MENU_TYPE_DEFS)
- Modify: `app/data/menuTypes.ts` (убрать записи kids и promotions)
- Delete: `app/data/kidsMenuData.ts`, `app/data/promotionsData.ts`, `app/api/dev/migrate-menu/route.ts`

**Interfaces:** после задачи ID типов меню: main, business, bar, wine, banquet.

- [ ] **Step 1: Убрать из MENU_TYPE_DEFS** строки `{ id: 'kids', ... }` и `{ id: 'promotions', ... }`.
- [ ] **Step 2: Убрать из `menuTypes.ts`** объекты с id `kids` и `promotions`.
- [ ] **Step 3: Удалить файлы** `kidsMenuData.ts`, `promotionsData.ts` и роут `app/api/dev/migrate-menu/route.ts` (единственный, кто их импортирует — проверить: `grep -r "kidsMenuData\|promotionsData\|barMenuData\|wineMenuData" app/ --include="*.ts*"`; barMenuData/wineMenuData пока НЕ удалять — их черёд в Task 5).
- [ ] **Step 4: Проверить.** `npx tsc --noEmit` без новых ошибок; на localhost вкладок «Детское» и «Акции» нет.
- [ ] **Step 5: Commit.** `git commit -am "chore: удалены акции и детское меню"`

---

### Task 5: Бар и винная карта как галерея изображений

**Files:**
- Create: `app/components/MenuImageGallery.tsx`
- Modify: `app/components/EnhancedMenuSection.tsx` (ветка рендера + принудительное включение вкладок bar/wine + скрыть поиск/фильтры для bar/wine)
- Delete: `app/data/barMenuData.ts`, `app/data/wineMenuData.ts`

**Interfaces:**
- Consumes: `/menu-pages/bar-1..7.webp`, `/menu-pages/wine-1..2.webp` (Task 1).
- Produces: `MenuImageGallery({ images: string[], alt: string })` — default export.

- [ ] **Step 1: Создать `MenuImageGallery.tsx`.**

```tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Props = { images: string[]; alt: string };

// Галерея страниц бумажного меню (бар/вино): листалка + зум по клику.
export default function MenuImageGallery({ images, alt }: Props) {
    const [index, setIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    const go = (next: number) => setIndex((next + images.length) % images.length);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="block w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl cursor-zoom-in"
                    aria-label="Увеличить страницу меню"
                >
                    <Image
                        src={images[index]}
                        alt={`${alt} — страница ${index + 1}`}
                        width={1200}
                        height={1500}
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="w-full h-auto"
                        priority
                    />
                </button>

                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Предыдущая страница"
                            onClick={() => go(index - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            type="button"
                            aria-label="Следующая страница"
                            onClick={() => go(index + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>

            <div className="mt-4 text-center text-neutral-400 text-sm">
                Страница {index + 1} из {images.length}
            </div>

            {/* Зум-оверлей */}
            {zoomed && (
                <div className="fixed inset-0 z-50 bg-black/90 overflow-auto" onClick={() => setZoomed(false)}>
                    <button
                        type="button"
                        aria-label="Закрыть"
                        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                        onClick={() => setZoomed(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <Image
                        src={images[index]}
                        alt={`${alt} — страница ${index + 1} (увеличено)`}
                        width={1200}
                        height={1500}
                        className="w-full max-w-4xl mx-auto h-auto my-8"
                    />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Включить вкладки bar/wine без данных iiko.** В `EnhancedMenuSection.tsx` фильтр `availableMenuTypes` (строка ~189): условие `d.id === 'banquet'` расширить до `['banquet', 'bar', 'wine'].includes(d.id)` — эти вкладки теперь всегда видимы (контент локальный).

- [ ] **Step 3: Ветка рендера.** Добавить импорт `import MenuImageGallery from './MenuImageGallery';`. В месте `{selectedMenuType === 'business' ? (` (строка ~616) добавить перед ним ветки:

```tsx
                {selectedMenuType === 'bar' ? (
                    <MenuImageGallery
                        images={[1, 2, 3, 4, 5, 6, 7].map((n) => `/menu-pages/bar-${n}.webp`)}
                        alt="Барная карта"
                    />
                ) : selectedMenuType === 'wine' ? (
                    <MenuImageGallery
                        images={[1, 2].map((n) => `/menu-pages/wine-${n}.webp`)}
                        alt="Винная карта"
                    />
                ) : selectedMenuType === 'business' ? (
```

- [ ] **Step 4: Скрыть поиск/фильтры для bar/wine.** Условия `selectedMenuType !== 'business'` у блоков поиска (строка ~488) и результатов (строка ~605) заменить на `!['business', 'bar', 'wine'].includes(selectedMenuType)`.

- [ ] **Step 5: Удалить `barMenuData.ts` и `wineMenuData.ts`.** Перед удалением: `grep -r "barMenuData\|wineMenuData" app/ lib/ --include="*.ts*"` → не должно остаться потребителей (migrate-menu удалён в Task 4).

- [ ] **Step 6: Проверить.** `npx tsc --noEmit`; на localhost вкладки «Бар» и «Винная карта» открывают галерею, листание и зум работают, поиск для них скрыт.

- [ ] **Step 7: Commit.** `git commit -am "feat: бар и винная карта как галерея страниц меню"`

---

### Task 6: Фото бизнес-ланчей + старый WhatsApp-номер

**Files:**
- Create: `public/business-lunch/set-1.webp` … `set-4.webp` (скачиваются скриптом)
- Modify: `app/components/BusinessLunchConstructor.tsx` (карточки сетов с фото)
- Modify: `app/data/businessLunchData.ts:305` (номер)

**Interfaces:** карточка сета получает фото по локальному пути `/business-lunch/set-N.webp`, N извлекается из имени сета (`СЕТ 1`…`СЕТ 4`).

- [ ] **Step 1: Скачать фото сетов из iiko.** Одноразовый скрипт в scratchpad (не коммитить), запускать из корня проекта:

```js
// download-bl.mjs — качает картинки Яндекс СЕТ 1-4 из внешнего меню iiko
import fs from 'node:fs';
import sharp from 'sharp';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const tokenRes = await fetch('https://api-ru.iiko.services/api/1/access_token', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiLogin: env.IIKO_API_LOGIN }),
});
const { token } = await tokenRes.json();

const menuRes = await fetch('https://api-ru.iiko.services/api/2/menu/by_id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ externalMenuId: env.IIKO_EXTERNAL_MENU_ID, organizationIds: [env.IIKO_ORGANIZATION_ID] }),
});
const menu = await menuRes.json();

const items = (menu.itemCategories || []).flatMap((c) => c.items || []);
fs.mkdirSync('public/business-lunch', { recursive: true });
for (let n = 1; n <= 4; n++) {
  const item = items.find((i) => new RegExp(`СЕТ\\s*${n}`, 'i').test(i.name || ''));
  const url = item?.itemSizes?.[0]?.buttonImageUrl;
  if (!url) { console.log(`СЕТ ${n}: картинка не найдена (имя: ${item?.name ?? 'нет позиции'})`); continue; }
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await sharp(buf).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/business-lunch/set-${n}.webp`);
  console.log(`СЕТ ${n}: ok`);
}
```

Если какой-то сет без картинки — сообщить пользователю и продолжить (карточка без фото деградирует красиво, см. Step 2).

- [ ] **Step 2: Фото в карточках сетов.** В `BusinessLunchConstructor.tsx` в кнопке выбора сета (строки ~92-104) над названием добавить фото:

```tsx
              {(() => {
                const m = s.name.match(/СЕТ\s*(\d)/i);
                return m ? (
                  <div className="relative w-full h-32 mb-2 rounded-xl overflow-hidden">
                    <Image src={`/business-lunch/set-${m[1]}.webp`} alt={s.name} fill sizes="(max-width: 640px) 100vw, 340px" className="object-cover" />
                  </div>
                ) : null;
              })()}
```

Добавить `import Image from 'next/image';`. Если файла нет, Next вернёт 404 на картинку — допустимо для сета без фото (или обернуть в проверку известных N: `['1','2','3','4'].includes(m[1])`).

- [ ] **Step 3: Номер WhatsApp.** `app/data/businessLunchData.ts:305`: `"+7 (915)-049-28-48"` → `"+7 (916) 317-78-87"`.

- [ ] **Step 4: Проверить.** На localhost вкладка «Бизнес-ланч»: карточки сетов с фото. `grep -rn "049-28-48" app/` → пусто.

- [ ] **Step 5: Commit.** `git add -A && git commit -m "feat: фото бизнес-ланчей из iiko, актуальный номер WhatsApp"`

---

### Task 7: Чистка Supabase + 5 актуальных вакансий

**Files:**
- Create: `scripts/seed-vacancies.mjs` (коммитится — пригодится при повторном наполнении)

**Interfaces:**
- Produces: в `content_posts` 5 записей category=vacancies (slugs: `ofitsiant`, `administrator`, `povar-goryachego-tseha`, `barmen-kassir`, `kalyanshchik`); category=events пуста.

- [ ] **Step 1: Создать скрипт.** Использует service role key из `.env.local`. Контент вакансий — HTML (рендерится через prose). Без телефонов и Telegram — отклик только через анкету (Task 8).

```js
// scripts/seed-vacancies.mjs — чистит тестовый контент и заливает актуальные вакансии.
// Запуск: node scripts/seed-vacancies.mjs (из корня проекта)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const block = (title, items) => `<h2>${title}</h2><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const COMMON_BONUSES = block('Социальные гарантии и бонусы', [
  'Бесплатное питание на смене',
  'Персональная скидка для сотрудника и его семьи',
  'Профессиональная команда единомышленников',
  'Помощь в адаптации и обучении',
  'Возможности профессионального роста',
]);

const VACANCIES = [
  {
    slug: 'ofitsiant',
    title: 'Официант',
    excerpt: '4000 ₽/смена + индивидуальные чаевые · гибкий график · еженедельные выплаты',
    content: [
      '<p><strong>4000 ₽/смена + индивидуальные чаевые.</strong> График гибкий, выплаты еженедельные.</p>',
      block('Требования', [
        'Опыт работы от 1 года в сфере общественного питания',
        'Ответственность и пунктуальность',
        'Активность, энергичность, трудолюбие',
        'Умение грамотно общаться с людьми',
        'Позитивный настрой и желание развиваться',
      ]),
      block('Обязанности', [
        'Консультирование гостей по меню, приём заказов, подача блюд и напитков',
        'Поддержание высокого уровня сервиса и корпоративных стандартов',
        'Подготовка зала к открытию/закрытию, чистота и порядок',
        'Вежливое общение с гостями и решение возникающих вопросов',
      ]),
      COMMON_BONUSES,
    ].join(''),
  },
  {
    slug: 'administrator',
    title: 'Администратор ресторана',
    excerpt: '6000 ₽/смена · график 5/2 · еженедельные выплаты',
    content: [
      '<p><strong>6000 ₽/смена.</strong> График 5/2 (фиксированный), полная занятость, выплаты еженедельные.</p>',
      block('Требования', [
        'Опыт работы от 3 лет в ресторанной сфере',
        'Лидерские качества и умение руководить коллективом',
        'Коммуникабельность: общий язык с гостями и сотрудниками',
        'Стрессоустойчивость и навыки разрешения конфликтных ситуаций',
        'Организаторские навыки: планирование и контроль работы',
      ]),
      block('Обязанности', [
        'Управление персоналом зала и контроль качества сервиса',
        'Консультирование гостей, решение вопросов, работа с отзывами',
        'Подготовка зала к открытию/закрытию, ежедневные планёрки',
        'Работа с банкетными заказами гостей',
      ]),
      COMMON_BONUSES,
    ].join(''),
  },
  {
    slug: 'povar-goryachego-tseha',
    title: 'Повар горячего цеха',
    excerpt: 'от 5000 ₽/смена · график 5/2 · еженедельные выплаты',
    content: [
      '<p><strong>От 5000 ₽/смена.</strong> График 5/2, выплаты еженедельные.</p>',
      block('Требования', [
        'Опыт работы в горячем цехе от 3 лет',
        'Знание технологий приготовления блюд русской, европейской и армянской кухни',
        'Медицинская книжка или готовность оформить',
        'Ответственность, внимательность к деталям, умение работать в команде',
      ]),
      block('Обязанности', [
        'Приготовление блюд по технологическим картам с соблюдением стандартов качества',
        'Контроль качества готовой продукции и соблюдение санитарных норм',
        'Разработка новых рецептов в рамках концепции ресторана',
        'Организация рабочего процесса в горячем цехе, чистота и порядок',
      ]),
      COMMON_BONUSES,
    ].join(''),
  },
  {
    slug: 'barmen-kassir',
    title: 'Бармен-кассир',
    excerpt: '4000 ₽/смена · гибкий график · обучение предоставляется, опыт не требуется',
    content: [
      '<p><strong>4000 ₽/смена.</strong> График гибкий, выплаты еженедельные. Обучение предоставляется — опыт не требуется.</p>',
      block('Требования', [
        'Внимательность к деталям и аккуратность в работе',
        'Ответственность, пунктуальность, чистоплотность',
        'Стремление к развитию и готовность к обучению',
      ]),
      block('Обязанности', [
        'Приготовление напитков и коктейлей по стандартам заведения',
        'Работа с кассой (система iiko)',
        'Консультирование гостей по барному меню',
        'Подготовка бара к открытию и закрытию смены',
      ]),
      COMMON_BONUSES,
    ].join(''),
  },
  {
    slug: 'kalyanshchik',
    title: 'Кальянщик',
    excerpt: '3000 ₽/смена + 10% от кальяна · график 5/2 · опыт от года',
    content: [
      '<p><strong>3000 ₽/смена + 10% от кальяна.</strong> График 5/2, выплаты еженедельные. Опыт работы от года.</p>',
      block('Требования', [
        'Опыт работы от года',
        'Внимательность к деталям и аккуратность в работе',
        'Ответственность, пунктуальность, соблюдение санитарных норм',
      ]),
      block('Обязанности', [
        'Консультирование гостей и приготовление кальянов',
        'Работа с системой iiko',
        'Подготовка рабочей зоны к открытию и закрытию смены',
      ]),
      COMMON_BONUSES,
    ].join(''),
  },
];

// 1. Удаляем ВСЕ старые вакансии и события (тестовые НГ ТЕСТ, повар-кондитер и пр.)
for (const category of ['vacancies', 'events']) {
  const { error, count } = await supabase.from('content_posts')
    .delete({ count: 'exact' }).eq('category', category);
  if (error) throw error;
  console.log(`Удалено из ${category}: ${count}`);
}

// 2. Заливаем актуальные вакансии
const now = new Date().toISOString();
const rows = VACANCIES.map((v) => ({ ...v, category: 'vacancies', is_published: true, published_at: now }));
const { error } = await supabase.from('content_posts').insert(rows);
if (error) throw error;
console.log(`Залито вакансий: ${rows.length}`);
```

Примечание: перед запуском вывести пользователю список УДАЛЯЕМЫХ записей (`select slug,title from content_posts where category in ('vacancies','events')`) — если там есть НЕ тестовые записи, спросить подтверждение.

- [ ] **Step 2: Запустить.** `node scripts/seed-vacancies.mjs` → «Залито вакансий: 5».
- [ ] **Step 3: Проверить.** На localhost `/vacancies` — 5 карточек; открыть «Официант» — текст без телефонов; `/events` — пустое состояние.
- [ ] **Step 4: Commit.** `git add scripts/seed-vacancies.mjs && git commit -m "feat: скрипт наполнения актуальных вакансий, чистка тестового контента"`

---

### Task 8: Анкета отклика на вакансию → Google Sheets

**Files:**
- Create: `app/components/VacancyApplyForm.tsx`
- Create: `app/api/vacancy-apply/route.ts`
- Create: `app/api/vacancy-apply/route.test.ts`
- Create: `docs/google-sheets-vacancies-setup.md`
- Modify: `app/vacancies/[slug]/page.tsx` (вставить форму после `<article>`)

**Interfaces:**
- Produces: `POST /api/vacancy-apply` — JSON body `{ vacancy, fio, phone, age?, citizenship?, experience?, medbook?, startDate?, salary?, resume?, comment? }` → `200 {ok:true}` | `400 {error}` | `502 {error}`.
- Env: `VACANCY_SHEETS_WEBHOOK_URL` (добавляется пользователем после настройки Apps Script).

- [ ] **Step 1: Написать тест роута.**

```ts
// app/api/vacancy-apply/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const makeReq = (body: unknown) =>
    new Request('http://localhost/api/vacancy-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

describe('POST /api/vacancy-apply', () => {
    beforeEach(() => {
        process.env.VACANCY_SHEETS_WEBHOOK_URL = 'https://script.google.com/test';
        vi.restoreAllMocks();
    });

    it('400 без ФИО', async () => {
        const res = await POST(makeReq({ phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(400);
    });

    it('400 без телефона', async () => {
        const res = await POST(makeReq({ fio: 'Иванов Иван', vacancy: 'Официант' }));
        expect(res.status).toBe(400);
    });

    it('200 и проксирует валидную анкету в Google Script', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
        const res = await POST(makeReq({ fio: 'Иванов Иван', phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith('https://script.google.com/test', expect.objectContaining({ method: 'POST' }));
    });

    it('502 если Google Script недоступен', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
        const res = await POST(makeReq({ fio: 'Иванов Иван', phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(502);
    });
});
```

- [ ] **Step 2: Запустить тест — он падает.** `npx vitest run app/api/vacancy-apply` → FAIL (route не существует).

- [ ] **Step 3: Написать роут.**

```ts
// app/api/vacancy-apply/route.ts — принимает анкету отклика и пишет её в Google Sheets через Apps Script.
import { NextResponse } from 'next/server';

const MAX_LEN = 1000;

const FIELDS = ['vacancy', 'fio', 'phone', 'age', 'citizenship', 'experience', 'medbook', 'startDate', 'salary', 'resume', 'comment'] as const;

export async function POST(req: Request) {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    // Только известные поля, всё в строки, с лимитом длины
    const data: Record<string, string> = {};
    for (const f of FIELDS) {
        const v = body[f];
        if (typeof v === 'string') data[f] = v.trim().slice(0, MAX_LEN);
    }

    if (!data.fio || !data.phone) {
        return NextResponse.json({ error: 'Укажите ФИО и телефон' }, { status: 400 });
    }

    const url = process.env.VACANCY_SHEETS_WEBHOOK_URL;
    if (!url) {
        console.error('VACANCY_SHEETS_WEBHOOK_URL не настроен');
        return NextResponse.json({ error: 'Приём анкет временно недоступен' }, { status: 502 });
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Apps Script status ${res.status}`);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Ошибка отправки анкеты в Google Sheets:', err);
        return NextResponse.json({ error: 'Не удалось отправить анкету, попробуйте позже' }, { status: 502 });
    }
}
```

- [ ] **Step 4: Тесты зелёные.** `npx vitest run app/api/vacancy-apply` → 4 passed.

- [ ] **Step 5: Компонент формы.**

```tsx
'use client';

import React, { useState } from 'react';

type Props = { vacancyTitle: string };

const inputCls = 'w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg outline-none text-white placeholder-neutral-500 focus:border-amber-400/50 transition';

// Анкета отклика на вакансию. Пишется в Google Таблицу через /api/vacancy-apply.
export default function VacancyApplyForm({ vacancyTitle }: Props) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setStatus('sending');
        setErrorMsg('');
        try {
            const res = await fetch('/api/vacancy-apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vacancy: vacancyTitle, ...Object.fromEntries(fd.entries()) }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Ошибка отправки');
            setStatus('ok');
            form.reset();
        } catch (err) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Ошибка отправки');
        }
    };

    if (status === 'ok') {
        return (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="text-xl font-bold mb-2">Анкета отправлена!</h3>
                <p className="text-neutral-300">Мы свяжемся с вами в ближайшее время.</p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-4">
            <h3 className="text-2xl font-bold">Откликнуться на вакансию</h3>
            <p className="text-neutral-400 text-sm">Заполните анкету — мы рассмотрим её и свяжемся с вами.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="fio" required maxLength={200} placeholder="ФИО *" className={inputCls} />
                <input name="phone" required maxLength={30} type="tel" placeholder="Телефон *" className={inputCls} />
                <input name="age" maxLength={10} inputMode="numeric" placeholder="Возраст" className={inputCls} />
                <input name="citizenship" maxLength={100} placeholder="Гражданство" className={inputCls} />
                <select name="medbook" className={inputCls} defaultValue="">
                    <option value="" disabled>Медицинская книжка</option>
                    <option value="Есть">Есть</option>
                    <option value="Нет">Нет</option>
                    <option value="Готов оформить">Готов(а) оформить</option>
                </select>
                <input name="startDate" maxLength={100} placeholder="Когда готовы выйти на работу" className={inputCls} />
                <input name="salary" maxLength={100} placeholder="Ожидания по зарплате" className={inputCls} />
                <input name="resume" maxLength={300} placeholder="Ссылка на резюме или Telegram" className={inputCls} />
            </div>

            <textarea name="experience" maxLength={1000} rows={3} placeholder="Опыт работы: где и сколько работали" className={inputCls} />
            <textarea name="comment" maxLength={1000} rows={3} placeholder="Расскажите о себе" className={inputCls} />

            {status === 'error' && <p className="text-red-400 text-sm">{errorMsg}</p>}

            <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50"
            >
                {status === 'sending' ? 'Отправляем…' : 'Отправить анкету'}
            </button>
        </form>
    );
}
```

- [ ] **Step 6: Вставить форму на страницу вакансии.** В `app/vacancies/[slug]/page.tsx`: импорт `import VacancyApplyForm from '../../components/VacancyApplyForm';`; после закрывающего `</article>` (строка ~199) добавить:

```tsx
            {/* Анкета отклика */}
            <div className="max-w-4xl mx-auto px-4 pb-8" id="apply">
                <VacancyApplyForm vacancyTitle={post.title} />
            </div>
```

- [ ] **Step 7: Инструкция Apps Script.** Создать `docs/google-sheets-vacancies-setup.md`:

````markdown
# Настройка Google Таблицы для откликов на вакансии

1. Создайте таблицу на Google Диске (например «Отклики на вакансии Kucher&Conga»).
2. Расширения → Apps Script. Удалите содержимое и вставьте:

```js
var HEADERS = ['Дата отклика', 'Вакансия', 'ФИО', 'Телефон', 'Возраст', 'Гражданство', 'Опыт работы', 'Медкнижка', 'Когда готов выйти', 'Ожидания по ЗП', 'Резюме/Telegram', 'Комментарий'];

function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var year = String(new Date().getFullYear());
  var sheet = ss.getSheetByName(year);
  if (!sheet) {
    sheet = ss.insertSheet(year, 0);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e8d2');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 160);
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm'),
    d.vacancy || '', d.fio || '', "'" + (d.phone || ''), d.age || '', d.citizenship || '',
    d.experience || '', d.medbook || '', d.startDate || '', d.salary || '', d.resume || '', d.comment || ''
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Развернуть → Новое развертывание → тип «Веб-приложение»:
   - Выполнять от имени: **Я**
   - Доступ: **Все**
4. Скопируйте URL веб-приложения (`https://script.google.com/macros/s/…/exec`).
5. Добавьте его в `.env.local` и в переменные окружения Vercel:
   `VACANCY_SHEETS_WEBHOOK_URL=<URL>`
6. Проверка: отправьте анкету с сайта — в таблице на листе текущего года появится строка.

Лист на новый год создаётся автоматически при первом отклике в этом году.
````

- [ ] **Step 8: Проверить на localhost.** Открыть вакансию → форма под текстом. Без настроенного env отправка отвечает «Приём анкет временно недоступен» (ожидаемо до Step 9). Сообщить пользователю, что нужно выполнить настройку по `docs/google-sheets-vacancies-setup.md` и прислать URL.

- [ ] **Step 9: Commit.** `git add -A && git commit -m "feat: анкета отклика на вакансию с записью в Google Sheets"`

---

### Task 9: Удаление dev/test-роутов и debug-страниц

**Files:**
- Delete: `app/api/dev/` (все оставшиеся роуты: migrate-new-year-event, migrate-business-lunch и др.), `app/api/test-env/`, `app/api/test-yandex-key/`, `app/debug-reservations/`, `test-yandex-cors.html`

- [ ] **Step 1: Проверить ссылки.** `grep -rn "api/dev\|test-env\|test-yandex-key\|debug-reservations" app/ lib/ --include="*.ts*"` — убедиться, что на удаляемое никто не ссылается из прод-кода (админ-панели/компоненты). Если ссылка есть — убрать её вместе с роутом.
- [ ] **Step 2: Удалить** перечисленные директории и файл.
- [ ] **Step 3: Проверить сборку.** `npx tsc --noEmit`, затем `npm run build` — успешно.
- [ ] **Step 4: Commit.** `git commit -am "chore: удалены dev/test-роуты и debug-страницы"`

---

### Task 10: Финальная проверка

- [ ] **Step 1: Тесты и сборка.** `npm test` (vitest) и `npm run build` — зелёные.
- [ ] **Step 2: Grep-чистота.** Все команды возвращают пусто:
  - `grep -rn "kongo_ng\|Новогод" app/`
  - `grep -rn "049-28-48" app/`
  - `grep -rn "kidsMenuData\|promotionsData\|barMenuData\|wineMenuData" app/ lib/`
- [ ] **Step 3: Прогулка по localhost:3000** (preview-инструментами, со скриншотами для пользователя):
  - Главная: карусель новых блюд, телефоны в футере/контактах верные
  - Меню: вкладки Кухня / Бизнес-ланч / Бар / Винная карта / Банкетное меню (без Детского и Акций)
  - Бар и Винная карта — галереи; Бизнес-ланч — сеты с фото
  - Банкетное меню — 3 актуальных сета
  - /vacancies — 5 вакансий, внутри анкета
  - /events — пустое состояние
- [ ] **Step 4: Commit остатков и отчёт пользователю** со скриншотами и списком: что сделано, что осталось на нём (настройка Apps Script + URL).
