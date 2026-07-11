'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Search, X } from 'lucide-react';
import BanquetMenuModal from '../components/BanquetMenuModal';
import BusinessLunchConstructor from '../components/BusinessLunchConstructor';
import FoodDetailModal from '../components/FoodDetailModal';
import CartDrawer from '../components/CartDrawer';
import DeliveryCheckout from './DeliveryCheckout';
import { useCart } from '@/lib/hooks/useCart';
import ForestHeader from '../components/forest/ForestHeader';
import ForestFooter from '../components/forest/ForestFooter';

type MenuByType = Record<string, { categories: any[] }>;

// Миниатюра блюда. Зеркалированные картинки (быстрый Supabase-origin) гоняем
// через оптимизатор Next → ~10–15 КБ WebP/AVIF нужного размера, иммутабельный
// edge-кеш, весь экран грузится разом. Ещё-не-зеркалированные iiko-URL (медленный
// Selectel) отдаём как есть, без оптимизатора, чтобы не ловить таймаут.
function DishThumb({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);
    if (broken) return null;
    const optimize = src.includes('/storage/v1/object/public/');
    if (optimize) {
        return (
            <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 80px, 128px"
                className="object-cover"
                onError={() => setBroken(true)}
            />
        );
    }
    return <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />;
}

const TYPE_ORDER = ['main', 'business', 'bar', 'wine', 'kids', 'promotions'];

