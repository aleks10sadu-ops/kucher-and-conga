'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { SITE, NAV, NAV_TOP } from './site';

// Общая шапка «Перевёрнутого леса». variant="solid" — для внутренних страниц
// (тёмный фон сразу), variant="overlay" — прозрачная поверх hero, твердеет на скролле.
export default function ForestHeader({ variant = 'solid' }: { variant?: 'solid' | 'overlay' }) {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (variant !== 'overlay') return;
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [variant]);

    const solid = variant === 'solid' || scrolled;

    return (
        <>
        <header
            className={`${variant === 'overlay' ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-40 transition-colors duration-300 ${
                solid
                    ? 'bg-forest-ink/90 backdrop-blur-md border-b border-white/10'
                    : 'bg-gradient-to-b from-black/70 via-black/25 to-transparent'
            }`}
        >
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
                <Link href="/" aria-label="Кучер и Conga — на главную" className="inline-flex items-center">
                    <img
                        src="/redesign/kongo_logo_main.svg"
                        alt="Кучер и Conga"
                        className="block h-[26px] w-auto"
                        style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 10px rgba(0,0,0,0.55))' }}
                    />
                </Link>

                <nav className="hidden items-center gap-1 text-[15px] md:flex">
                    {NAV_TOP.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="rounded-lg px-3.5 py-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                            style={{ textShadow: solid ? 'none' : '0 1px 10px rgba(0,0,0,0.5)' }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Открыть меню разделов"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10"
                >
                    <Menu className="h-[18px] w-[18px]" aria-hidden />
                    <span>Разделы</span>
                </button>
            </div>
        </header>
        {/* Дровер вне <header>: у шапки backdrop-blur создаёт содержащий блок и
            контекст наложения — вложенный fixed-дровер попадал ПОД контент. */}
        <NavDrawer open={open} onClose={() => setOpen(false)} />
        </>
    );
}

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
                    />
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                        className="fixed bottom-0 right-0 top-0 z-[61] flex w-[min(88vw,380px)] flex-col overflow-y-auto border-l border-white/10 bg-forest p-6"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <span className="font-display text-xl font-black text-white">Разделы</span>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Закрыть меню"
                                className="rounded-lg border border-white/40 bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10"
                            >
                                <X className="h-[18px] w-[18px]" aria-hidden />
                            </button>
                        </div>
                        <nav className="flex flex-col">
                            {NAV.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className="block border-b border-white/10 py-3.5 text-[18px] text-cream/90 transition-all hover:translate-x-2 hover:text-white"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="mt-auto flex flex-col gap-1.5 pt-6">
                            {SITE.phones.map((p) => (
                                <a key={p.tel} href={`tel:${p.tel}`} className="text-[16px] text-cream/90">
                                    {p.label}
                                </a>
                            ))}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
