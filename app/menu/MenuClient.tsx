'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Search, X } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { isDeliveryOpen, todayDeliveryWindowText } from '@/lib/delivery/schedule';
import useAdminCheck from '@/lib/hooks/useAdminCheck';
import ForestHeader from '../components/forest/ForestHeader';
import ForestFooter from '../components/forest/ForestFooter';
import MenuImageGallery from '../components/MenuImageGallery';
import {
    readFulfillmentPreference,
    readMenuSearch,
    resolveMenuCategoryDeepLink,
    resolveMenuDeepLink,
} from '@/lib/menu/deepLink';
import type { FulfillmentType } from '@/lib/delivery/types';
import { BAR_MENU_PAGES, MAIN_MENU_PAGES, WINE_MENU_PAGES } from '@/lib/menu/paperMenu';
import { MENU_TYPE_DEFS } from '@/lib/menu/menuSections';
import { startBusinessLunchRefresh, type BusinessLunchMenu } from '@/lib/menu/liveBusinessLunch';
import { buildBookingHref } from '@/lib/booking/bookingContext';
import {
    BANQUET_MENU_BOOKING_CTA,
    type BanquetPackageId,
    type BanquetSaladId,
} from '@/lib/booking/banquetPackages';

// Тяжёлые формы и модальные окна не нужны для первой отрисовки меню.
const BanquetMenuModal = dynamic(() => import('../components/BanquetMenuModal'), { ssr: false });
const BusinessLunchConstructor = dynamic(() => import('../components/BusinessLunchConstructor'), { ssr: false });
const FoodDetailModal = dynamic(() => import('../components/FoodDetailModal'), { ssr: false });
const CartDrawer = dynamic(() => import('../components/CartDrawer'), { ssr: false });
const DeliveryCheckout = dynamic(() => import('./DeliveryCheckout'), { ssr: false });
const ContentManager = dynamic(() => import('../components/ContentManager'), { ssr: false });

type MenuByType = Record<string, { categories: any[] }>;

// Меню бизнес-ланчей на неделю: картинка-афиша, которую админ загружает сам
// (категория content_posts 'business_lunch_week', берётся свежая опубликованная).
type WeeklyLunch = { image: string; title?: string | null } | null;

// Миниатюра блюда. Зеркалированные картинки (быстрый Supabase-origin) гоняем
// через оптимизатор Next → ~10–15 КБ WebP/AVIF нужного размера, иммутабельный
// edge-кеш, весь экран грузится разом. Ещё-не-зеркалированные iiko-URL (медленный
// Selectel) отдаём как есть, без оптимизатора, чтобы не ловить таймаут.
function DishThumb({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);
    if (broken) return null;
    const optimize =
        src.includes('/storage/v1/object/public/') ||
        src.startsWith('/media/supabase/');
    if (optimize) {
        return (
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 639px) 46vw, (max-width: 1279px) 30vw, 285px"
                quality={60}
                className="object-cover"
                onError={() => setBroken(true)}
            />
        );
    }
    return <img src={src} alt={alt} width={600} height={600} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />;
}

type DishCardProps = {
    item: any;
    stopped: boolean;
    quantity: number;
    onOpen: () => void;
    onSetQuantity: (quantity: number) => void;
};