// Меню приходит пропсом из серверного компонента (ISR): страница отдаётся с CDN
// уже с блюдами и ценами — ни «Загрузка меню…», ни запроса к iiko на пути пользователя.
export default function MenuClient({ initialMenu }: { initialMenu: MenuByType }) {
    const menuByType = initialMenu || {};
    const firstKey = TYPE_ORDER.find((k) => menuByType[k]?.categories?.length) || 'main';
    const [activeType, setActiveType] = useState<string>(firstKey);
    const [isBanquetOpen, setIsBanquetOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>(menuByType[firstKey]?.categories?.[0]?.id || '');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [query, setQuery] = useState('');

    // Заказ: корзина + модалка блюда + оформление доставки
    const cart = useCart();
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [deliveryOpen, setDeliveryOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const TYPE_DEFS: { id: string; name: string }[] = [
        { id: 'main', name: 'Кухня' },
        { id: 'business', name: 'Бизнес-ланч' },
        { id: 'bar', name: 'Бар' },
        { id: 'wine', name: 'Винная карта' },
        { id: 'banquet', name: 'Банкетное меню' },
        { id: 'kids', name: 'Детское' },
        { id: 'promotions', name: 'Акции' },
    ];
    const availableTypes = TYPE_DEFS.filter((t) => t.id === 'banquet' || (menuByType[t.id]?.categories?.length ?? 0) > 0);
    const categories = menuByType[activeType]?.categories || [];

    // Быстрый поиск по названию/описанию/тегам блюда в текущем разделе меню.
    const q = query.trim().toLowerCase();
    const itemMatches = (it: any) =>
        !q || [it.name, it.description, it.type, it.grape].some((v) => String(v || '').toLowerCase().includes(q));
    const shownCategories = q
        ? categories.map((c: any) => ({ ...c, items: c.items.filter(itemMatches) })).filter((c: any) => c.items.length)
        : categories;

    const selectType = (id: string) => {
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
            active ? 'bg-terracotta text-[#FBF3EA]' : 'border border-white/12 bg-white/[0.04] text-cream/75 hover:bg-white/[0.09]'
        }`;

    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink pb-24 font-body text-cream">
                {/* Компактный заголовок */}
                <section className="relative overflow-hidden border-b border-white/5 px-5 pb-7 pt-10 md:px-8 md:pt-14">
                    <img src="/hero-image.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/92 via-forest-ink/93 to-forest-ink" />
                    <div className="relative z-10 mx-auto max-w-[1000px]">
                        <span className="text-[13px] uppercase tracking-[0.18em] text-brass">Кухня, бар, доставка</span>
                        <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-black leading-[1.05] text-cream">Меню</h1>
                    </div>
                </section>

                {/* Липкая навигация: типы меню + категории */}
                <div className="sticky top-16 z-30 border-b border-white/10 bg-forest-ink/90 backdrop-blur-md">
                    <div className="mx-auto max-w-[1000px] px-5 py-3 md:px-8">
                        {availableTypes.length > 1 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {availableTypes.map((t) => (
                                    <button key={t.id} onClick={() => selectType(t.id)} className={pill(activeType === t.id && t.id !== 'banquet')}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeType !== 'business' && (
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Поиск по меню…"
                                    aria-label="Поиск по меню"
                                    className="w-full rounded-lg border border-white/12 bg-white/[0.04] py-2 pl-9 pr-9 text-sm text-cream placeholder-cream/40 outline-none transition focus:border-brass/50"
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

                        {activeType !== 'business' && categories.length > 0 && !q && (
                            <>
                                <div className="scrollbar-brass hidden gap-5 overflow-x-auto pb-1 md:flex">
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
                <div className="mx-auto max-w-[1000px] px-5 pt-10 md:px-8">
                    {activeType === 'business' ? (
                        <BusinessLunchConstructor sets={categories.flatMap((c: any) => c.items)} onAddToCart={cart.add} />
                    ) : (
                        <div className="mx-auto max-w-4xl space-y-16 md:space-y-20">
                            {q && shownCategories.length === 0 && (
                                <p className="py-16 text-center text-cream/55">По запросу «{query}» ничего не нашлось.</p>
                            )}
                            {shownCategories.map((category: any) => (
                                <section key={category.id} id={category.id} className="scroll-mt-[172px]">
                                    <h2 className="mb-7 border-b border-white/10 pb-3 font-display text-2xl font-bold text-cream md:text-3xl">
                                        {category.name}
                                    </h2>
                                    <div className="grid gap-4 md:gap-5">
                                        {category.items.map((item: any) => (
                                            <div
                                                key={item.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedItem(item)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item); }}
                                                className="group cursor-pointer rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-brass/25 hover:bg-white/[0.06] md:p-6"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-2 flex items-baseline justify-between gap-4">
                                                            <h3 className="font-display text-lg font-bold text-cream transition-colors group-hover:text-brass md:text-xl">
                                                                {item.name}
                                                            </h3>
                                                            {item.price && (
                                                                <span className="whitespace-nowrap text-lg font-bold text-brass md:text-xl">{item.price} ₽</span>
                                                            )}
                                                        </div>

                                                        {item.description && (
                                                            <p className="mb-2 text-sm leading-relaxed text-cream/60 md:text-[15px]">{item.description}</p>
                                                        )}

                                                        {(item.type || item.grape || item.strength) && (
                                                            <div className="mb-2 flex flex-wrap gap-2 text-xs text-cream/70">
                                                                {item.type && <span className="rounded bg-white/[0.06] px-2 py-1">{item.type}</span>}
                                                                {item.grape && <span className="rounded bg-white/[0.06] px-2 py-1">{item.grape}</span>}
                                                                {item.strength && <span className="rounded bg-white/[0.06] px-2 py-1">{item.strength}</span>}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4 text-xs text-cream/45 md:text-sm">
                                                            {item.weight && <span>{typeof item.weight === 'number' ? `${item.weight} г` : item.weight}</span>}
                                                            {item.volume && item.volume_unit && <span>{item.volume} {item.volume_unit}</span>}
                                                        </div>

                                                        {item.nutrition && (
                                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-cream/45 md:text-sm">
                                                                {item.nutrition.calories != null && <span>{Math.round(item.nutrition.calories)} ккал</span>}
                                                                {item.nutrition.proteins != null && <span>Б {item.nutrition.proteins}</span>}
                                                                {item.nutrition.fats != null && <span>Ж {item.nutrition.fats}</span>}
                                                                {item.nutrition.carbs != null && <span>У {item.nutrition.carbs}</span>}
                                                                <span className="opacity-60">/ 100 г</span>
                                                            </div>
                                                        )}

                                                        {item.variants && item.variants.length > 0 && (
                                                            <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3">
                                                                {item.variants.map((variant: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center justify-between text-sm">
                                                                        <span className="text-cream/75">{variant.name}</span>
                                                                        <div className="flex items-center gap-3">
                                                                            {variant.weight && <span className="text-xs text-cream/45">{variant.weight}</span>}
                                                                            <span className="font-semibold text-brass">{variant.price} ₽</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {item.modifierGroups && item.modifierGroups.length > 0 && (
                                                            <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-3">
                                                                {item.modifierGroups.map((group: any) => (
                                                                    <div key={group.id}>
                                                                        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-cream/80 md:text-sm">
                                                                            <span>{group.name}</span>
                                                                            {group.min > 0 && (
                                                                                <span className="rounded bg-brass/12 px-1.5 py-0.5 text-[10px] text-brass md:text-xs">обязательно</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {group.options.map((opt: any) => (
                                                                                <span key={opt.id} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-cream/75 md:text-sm">
                                                                                    {String(opt.name).replace(/^[-–—]\s*/, '')}
                                                                                    {opt.price > 0 && <span className="ml-1 text-brass">+{opt.price} ₽</span>}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Быстрое добавление: простые блюда — сразу в корзину;
                                                            блюда с вариантами/модификаторами — «Выбрать» (открывает карточку). */}
                                                        {item.price ? (
                                                            <div className="mt-4 border-t border-white/[0.07] pt-3" onClick={(e) => e.stopPropagation()}>
                                                                {(item.variants?.length || item.modifierGroups?.length) ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedItem(item)}
                                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brass/40 bg-white/[0.04] px-4 py-2 text-sm font-medium text-brass transition-colors hover:bg-white/[0.09]"
                                                                    >
                                                                        Выбрать и добавить
                                                                    </button>
                                                                ) : (() => {
                                                                    const qty = cart.items.find((c) => c.id === item.id)?.qty || 0;
                                                                    const setQty = (n: number) => cart.add({ id: item.id, name: item.name, price: item.price, weight: item.weight || '', img: item.image, qty: n, productId: String(item.id) });
                                                                    return qty === 0 ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setQty(1)}
                                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark"
                                                                        >
                                                                            <Plus className="h-4 w-4" /> В корзину
                                                                        </button>
                                                                    ) : (
                                                                        <div className="inline-flex items-center gap-3 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1.5">
                                                                            <button type="button" onClick={() => cart.dec(item.id)} aria-label="Меньше" className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-cream transition-colors hover:bg-white/[0.12]"><Minus className="h-4 w-4" /></button>
                                                                            <span className="min-w-[2ch] text-center font-semibold text-cream">{qty}</span>
                                                                            <button type="button" onClick={() => setQty(qty + 1)} aria-label="Больше" className="grid h-8 w-8 place-items-center rounded-md bg-terracotta text-[#FBF3EA] transition-colors hover:bg-terracotta-dark"><Plus className="h-4 w-4" /></button>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {item.image && (
                                                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-forest-mid md:h-32 md:w-32">
                                                            <DishThumb src={item.image} alt={item.name} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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

                <FoodDetailModal
                    item={selectedItem}
                    isOpen={!!selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={cart.add}
                    cartItems={cart.items}
                />
                <CartDrawer
                    isOpen={cartOpen}
                    onClose={() => setCartOpen(false)}
                    items={cart.items}
                    onAdd={cart.add}
                    onDecrement={cart.dec}
                    onRemove={cart.remove}
                    count={cart.count}
                    total={cart.total}
                    onDeliveryClick={() => { setCartOpen(false); setDeliveryOpen(true); }}
                    businessLunchValidation={{ businessLunchCount: 0, isValid: true }}
                    isMounted={mounted}
                />
                {deliveryOpen && (
                    <DeliveryCheckout items={cart.items} subtotal={cart.total} onClose={() => setDeliveryOpen(false)} onSuccess={() => cart.clear()} />
                )}

                <BanquetMenuModal isOpen={isBanquetOpen} onClose={() => setIsBanquetOpen(false)} />
            </main>
            <ForestFooter />
        </>
    );
}
