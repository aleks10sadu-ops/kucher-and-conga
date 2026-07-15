'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Search, Plus, Minus, ShoppingCart } from 'lucide-react';
import FoodDetailModal from './FoodDetailModal';
import { useCart } from '@/lib/hooks/useCart';

// Модалка предзаказа на странице брони: выбор блюд с категориями, поиском и
// карточками — без ухода со страницы. Корзина общая (localStorage), поэтому
// «Состав предзаказа» в форме обновляется сразу. Блюда из стоп-листа iiko
// помечены и не добавляются (стоп-лист свежий при каждом открытии).

type MenuByType = Record<string, { categories: any[] }>;

const TYPE_DEFS: { id: string; name: string }[] = [
    { id: 'main', name: 'Кухня' },
    { id: 'bar', name: 'Бар' },
    { id: 'wine', name: 'Винная карта' },
    { id: 'kids', name: 'Детское' },
    { id: 'promotions', name: 'Акции' },
];

// Кеш меню на время жизни вкладки: /api/menu отдаёт ~сотни КБ, второй раз не качаем.
let menuCache: MenuByType | null = null;

function Thumb({ src, alt }: { src: string; alt: string }) {
    const [broken, setBroken] = useState(false);
    if (broken) return null;
    if (src.includes('/storage/v1/object/public/')) {
        return <Image src={src} alt={alt} fill sizes="56px" className="object-cover" onError={() => setBroken(true)} />;
    }
    return <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setBroken(true)} />;
}

