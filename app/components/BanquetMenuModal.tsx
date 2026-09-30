'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BANQUET_CATEGORIES, HOLIDAY_BANQUETS, type BanquetCategory, type BanquetVenue } from '@/lib/menu/holidayBanquets';
import { SITE } from './forest/site';
import styles from './HolidayBanquet.module.css';
import {
    getBanquetPackage,
    isBanquetSelectionComplete,
    normalizeBanquetSelection,
    packagesForFilter,
    type BanquetPackageId,
    type BanquetSaladId,
} from '@/lib/booking/banquetPackages';

type BanquetMenuModalProps = {
    isOpen: boolean;
    onClose: () => void;
    selectable?: boolean;
    selectedPackageId?: BanquetPackageId | null;
    selectedSaladIds?: readonly BanquetSaladId[];
    onSelectPackage?: (id: BanquetPackageId, saladIds: BanquetSaladId[]) => void;
    hallFilter?: 'conga' | 'all' | null;
    confirmLabel?: string;
    includeHolidayMenus?: boolean;
    initialCategory?: BanquetCategory;
    initialVenue?: BanquetVenue;
};

type SaladCtl = { selected: BanquetSaladId[]; onToggle: (id: BanquetSaladId) => void };

export default function BanquetMenuModal({
    isOpen,
    onClose,
    selectable,
    selectedPackageId,
    selectedSaladIds,
    onSelectPackage,
    hallFilter,
    confirmLabel = 'Выбрать это банкетное меню',
    includeHolidayMenus = !selectable,
    initialCategory = 'regular',
    initialVenue = 'conga',
}: BanquetMenuModalProps) {
    const [activeTab, setActiveTab] = useState<'conga' | 'kucher'>('conga');
    const [activeCongaMenu, setActiveCongaMenu] = useState<'7500' | '6000'>('7500');
    const [saladSel, setSaladSel] = useState<Record<string, BanquetSaladId[]>>({});
    const [category, setCategory] = useState<BanquetCategory>(initialCategory);

    useEffect(() => {
        if (isOpen) setCategory(includeHolidayMenus ? initialCategory : 'regular');
    }, [isOpen, initialCategory, includeHolidayMenus]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const normalized = normalizeBanquetSelection(selectedPackageId, selectedSaladIds ?? []);
        const firstPermittedTab = packagesForFilter(hallFilter ?? null)[0]?.venue ?? 'conga';
        setSaladSel(normalized.packageId ? { [normalized.packageId]: normalized.saladIds } : {});

        if (normalized.packageId === 'kucher-5000') {
            setActiveTab('kucher');
        } else if (normalized.packageId) {
            setActiveTab('conga');
            setActiveCongaMenu(normalized.packageId === 'conga-7500' ? '7500' : '6000');
        } else {
            setActiveTab(firstPermittedTab);
        }
    }, [hallFilter, isOpen, selectedPackageId, selectedSaladIds]);

    if (!isOpen) return null;

    const toggleSalad = (pkgId: BanquetPackageId, id: BanquetSaladId) => {
        setSaladSel((prev) => {
            const cur = prev[pkgId] || [];
            const max = getBanquetPackage(pkgId)?.requiredSalads ?? 0;
            const has = cur.includes(id);
            const next = has ? cur.filter((x) => x !== id) : cur.length < max ? [...cur, id] : cur;
            return { ...prev, [pkgId]: next };
        });
    };
    const ctlFor = (pkgId: BanquetPackageId): SaladCtl | undefined =>
        selectable ? { selected: saladSel[pkgId] || [], onToggle: (n) => toggleSalad(pkgId, n) } : undefined;
    const saladsComplete = (pkgId: BanquetPackageId) => isBanquetSelectionComplete(pkgId, saladSel[pkgId] || []);

    const visiblePackages = selectable ? packagesForFilter(hallFilter ?? null) : null;
    const showConga = !selectable || (visiblePackages?.some((p) => p.venue === 'conga') ?? false);
    const showKucher = !selectable || (visiblePackages?.some((p) => p.venue === 'kucher') ?? false);

    const currentCongaId: BanquetPackageId = activeCongaMenu === '7500' ? 'conga-7500' : 'conga-6000';
    const currentCongaSelected = selectedPackageId === currentCongaId;
    const kucherSelected = selectedPackageId === 'kucher-5000';
    const showTabs = showConga || showKucher;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="banquet-dialog-title"
                onKeyDown={(event) => {
                    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
                    if (event.key !== 'Tab') return;
                    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
                    const first = controls[0];
                    const last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
                }}
                className={`relative flex max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-amber-50 shadow-2xl ${category !== 'regular' ? styles[category] : ''}`}
            >
                <div className={`${styles.dialogHeader} flex shrink-0 items-center justify-between bg-stone-800 p-4 md:p-5`}>
                    <h2 id="banquet-dialog-title" className="text-base font-bold uppercase tracking-[0.15em] text-amber-100 md:text-xl">Банкетные меню</h2>
                    <button autoFocus onClick={onClose} aria-label="Закрыть банкетные меню" className="rounded-full bg-stone-700 p-2 text-stone-300 transition hover:bg-stone-600 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {includeHolidayMenus && (
                    <div className={styles.categories} aria-label="Категории банкетных меню">
                        {BANQUET_CATEGORIES.map((tab) => (
                            <button key={tab.id} type="button" aria-pressed={category === tab.id} onClick={() => setCategory(tab.id)}>{tab.name}</button>
                        ))}
                    </div>
                )}

                {category === 'regular' && showTabs && (
                    <div className="flex shrink-0 bg-stone-700">
                        {showConga && (
                            <button
                                onClick={() => setActiveTab('conga')}
                                className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all md:py-4 md:text-base ${activeTab === 'conga' ? 'bg-amber-50 text-stone-800' : 'text-stone-300 hover:bg-stone-600 hover:text-white'}`}
                            >
                                Зал Конга
                            </button>
                        )}
                        {showKucher && (
                            <button
                                onClick={() => setActiveTab('kucher')}
                                className={`flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider transition-all md:py-4 md:text-base ${activeTab === 'kucher' ? 'bg-amber-50 text-stone-800' : 'text-stone-300 hover:bg-stone-600 hover:text-white'}`}
                            >
                                Зал Кучер
                            </button>
                        )}
                    </div>
                )}

                <div className={`min-h-0 flex-1 overflow-y-auto ${category === 'regular' ? 'bg-amber-50' : styles.scrollArea}`}>
                    {category !== 'regular' ? <HolidayBanquetMenu key={`${category}-${initialVenue}`} category={category} initialVenue={initialVenue} /> : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'conga' && showConga ? (
                            <motion.div key="conga" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="p-4 md:p-6">
                                <div className="mb-6 flex justify-center gap-2 md:gap-4">
                                    <button
                                        onClick={() => setActiveCongaMenu('7500')}
                                        className={`rounded-lg border-2 px-4 py-3 text-sm font-bold transition-all duration-200 md:px-8 md:py-4 md:text-base ${activeCongaMenu === '7500' ? 'scale-105 border-emerald-700 bg-emerald-700 text-white shadow-lg' : 'border-stone-300 bg-white text-stone-700 hover:border-emerald-600 hover:text-emerald-700'}`}
                                    >
                                        МЕНЮ 7500 ₽
                                    </button>
                                    <button
                                        onClick={() => setActiveCongaMenu('6000')}
                                        className={`rounded-lg border-2 px-4 py-3 text-sm font-bold transition-all duration-200 md:px-8 md:py-4 md:text-base ${activeCongaMenu === '6000' ? 'scale-105 border-emerald-700 bg-emerald-700 text-white shadow-lg' : 'border-stone-300 bg-white text-stone-700 hover:border-emerald-600 hover:text-emerald-700'}`}
                                    >
                                        МЕНЮ 6000 ₽
                                    </button>
                                </div>

                                <div className={selectable ? `rounded-xl border-2 p-2 transition-all ${currentCongaSelected ? 'border-amber-400' : 'border-transparent'}` : ''}>
                                    <AnimatePresence mode="wait">
                                        <motion.div key={activeCongaMenu} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                            <div className="mb-6 border-b-2 border-stone-300 pb-4 text-center">
                                                <h3 className="mb-1 font-serif text-2xl font-bold text-stone-800 md:text-3xl">Конга</h3>
                                                <p className="mb-3 text-xs tracking-widest text-stone-500 md:text-sm">БАНКЕТНОЕ МЕНЮ</p>
                                                <div className="inline-block rounded-lg bg-emerald-700 px-6 py-2">
                                                    <span className="text-xl font-bold text-white md:text-2xl">{activeCongaMenu} ₽</span>
                                                    <span className="ml-2 text-xs text-emerald-100 md:text-sm">/ {activeCongaMenu === '7500' ? 1435 : 1450} гр./чел.</span>
                                                </div>
                                            </div>

                                            {activeCongaMenu === '7500'
                                                ? <CongaMenu7500 saladCtl={ctlFor('conga-7500')} />
                                                : <CongaMenu6000 saladCtl={ctlFor('conga-6000')} />}
                                        </motion.div>
                                    </AnimatePresence>

                                    {selectable && (
                                        <SelectPackageButton
                                            selected={currentCongaSelected}
                                            complete={saladsComplete(currentCongaId)}
                                            max={getBanquetPackage(currentCongaId)!.requiredSalads}
                                            accent="emerald"
                                            confirmLabel={confirmLabel}
                                            onSelect={() => onSelectPackage?.(currentCongaId, saladSel[currentCongaId] || [])}
                                        />
                                    )}
                                </div>

                                <div className="mt-6"><ConditionsCard /></div>
                            </motion.div>
                        ) : activeTab === 'kucher' && showKucher ? (
                            <motion.div key="kucher" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="p-4 md:p-6">
                                <div className={selectable ? `rounded-xl border-2 p-2 transition-all ${kucherSelected ? 'border-amber-400' : 'border-transparent'}` : ''}>
                                    <KucherMenu saladCtl={ctlFor('kucher-5000')} />

                                    {selectable && (
                                        <SelectPackageButton
                                            selected={kucherSelected}
                                            complete={saladsComplete('kucher-5000')}
                                            max={getBanquetPackage('kucher-5000')!.requiredSalads}
                                            accent="amber"
                                            confirmLabel={confirmLabel}
                                            onSelect={() => onSelectPackage?.('kucher-5000', saladSel['kucher-5000'] || [])}
                                        />
                                    )}
                                </div>

                                <div className="mt-6"><ConditionsCard color="amber" /></div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function HolidayBanquetMenu({ category, initialVenue }: { category: 'corporate' | 'night'; initialVenue: BanquetVenue }) {
    const [venue, setVenue] = useState(initialVenue);
    const [price, setPrice] = useState<number | null>(null);
    const menus = HOLIDAY_BANQUETS.filter((menu) => menu.category === category && menu.venue === venue);
    const menu = menus.find((item) => item.price === price) ?? menus[0];
    const formatPrice = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;
    const program = menu.program ? 'С программой' : 'Без программы';

    return (
        <div className={styles.content}>
            <div className={styles.venues} aria-label="Зал для праздничного меню">
                {(['kucher', 'conga'] as const).map((hall) => <button key={hall} type="button" aria-pressed={venue === hall} onClick={() => { setVenue(hall); setPrice(null); }}>
                    {hall === 'kucher' ? 'Залы Кучера' : 'Зал Конга'}
                </button>)}
            </div>
            <div className={styles.menus} aria-label="Стоимость и программа">
                {menus.map((item) => <button key={item.price} type="button" aria-pressed={menu.price === item.price} onClick={() => setPrice(item.price)}>
                    <strong>{formatPrice(item.price)}</strong><span>{item.program ? 'С программой' : 'Без программы'}</span>
                </button>)}
            </div>
            <header className={styles.menuHeader}>
                <p>{category === 'corporate' ? 'Декабрь 2026 · Встречаем 2027' : '31 декабря 2026 — 1 января 2027'}</p>
                <h3>{venue === 'kucher' ? 'Кучер' : 'Конга'} · {formatPrice(menu.price)} · {program}</h3>
                <p className={styles.halls}>{menu.halls}</p>
                <span>Стоимость на одного гостя · вес блюд на человека</span>
            </header>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {[[0], [2, 1], [3, 4, 5]].map((column, index) => <div key={index} className="space-y-4">
                    {column.map((sectionIndex) => {
                        const section = menu.content.sections[sectionIndex];
                        return <MenuCard key={section.title} title={section.title} subtitle={section.note} weight={`${section.grams} гр.`} color="holiday">
                            {section.items.map((item) => <Item key={item.name} name={item.name} desc={item.description} w={String(item.grams)} />)}
                        </MenuCard>;
                    })}
                </div>)}
            </div>
            <div className={styles.booking}>
                <p>Бронирование и выбор блюд — с администратором</p>
                <a href={`tel:${SITE.phones[0].tel}`}>Забронировать · {SITE.phones[0].label}</a>
            </div>
            <ConditionsCard />
        </div>
    );
}

function SelectPackageButton({ selected, complete, max, accent, confirmLabel, onSelect }: {
    selected: boolean;
    complete: boolean;
    max: number;
    accent: 'emerald' | 'amber';
    confirmLabel: string;
    onSelect: () => void;
}) {
    const base = accent === 'emerald' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-amber-600 hover:bg-amber-500';
    return (
        <div className="mb-2 mt-5 flex flex-col items-center gap-2">
            {!complete && (
                <p className="text-sm font-semibold text-stone-600">Выберите {max} салата, чтобы выбрать это банкетное меню</p>
            )}
            <button
                type="button"
                onClick={() => complete && onSelect()}
                disabled={!complete}
                className={`rounded-lg px-6 py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 ${selected ? 'cursor-default bg-amber-400 text-stone-900' : base}`}
            >
                {confirmLabel}
            </button>
        </div>
    );
}

// ===== Конга 7500 =====
function CongaMenu7500({ saladCtl }: { saladCtl?: SaladCtl }) {
    return (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
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
                <SaladCard id="conga-7500" color="emerald" ctl={saladCtl} />
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
                <div className="rounded-lg bg-emerald-700 p-3 text-center">
                    <div className="text-sm font-bold text-white">ХЛЕБ — 100 гр./чел.</div>
                </div>
            </div>
        </div>
    );
}

// ===== Конга 6000 =====
function CongaMenu6000({ saladCtl }: { saladCtl?: SaladCtl }) {
    return (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
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
                <SaladCard id="conga-6000" color="emerald" ctl={saladCtl} />
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
                <div className="rounded-lg bg-emerald-700 p-3 text-center">
                    <div className="text-sm font-bold text-white">ХЛЕБ — 100 гр./чел.</div>
                </div>
            </div>
        </div>
    );
}

// ===== KUCHER =====
function KucherMenu({ saladCtl }: { saladCtl?: SaladCtl }) {
    return (
        <>
            <div className="mb-6 border-b-2 border-stone-300 pb-4 text-center">
                <h3 className="mb-1 font-serif text-2xl font-bold text-stone-800 md:text-3xl">КУЧЕР</h3>
                <p className="mb-3 text-xs tracking-widest text-stone-500 md:text-sm">БАНКЕТНОЕ МЕНЮ</p>
                <div className="inline-block rounded-lg bg-amber-600 px-6 py-2">
                    <span className="text-xl font-bold text-white md:text-2xl">5000 ₽</span>
                    <span className="ml-2 text-xs text-amber-100 md:text-sm">/ 1350 гр./чел.</span>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
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
                    <SaladCard id="kucher-5000" color="amber" ctl={saladCtl} />
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
                    <div className="rounded-lg bg-amber-600 p-3 text-center">
                        <div className="text-sm font-bold text-white">ХЛЕБ — 100 гр./чел.</div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ===== SALAD CARD (interactive when ctl provided) =====
function SaladCard({ id, color, ctl }: { id: BanquetPackageId; color: 'emerald' | 'amber'; ctl?: SaladCtl }) {
    const cfg = getBanquetPackage(id)!;
    const selectable = !!ctl;
    const selected = ctl?.selected ?? [];
    const atMax = selected.length >= cfg.requiredSalads;
    return (
        <MenuCard
            title="САЛАТЫ"
            subtitle={selectable ? `Выберите ${cfg.requiredSalads} · выбрано ${selected.length}/${cfg.requiredSalads}` : `На выбор ${cfg.requiredSalads} вида`}
            weight={`${cfg.requiredSalads * 60} гр.`}
            color={color}
        >
            {cfg.salads.map((salad) => {
                if (!selectable) return <Item key={salad.id} name={salad.name} desc={salad.description} w={`${salad.grams}`} />;
                const isOn = selected.includes(salad.id);
                const disabled = !isOn && atMax;
                return (
                    <button
                        key={salad.id}
                        type="button"
                        onClick={() => ctl!.onToggle(salad.id)}
                        disabled={disabled}
                        className={`flex w-full items-start gap-2 border-b border-stone-100 py-1.5 text-left transition last:border-0 ${disabled ? 'opacity-40' : 'hover:bg-stone-50'}`}
                    >
                        <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${isOn ? (color === 'emerald' ? 'border-emerald-700 bg-emerald-700' : 'border-amber-600 bg-amber-600') : 'border-stone-300 bg-white'}`}>
                            {isOn && <Check className="h-3 w-3 text-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-stone-800">{salad.name}</span>
                            {salad.description && <span className="block text-xs leading-tight text-stone-500">{salad.description}</span>}
                        </span>
                        <span className="whitespace-nowrap text-xs font-semibold text-stone-600">{salad.grams} гр.</span>
                    </button>
                );
            })}
        </MenuCard>
    );
}