function DishCard({ item, stopped, quantity, onOpen, onSetQuantity }: DishCardProps) {
    const requiresChoice = Boolean(item.variants?.length || item.modifierGroups?.length);
    const weight = item.weight
        ? typeof item.weight === 'number' ? `${item.weight} г` : item.weight
        : item.volume && item.volume_unit ? `${item.volume} ${item.volume_unit}` : null;

    const activate = () => {
        if (!stopped) onOpen();
    };

    return (
        <article
            aria-disabled={stopped}
            onClick={activate}
            className={`group min-w-0 rounded-[1.35rem] border border-white/[0.07] bg-white/[0.035] p-2.5 transition duration-300 sm:p-3 xl:rounded-[1.15rem] xl:p-2 ${
                stopped
                    ? 'cursor-not-allowed opacity-55'
                    : 'cursor-pointer hover:-translate-y-1 hover:border-brass/30 hover:bg-white/[0.055] hover:shadow-[0_20px_50px_rgba(0,0,0,0.24)]'
            }`}
        >
            <div className="relative aspect-square overflow-hidden rounded-[1.05rem] bg-forest-mid lg:aspect-[4/3] xl:rounded-[0.9rem]">
                {item.image ? (
                    <DishThumb src={item.image} alt={item.name} />
                ) : (
                    <div className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-cream/35">
                        Фото скоро появится
                    </div>
                )}

                {stopped && (
                    <div className="absolute inset-0 grid place-items-center bg-forest-ink/75 px-3 text-center">
                        <span className="rounded-full border border-white/20 bg-forest-ink/80 px-3 py-1.5 text-[11px] font-semibold text-cream sm:text-xs">
                            Временно недоступно
                        </span>
                    </div>
                )}

                {!stopped && item.price ? (
                    <div
                        className="absolute bottom-2.5 right-2.5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {requiresChoice ? (
                            <button
                                type="button"
                                onClick={onOpen}
                                aria-label={`Выбрать ${item.name}`}
                                className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-cream text-forest-ink shadow-lg shadow-black/30 transition hover:scale-105 hover:bg-white sm:h-12 sm:w-12 xl:h-10 xl:w-10"
                            >
                                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        ) : quantity === 0 ? (
                            <button
                                type="button"
                                onClick={() => onSetQuantity(1)}
                                aria-label={`Добавить ${item.name} в корзину`}
                                className="grid h-11 w-11 place-items-center rounded-full bg-terracotta text-[#FBF3EA] shadow-lg shadow-black/30 transition hover:scale-105 hover:bg-terracotta-dark sm:h-12 sm:w-12 xl:h-10 xl:w-10"
                            >
                                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-forest-ink/95 p-1 shadow-lg shadow-black/30">
                                <button
                                    type="button"
                                    onClick={() => onSetQuantity(quantity - 1)}
                                    aria-label={`Уменьшить количество ${item.name}`}
                                    className="grid h-8 w-8 place-items-center rounded-full text-cream transition hover:bg-white/10"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[1.5rem] text-center text-sm font-bold text-cream">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => onSetQuantity(quantity + 1)}
                                    aria-label={`Увеличить количество ${item.name}`}
                                    className="grid h-8 w-8 place-items-center rounded-full bg-terracotta text-[#FBF3EA] transition hover:bg-terracotta-dark"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            <div className="px-1 pb-1 pt-3 sm:px-1.5 sm:pt-4 xl:pt-2.5">
                {item.price ? (
                    <div className="mb-1 text-lg font-black tracking-tight text-brass sm:text-xl xl:text-lg">
                        {item.price.toLocaleString('ru-RU')} ₽
                    </div>
                ) : null}
                <h3 className="min-h-[2.6rem] sm:min-h-[3rem] xl:min-h-[2.5rem]">
                    <button
                        type="button"
                        disabled={stopped}
                        onClick={onOpen}
                        className="w-full overflow-hidden text-left font-display text-[15px] font-bold leading-[1.28] text-cream transition-colors group-hover:text-white disabled:cursor-not-allowed sm:text-lg xl:text-base"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    >
                        {item.name}
                    </button>
                </h3>
                <div className="mt-0.5 min-h-5 text-xs text-cream/45 sm:text-sm xl:text-xs">
                    {weight || (requiresChoice ? 'Есть варианты на выбор' : '\u00A0')}
                </div>
            </div>
        </article>
    );
}

// Меню приходит пропсом из серверного компонента (ISR): страница отдаётся с CDN
// уже с блюдами и ценами — ни «Загрузка меню…», ни запроса к iiko на пути пользователя.
export default function MenuClient({ initialMenu, weeklyLunch = null }: { initialMenu: MenuByType; weeklyLunch?: WeeklyLunch }) {
    const router = useRouter();
    const [liveBusiness, setLiveBusiness] = useState<BusinessLunchMenu | null>(null);
    useEffect(() => startBusinessLunchRefresh(setLiveBusiness), []);
    const menuByType = useMemo<MenuByType>(
        () => ({ ...(initialMenu || {}), delivery: initialMenu?.main || { categories: [] } } as MenuByType),
        [initialMenu],
    );
    const { isAdmin } = useAdminCheck();
    const [weekManagerOpen, setWeekManagerOpen] = useState(false);
    const firstKey = 'delivery';
    const [activeType, setActiveType] = useState<string>(firstKey);
    const [isBanquetOpen, setIsBanquetOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>(menuByType[firstKey]?.categories?.[0]?.id || '');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [preferredFulfillmentType, setPreferredFulfillmentType] = useState<FulfillmentType>('delivery');

    useEffect(() => {
        let frameId: number | null = null;

        const activateDeepLink = () => {
            const requestedType = resolveMenuDeepLink(window.location.hash, menuByType, firstKey);
            if (requestedType === 'banquet') {
                setIsBanquetOpen(true);
                return;
            }
            const requestedCategories = menuByType[requestedType]?.categories || [];
            const requestedCategory = resolveMenuCategoryDeepLink(
                window.location.search,
                requestedType,
                requestedCategories,
            );
            setActiveType(requestedType);
            setActiveCategory(requestedCategory || requestedCategories[0]?.id || '');
            setQuery(readMenuSearch(window.location.search, requestedType));
            setPreferredFulfillmentType(readFulfillmentPreference(window.location.search));

            if (requestedCategory) {
                frameId = window.requestAnimationFrame(() => {
                    const element = document.getElementById(requestedCategory);
                    if (!element) return;
                    const offset = window.innerWidth >= 1280 ? 132 : 172;
                    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                });
            }
        };

        activateDeepLink();
        window.addEventListener('hashchange', activateDeepLink);
        return () => {
            window.removeEventListener('hashchange', activateDeepLink);
            if (frameId !== null) window.cancelAnimationFrame(frameId);
        };
    }, [firstKey, menuByType]);

    // Заказ: корзина + модалка блюда + оформление доставки
    const cart = useCart();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [deliveryOpen, setDeliveryOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    // График приёма доставок (МСК): вне окна показываем баннер вверху страницы.
    // Рендерим только после mounted (страница — ISR-пререндер, на сервере время другое).
    // Пересчёт раз в полминуты — окно открывается/закрывается без перезагрузки.
    const [scheduleOpen, setScheduleOpen] = useState(true);
    useEffect(() => {
        setScheduleOpen(isDeliveryOpen());
        const id = setInterval(() => setScheduleOpen(isDeliveryOpen()), 30_000);
        return () => clearInterval(id);
    }, []);
    // Стоп-лист iiko: недоступные блюда помечаются и не добавляются в корзину
    // (страница — ISR раз в 10 минут, стопы свежее: /api/stop-list кешируется на минуту).
    const [stopSet, setStopSet] = useState<Set<string>>(new Set());
    useEffect(() => {
        setMounted(true);
        fetch('/api/stop-list')
            .then((r) => r.json())
            .then((d) => setStopSet(new Set<string>((d?.productIds || []).map(String))))
            .catch(() => {});
    }, []);
    const isStopped = (it: any) => stopSet.has(String(it.id));

    const businessMenu = liveBusiness ?? menuByType.business;
    const availableTypes = MENU_TYPE_DEFS.filter(
        (t) => ['delivery', 'main', 'bar', 'wine', 'banquet'].includes(t.id) || ((t.id === 'business' ? businessMenu : menuByType[t.id])?.categories?.length ?? 0) > 0,
    );
    const categories = activeType === 'main' ? [] : ((activeType === 'business' ? businessMenu : menuByType[activeType])?.categories || []);

    // Быстрый поиск по названию/описанию/тегам блюда в текущем разделе меню.
    const q = query.trim().toLowerCase();
    const itemMatches = (it: any) =>
        !q || [it.name, it.description, it.type, it.grape].some((v) => String(v || '').toLowerCase().includes(q));
    const shownCategories = q
        ? categories.map((c: any) => ({ ...c, items: c.items.filter(itemMatches) })).filter((c: any) => c.items.length)
        : categories;

    const selectType = (id: string) => {
        window.history.replaceState(null, '', `#${id}`);
        setQuery('');
        if (id === 'banquet') { setIsBanquetOpen(true); return; }
        setActiveType(id);
        const cats = menuByType[id]?.categories || [];
        setActiveCategory(cats[0]?.id || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToCategory = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = document.getElementById(categoryId);
        if (element) {
            const offset = 172;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }
        setIsMenuOpen(false);
    };

    const pill = (active: boolean) =>
        `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active ? 'bg-terracotta text-[#FBF3EA]' : 'border border-white/10 bg-white/[0.04] text-cream/75 hover:bg-white/[0.09]'
        }`;

    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink pb-24 font-body text-cream">
                {/* Компактный заголовок */}
                <section className="relative overflow-hidden border-b border-white/5 px-5 pb-5 pt-7 md:px-8 md:pb-5 md:pt-8 xl:py-5">
                    <Image
                        src="/hero-image.webp"
                        alt=""
                        aria-hidden
                        fill
                        loading="eager"
                        fetchPriority="high"
                        sizes="100vw"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/90 via-forest-ink/95 to-forest-ink" />
                    <div className="relative z-10 mx-auto max-w-[1280px]">
                        <span className="text-[13px] uppercase tracking-[0.18em] text-brass xl:text-xs">Кухня, бар, доставка и самовывоз</span>
                        <h1 className="mt-1.5 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-black leading-[1.05] text-cream xl:text-4xl">Меню</h1>
                    </div>
                </section>

                {/* Вне графика доставки — баннер с расписанием на сегодня.
                    В рабочее время гость ничего не видит. */}
                {mounted && !scheduleOpen && ['delivery', 'business'].includes(activeType) && (
                    <div className="border-b border-brass/25 bg-brass/10 px-5 py-3 md:px-8">
                        <div className="mx-auto max-w-[1000px] text-sm text-cream">
                            <span className="font-semibold text-brass">Сейчас доставка не принимается.</span>{' '}
                            Приём заказов сегодня: <span className="font-semibold">{todayDeliveryWindowText()}</span> (по Москве).
                            Меню можно смотреть и собирать корзину — оформить доставку получится в рабочее время.
                        </div>
                    </div>
                )}

                {/* Липкая навигация: типы меню + категории */}
                <div className="sticky top-16 z-30 border-b border-white/10 bg-forest-ink/90 backdrop-blur-md">
                    <div className="mx-auto max-w-[1280px] px-5 py-3 md:px-8 xl:py-2.5">
                        <div className="xl:flex xl:items-center xl:gap-3">
                            {availableTypes.length > 1 && (
                                <div className="mb-2 flex flex-wrap gap-2 xl:mb-0 xl:flex-none">
                                    {availableTypes.map((t) => (
                                        <button key={t.id} onClick={() => selectType(t.id)} className={pill(activeType === t.id && t.id !== 'banquet')}>
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!['main', 'business', 'bar', 'wine'].includes(activeType) && (
                                <div className="relative mb-2 xl:mb-0 xl:min-w-0 xl:flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Поиск по меню…"
                                        aria-label="Поиск по меню"
                                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-9 text-sm text-cream placeholder-cream/40 outline-none transition focus:border-brass/50"
                                    />
                                    {query && (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            aria-label="Очистить поиск"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-cream/50 transition-colors hover:bg-white/10 hover:text-cream"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {activeType !== 'business' && categories.length > 0 && !q && (
                            <>
                                <div className="scrollbar-brass hidden gap-5 overflow-x-auto pb-1 md:flex xl:mt-2">
                                    {categories.map((category: any) => (
                                        <button
                                            key={category.id}
                                            onClick={() => scrollToCategory(category.id)}
                                            className={`whitespace-nowrap border-b-2 pb-1 text-sm font-medium transition-colors ${
                                                activeCategory === category.id ? 'border-brass text-brass' : 'border-transparent text-cream/55 hover:text-cream'
                                            }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative md:hidden">
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-cream/80"
                                    >
                                        <span className="truncate">{categories.find((c: any) => c.id === activeCategory)?.name || 'Выберите категорию'}</span>
                                        <span className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>▼</span>
                                    </button>
                                    <AnimatePresence>
                                        {isMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-forest py-2 shadow-2xl"
                                            >
                                                {categories.map((category: any) => (
                                                    <button
                                                        key={category.id}
                                                        onClick={() => scrollToCategory(category.id)}
                                                        className={`block w-full px-4 py-3 text-left text-sm transition-colors ${
                                                            activeCategory === category.id ? 'bg-brass/10 text-brass' : 'text-cream/60 hover:bg-white/5 hover:text-cream'
                                                        }`}
                                                    >
                                                        {category.name}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Контент */}
                <div className="mx-auto max-w-[1280px] px-3 pt-6 sm:px-5 md:px-8 md:pt-7 xl:pt-5">
                    {activeType === 'main' ? (
                        <section className="mx-auto max-w-[900px]">
                            <div className="mb-6 text-center">
                                <h2 className="font-display text-3xl font-black text-cream md:text-4xl">Основное меню</h2>
                                <p className="mt-2 text-sm text-cream/55">Бумажное меню ресторана. Листайте 13 страниц стрелками или нажмите на изображение, чтобы увеличить.</p>
                            </div>
                            <MenuImageGallery key="main-menu" images={MAIN_MENU_PAGES} alt="Основное меню ресторана" />
                        </section>
                    ) : activeType === 'bar' ? (
                        <section className="mx-auto max-w-[900px]">
                            <div className="mb-6 text-center">
                                <h2 className="font-display text-3xl font-black text-cream md:text-4xl">Барное меню</h2>
                                <p className="mt-2 text-sm text-cream/55">Листайте страницы стрелками или нажмите на изображение, чтобы увеличить.</p>
                            </div>
                            <MenuImageGallery key="bar-menu" images={BAR_MENU_PAGES} alt="Барное меню" />
                        </section>
                    ) : activeType === 'wine' ? (
                        <section className="mx-auto max-w-[900px]">
                            <div className="mb-6 text-center">
                                <h2 className="font-display text-3xl font-black text-cream md:text-4xl">Винная карта</h2>
                                <p className="mt-2 text-sm text-cream/55">Листайте страницы стрелками или нажмите на изображение, чтобы увеличить.</p>
                            </div>
                            <MenuImageGallery key="wine-menu" images={WINE_MENU_PAGES} alt="Винная карта" />
                        </section>
                    ) : activeType === 'business' ? (
                        <div className="mx-auto max-w-3xl space-y-6">
                            {/* Меню бизнес-ланчей на неделю (афиша от админа) */}
                            {(weeklyLunch?.image || isAdmin) && (
                                <section>
                                    <div className="mb-2.5 flex items-center justify-between gap-3">
                                        <h2 className="font-display text-xl font-bold text-cream md:text-2xl">Бизнес-ланч на неделю</h2>
                                        {isAdmin && (
                                            <button
                                                onClick={() => setWeekManagerOpen(true)}
                                                className="rounded-lg border border-brass/40 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-brass transition-colors hover:bg-white/[0.08]"
                                            >
                                                Обновить картинку
                                            </button>
                                        )}
                                    </div>
                                    {weeklyLunch?.image ? (
                                        <a href={weeklyLunch.image} target="_blank" rel="noopener noreferrer" title="Открыть в полном размере" className="group relative block h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] sm:h-56">
                                            <img src={weeklyLunch.image} alt={weeklyLunch.title || 'Бизнес-ланч на неделю'} width={1200} height={630} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.015]" />
                                            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-cream sm:px-5 sm:pb-4">
                                                <span>Открыть полное меню недели</span>
                                                <span className="shrink-0 text-xs font-medium text-cream/70">В полном размере ↗</span>
                                            </span>
                                        </a>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center text-sm text-cream/50">
                                            Картинка меню на неделю ещё не загружена. Нажмите «Обновить картинку».
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Конструктор сета: виден всегда, заказ — только в рабочее окно */}
                            <BusinessLunchConstructor
                                sets={categories.flatMap((c: any) => c.items)}
                                stopSet={stopSet}
                                // cart.add с тем же id заменяет количество, а не суммирует —
                                // повторное «Добавить» того же набора должно давать +1 (условие «от 2 ланчей»).
                                onAddToCart={(item) => {
                                    const existing = cart.items.find((c) => c.id === item.id);
                                    cart.add({ ...item, qty: (existing?.qty || 0) + item.qty });
                                }}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto max-w-[1240px] space-y-12 md:space-y-16">
                            {activeType === 'delivery' && categories.length === 0 && (
                                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center">
                                    <h2 className="font-display text-2xl font-bold text-cream">Меню доставки обновляется</h2>
                                    <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-cream/65">Попробуйте обновить страницу через минуту или позвоните нам — подскажем актуальные позиции.</p>
                                </div>
                            )}
                            {q && shownCategories.length === 0 && (
                                <p className="py-16 text-center text-cream/55">По запросу «{query}» ничего не нашлось.</p>
                            )}
                            {shownCategories.map((category: any) => (
                                <section key={category.id} id={category.id} className="scroll-mt-[172px] xl:scroll-mt-[132px]">
                                    <h2 className="mb-6 font-display text-2xl font-black tracking-tight text-cream md:mb-6 md:text-3xl xl:mb-4">
                                        {category.name}
                                    </h2>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-4 xl:gap-y-5">
                                        {category.items.map((item: any) => {
                                            const quantity = cart.items.find((cartItem) => cartItem.id === item.id)?.qty || 0;
                                            return (
                                                <DishCard
                                                    key={item.id}
                                                    item={item}
                                                    stopped={isStopped(item)}
                                                    quantity={quantity}
                                                    onOpen={() => setSelectedItem(item)}
                                                    onSetQuantity={(nextQuantity) => cart.add({
                                                        id: item.id,
                                                        name: item.name,
                                                        price: item.price,
                                                        weight: item.weight || '',
                                                        img: item.image,
                                                        qty: nextQuantity,
                                                        productId: String(item.id),
                                                    })}
                                                />
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Наверх"
                    className="fixed bottom-8 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta font-bold text-[#FBF3EA] shadow-lg transition-transform hover:scale-110 hover:bg-terracotta-dark"
                >
                    ↑
                </button>

                {/* Корзина — плавающая кнопка */}
                {cart.count > 0 && (
                    <button
                        onClick={() => setCartOpen(true)}
                        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-terracotta px-6 py-3.5 font-semibold text-[#FBF3EA] shadow-xl shadow-black/40 transition-colors hover:bg-terracotta-dark"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        Корзина · {cart.count} · {cart.total.toLocaleString('ru-RU')} ₽
                    </button>
                )}

                {selectedItem && (
                    <FoodDetailModal
                        item={selectedItem}
                        isOpen
                        onClose={() => setSelectedItem(null)}
                        onAddToCart={cart.add}
                        cartItems={cart.items}
                        stopSet={stopSet}
                    />
                )}
                {mounted && cartOpen && (
                    <CartDrawer
                        isOpen
                        onClose={() => setCartOpen(false)}
                        items={cart.items}
                        onAdd={cart.add}
                        onDecrement={cart.dec}
                        onRemove={cart.remove}
                        count={cart.count}
                        total={cart.total}
                        onDeliveryClick={() => { setCartOpen(false); setDeliveryOpen(true); }}
                        isMounted
                    />
                )}
                {deliveryOpen && (
                    <DeliveryCheckout
                        items={cart.items}
                        subtotal={cart.total}
                        initialFulfillmentType={preferredFulfillmentType}
                        onClose={() => setDeliveryOpen(false)}
                        onSuccess={() => cart.clear()}
                    />
                )}

                {isBanquetOpen && (
                    <BanquetMenuModal
                        isOpen
                        onClose={() => setIsBanquetOpen(false)}
                        selectable
                        hallFilter="all"
                        confirmLabel={BANQUET_MENU_BOOKING_CTA}
                        onSelectPackage={(packageId: BanquetPackageId, saladIds: BanquetSaladId[]) => {
                            router.push(buildBookingHref({
                                source: 'banquet-menu',
                                bookingType: 'banquet',
                                banquetPackageId: packageId,
                                saladIds,
                            }));
                        }}
                    />
                )}
                {isAdmin && weekManagerOpen && (
                    <ContentManager category="business_lunch_week" isOpen={weekManagerOpen} onClose={() => setWeekManagerOpen(false)} />
                )}
            </main>
            <ForestFooter />
        </>
    );
}
