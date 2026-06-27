'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getMenuData } from '../actions/getMenu';

// Type definitions based on data files
interface MenuItemVariant {
    name: string;
    price: number;
    weight: string;
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price?: number;
    weight?: string; // Some items have weight as string
    variants?: MenuItemVariant[];
    image?: string;
}

interface MenuCategory {
    id: string;
    name: string;
    items: MenuItem[];
}


function MenuContent() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    const scrollToCategory = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = document.getElementById(categoryId);
        if (element) {
            const offset = 100; // Компенсация фиксированного заголовка
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="bg-neutral-950 min-h-screen text-white pb-20">
            {/* Фиксированная шапка с навигацией по типам меню */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 pt-20">
                <div className="container mx-auto px-4">
                    {/* Навигация по категориям (десктоп) */}
                    <div className="hidden md:flex justify-center space-x-6 pb-4 overflow-x-auto scrollbar-none">
                        {categories.map((category: any) => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                className={`text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === category.id
                                    ? 'text-amber-400 border-b-2 border-amber-400'
                                    : 'text-neutral-400 hover:text-white'
                                    }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>

                    {/* Навигация по категориям (мобильная) */}
                    <div className="md:hidden pb-4 relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-white/5 rounded-lg text-sm text-neutral-300 pointer-events-auto"
                        >
                            <span className="truncate">
                                {categories.find((c: any) => c.id === activeCategory)?.name || 'Выберите категорию'}
                            </span>
                            <span className={`transform transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>
                                ▼
                            </span>
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 max-h-[60vh] overflow-y-auto z-50 pointer-events-auto"
                                >
                                    {categories.map((category: any) => (
                                        <button
                                            key={category.id}
                                            onClick={() => scrollToCategory(category.id)}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${activeCategory === category.id
                                                ? 'bg-amber-400/10 text-amber-400'
                                                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            <div className="container mx-auto px-4 pt-48 md:pt-48">
                <div className="max-w-4xl mx-auto space-y-16 md:space-y-24">
                    {categories.map((category: any) => (
                        <div
                            key={category.id}
                            id={category.id}
                            className="scroll-mt-48 pointer-events-auto"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-amber-400 border-b border-white/10 pb-4">
                                {category.name}
                            </h2>

                            <div className="grid gap-6 md:gap-8">
                                {category.items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="group bg-white/5 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-colors border border-white/5 hover:border-amber-400/20"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between gap-4 mb-2">
                                                    <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                                        {item.name}
                                                    </h3>
                                                    {item.price && (
                                                        <span className="text-lg md:text-xl font-bold text-amber-400 whitespace-nowrap">
                                                            {item.price} ₽
                                                        </span>
                                                    )}
                                                </div>

                                                {item.description && (
                                                    <p className="text-sm md:text-base text-neutral-400 mb-2 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}

                                                {/* Характеристики для вина */}
                                                {(item.type || item.grape || item.strength) && (
                                                    <div className="flex flex-wrap gap-2 mb-2 text-xs text-neutral-500">
                                                        {item.type && (
                                                            <span className="bg-white/5 px-2 py-1 rounded">
                                                                {item.type}
                                                            </span>
                                                        )}
                                                        {item.grape && (
                                                            <span className="bg-white/5 px-2 py-1 rounded">
                                                                🍇 {item.grape}
                                                            </span>
                                                        )}
                                                        {item.strength && (
                                                            <span className="bg-white/5 px-2 py-1 rounded">
                                                                💪 {item.strength}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-xs md:text-sm text-neutral-500">
                                                    {item.weight && (
                                                        <span>⚖️ {item.weight} г</span>
                                                    )}
                                                    {item.volume && item.volume_unit && (
                                                        <span>🥛 {item.volume} {item.volume_unit}</span>
                                                    )}
                                                </div>

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

                                                {/* Варианты блюд/напитков */}
                                                {item.variants && item.variants.length > 0 && (
                                                    <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                                                        {item.variants.map((variant: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                                <span className="text-neutral-300">{variant.name}</span>
                                                                <div className="flex items-center gap-3">
                                                                    {variant.weight && (
                                                                        <span className="text-neutral-500 text-xs">
                                                                            {variant.weight}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-semibold text-amber-400">
                                                                        {variant.price} ₽
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Изображение (если есть) */}
                                            {item.image && (
                                                <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900">
                                                    <Image
                                                        src={item.image}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Кнопка "Наверх" */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-8 right-8 w-12 h-12 bg-amber-400 text-black rounded-full shadow-lg flex items-center justify-center font-bold hover:bg-amber-300 transition-transform hover:scale-110 z-40"
            >
                ↑
            </button>

            {/* Футер с возвратом */}
            <div className="fixed bottom-0 left-0 right-0 bg-neutral-950/90 backdrop-blur border-t border-white/10 p-4 z-40 md:hidden">
                <Link
                    href="/"
                    className="flex items-center justify-center w-full py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors"
                >
                    ← На главную
                </Link>
            </div>
        </div>
    );
}

export default function MenuPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Загрузка меню...</div>}>
            <MenuContent />
        </Suspense>
    );
}