// ===== REUSABLE COMPONENTS =====
function MenuCard({ title, subtitle, weight, color, children }: {
    title: string;
    subtitle?: string;
    weight: string;
    color: 'emerald' | 'amber' | 'holiday';
    children: React.ReactNode;
}) {
    const headerBg = color === 'holiday' ? styles.cardHeader : color === 'emerald' ? 'bg-emerald-700' : 'bg-amber-600';
    return (
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
            <div className={`${headerBg} flex items-center justify-between px-4 py-2`}>
                <div>
                    <h4 className="text-sm font-bold uppercase text-white">{title}</h4>
                    {subtitle && <div className="text-xs text-white/80">{subtitle}</div>}
                </div>
                <div className="rounded bg-white/20 px-2 py-1 text-xs font-bold text-white">{weight}</div>
            </div>
            <div className="space-y-2 p-3">{children}</div>
        </div>
    );
}

function Item({ name, desc, w }: { name: string; desc?: string; w: string }) {
    return (
        <div className="flex items-start justify-between gap-2 border-b border-stone-100 py-1 last:border-0">
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-stone-800">{name}</div>
                {desc && <div className="text-xs leading-tight text-stone-500">{desc}</div>}
            </div>
            <div className="whitespace-nowrap text-xs font-semibold text-stone-600">{w} гр.</div>
        </div>
    );
}