export default function PreorderMenuModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const cart = useCart();
    const [menu, setMenu] = useState<MenuByType | null>(menuCache);
    const [loadError, setLoadError] = useState(false);
    const [stopSet, setStopSet] = useState<Set<string>>(new Set());
    const [activeType, setActiveType] = useState('main');
    const [activeCategory, setActiveCategory] = useState('');
    const [query, setQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Стоп-лист обновляем при каждом открытии — он меняется в течение дня.
        fetch('/api/stop-list')
            .then((r) => r.json())
            .then((d) => setStopSet(new Set<string>((d?.productIds || []).map(String))))
            .catch(() => {});

        if (!menuCache) {
            setLoadError(false);
            fetch('/api/menu')
                .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
                .then((m) => { menuCache = m; setMenu(m); })
                .catch(() => setLoadError(true));
        }
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen) return null;

    const availableTypes = TYPE_DEFS.filter((t) => (menu?.[t.id]?.categories?.length ?? 0) > 0);
    const categories = menu?.[activeType]?.categories || [];

    const q = query.trim().toLowerCase();
    const itemMatches = (it: any) =>
        !q || [it.name, it.description, it.type, it.grape].some((v) => String(v || '').toLowerCase().includes(q));
    const shownCategories = q
        ? categories.map((c: any) => ({ ...c, items: c.items.filter(itemMatches) })).filter((c: any) => c.items.length)
        : activeCategory
            ? categories.filter((c: any) => c.id === activeCategory)
            : categories;

    const isStopped = (it: any) => stopSet.has(String(it.id));

    const selectType = (id: string) => { setActiveType(id); setActiveCategory(''); };

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="Предзаказ по меню">
            <div className="flex h-[94dvh] w-full max-w-[860px] flex-col overflow-hidden rounded-t-2xl bg-forest-ink text-cream shadow-2xl md:h-[88vh] md:rounded-2xl md:border md:border-white/10">
                {/* Шапка */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-6">
                    <div>
                        <h2 className="font-display text-lg font-bold md:text-xl">Предзаказ по меню</h2>
                        <p className="text-xs text-cream/55">Выберите блюда — они появятся в составе предзаказа</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/[0.06] text-cream transition-colors hover:bg-white/[0.12]">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Поиск + типы + категории */}
                <div className="border-b border-white/10 px-4 py-3 md:px-6">
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/40" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Поиск по меню…"
                            aria-label="Поиск по меню"
                            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-9 text-sm text-cream placeholder-cream/40 outline-none transition focus:border-brass/50"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-cream/50 hover:bg-white/10 hover:text-cream">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {availableTypes.length > 1 && (
                        <div className="scrollbar-brass flex gap-2 overflow-x-auto pb-1">
                            {availableTypes.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => selectType(t.id)}
                                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                                        activeType === t.id ? 'bg-terracotta text-[#FBF3EA]' : 'border border-white/10 bg-white/[0.04] text-cream/75 hover:bg-white/[0.09]'
                                    }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {!q && categories.length > 1 && (
                        <div className="scrollbar-brass mt-2 flex gap-2 overflow-x-auto pb-1">
                            <button
                                type="button"
                                onClick={() => setActiveCategory('')}
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${!activeCategory ? 'bg-brass/20 text-brass' : 'text-cream/55 hover:text-cream'}`}
                            >
                                Все
                            </button>
                            {categories.map((c: any) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setActiveCategory(c.id)}
                                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${activeCategory === c.id ? 'bg-brass/20 text-brass' : 'text-cream/55 hover:text-cream'}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Список блюд */}
                <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                    {!menu && !loadError && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-brass" />
                                <p className="text-sm text-cream/50">Загружаем меню…</p>
                            </div>
                        </div>
                    )}
                    {loadError && (
                        <div className="py-16 text-center text-cream/60">
                            Не удалось загрузить меню.{' '}
                            <button type="button" className="text-brass underline" onClick={() => { menuCache = null; setMenu(null); setLoadError(false); fetch('/api/menu').then((r) => r.json()).then((m) => { menuCache = m; setMenu(m); }).catch(() => setLoadError(true)); }}>
                                Попробовать ещё раз
                            </button>
                        </div>
                    )}
                    {menu && q && shownCategories.length === 0 && (
                        <p className="py-16 text-center text-cream/55">По запросу «{query}» ничего не нашлось.</p>
                    )}
                    <div className="space-y-8">
                        {shownCategories.map((category: any) => (
                            <section key={category.id}>
                                <h3 className="mb-3 border-b border-white/10 pb-2 font-display text-base font-bold text-cream/90">{category.name}</h3>
                                <div className="space-y-2">
                                    {category.items.map((item: any) => {
                                        const stopped = isStopped(item);
                                        const complex = !!(item.variants?.length || item.modifierGroups?.length);
                                        const qty = cart.items.find((c) => c.id === item.id)?.qty || 0;
                                        const setQty = (n: number) => cart.add({ id: item.id, name: item.name, price: item.price, weight: item.weight || '', img: item.image, qty: n, productId: String(item.id) });
                                        return (
                                            <div key={item.id} className={`flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 ${stopped ? 'opacity-50' : ''}`}>
                                                {item.image && (
                                                    <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-forest-mid">
                                                        <Thumb src={item.image} alt={item.name} />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-semibold text-cream">{item.name}</div>
                                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-cream/50">
                                                        {item.price ? <span className="font-semibold text-brass">{item.price} ₽</span> : null}
                                                        {item.weight && <span>{typeof item.weight === 'number' ? `${item.weight} г` : item.weight}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {stopped ? (
                                                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-cream/60">Закончилось</span>
                                                    ) : !item.price ? null : complex ? (
                                                        <button type="button" onClick={() => setSelectedItem(item)} className="rounded-lg border border-brass/40 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-brass transition-colors hover:bg-white/[0.09]">
                                                            Выбрать
                                                        </button>
                                                    ) : qty === 0 ? (
                                                        <button type="button" onClick={() => setQty(1)} aria-label={`Добавить: ${item.name}`} className="grid h-9 w-9 place-items-center rounded-lg bg-terracotta text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-1.5 py-1">
                                                            <button type="button" onClick={() => cart.dec(item.id)} aria-label="Меньше" className="grid h-7 w-7 place-items-center rounded-md bg-white/[0.06] text-cream hover:bg-white/[0.12]"><Minus className="h-3.5 w-3.5" /></button>
                                                            <span className="min-w-[2ch] text-center text-sm font-semibold text-cream">{qty}</span>
                                                            <button type="button" onClick={() => setQty(qty + 1)} aria-label="Больше" className="grid h-7 w-7 place-items-center rounded-md bg-terracotta text-[#FBF3EA] hover:bg-terracotta-dark"><Plus className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>

                {/* Итог */}
                <div className="border-t border-white/10 px-4 py-3 md:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {cart.count > 0 ? `Готово · ${cart.count} блюд(а) · ${cart.total.toLocaleString('ru-RU')} ₽` : 'Готово'}
                    </button>
                </div>
            </div>

            {/* Карточка блюда с вариантами/модификаторами — поверх модалки */}
            <FoodDetailModal
                item={selectedItem}
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                onAddToCart={cart.add}
                cartItems={cart.items}
                stopSet={stopSet}
            />
        </div>
    );
}