function ConditionsCard({ color = 'emerald' }: { color?: 'emerald' | 'amber' }) {
    const accentColor = color === 'emerald' ? 'text-emerald-700' : 'text-amber-700';
    const items = [
        'Спиртные и безалкогольные напитки разрешено принести с собой. Алкогольные напитки принимаются только в закупоренном виде и при наличии акцизной марки на таре. Безалкогольные напитки (кроме соков) принимаются только в стеклянной таре не более 0,5л.',
        'Любые продукты питания (заблаговременно не оговоренные при заключении договора) запрещено приносить с собой и употреблять во время Банкета.',
        'Переход из одного зала в другой зал запрещен.',
        'При изменении количества гостей в меньшую сторону в день мероприятия — корректировки не производятся.',
        'Не разрешено проводить индивидуальную развлекательную программу, подключаться к аппаратуре заведения в общем зале Ресторана.',
        'Заказчик принимает на себя обязательство нести ответственность за приглашенных на Мероприятие Гостей, их поведение и действия. Не допускается некорректное поведение гостей по отношению к сотрудникам Ресторана, посетителям и имуществу заведения.',
        'При нарушении любого пункта заведение оставляет за собой право отказать в обслуживании, попросить оплатить счет и покинуть заведение.',
    ];
    return (
        <div className="rounded-lg bg-white p-4 shadow-md">
            <h4 className="mb-3 border-b border-stone-200 pb-2 text-sm font-bold uppercase text-stone-800">Условия</h4>
            <ul className="space-y-3 text-xs leading-relaxed text-stone-600">
                {items.map((t, i) => (
                    <li key={i} className="flex gap-2">
                        <span className={`${accentColor} shrink-0 font-bold`}>{i + 1}.</span>
                        <span>{t}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-4 border-t border-stone-200 pt-3 text-center text-[10px] font-semibold leading-relaxed text-red-600">
                Обращаем внимание: конкретизация стола в зале «Конга» при приёме банкета НЕ ПРОИЗВОДИТСЯ. Точная схема расстановки столов определяется в день Мероприятия Администрацией Ресторана исходя из оптимальной рассадки при наполняемости зала.
            </div>
        </div>
    );
}
