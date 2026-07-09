'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// Лендинг-хаб «Перевёрнутый лес». Дизайн и моушен — по утверждённому макету и спеке.
// Палитра снята с зала Conga: лесной зелёный, терракота кресел, латунь ламп, окись штор.
//
// ВАЖНО: Tailwind в этом проекте не сканирует app/redesign/*, поэтому всё оформление —
// инлайн-стили и собственные классы rf-*. Tailwind-утилиты здесь НЕ использовать.

const A = '/redesign';

const C = {
    onForest: '#F4F7F2',
    onForestSoft: 'rgba(244,247,242,0.78)',
    terracotta: '#AC4823',
    brass: '#C29455',
};

// Одна точка входа в каждый раздел — блоки ведут на отдельные страницы (для SEO/GEO).
const LINKS = {
    menu: '/menu',
    booking: '/booking',
    promotions: '/promotions',
    events: '/events',
    vacancies: '/vacancies',
};

const EASE = [0.22, 1, 0.36, 1] as const;
const glass: React.CSSProperties = { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', background: 'rgba(255,255,255,0.10)' };

const GALLERY = [1, 2, 3, 4, 5, 6].map((n) => `/atmosphere_${n}.webp`);
const YANDEX_REVIEWS = 'https://yandex.ru/maps-reviews-widget/10214255530?comments';
const YANDEX_MAP = 'https://yandex.ru/map-widget/v1/?um=constructor%3A1c90c41847ab12bb686f7ffc03fcb5b1930c854da9e094965c7ac7ad24f8e4b7&source=constructor';
const YANDEX_ORG = 'https://yandex.ru/maps/org/kucher_conga/10214255530/';

// Полная навигация для выдвижного меню.
const NAV = [
    { href: LINKS.menu, label: 'Меню и доставка' },
    { href: LINKS.booking, label: 'Забронировать стол' },
    { href: LINKS.promotions, label: 'Акции' },
    { href: LINKS.events, label: 'События' },
    { href: LINKS.vacancies, label: 'Вакансии' },
    { href: '#atmosphere', label: 'Атмосфера' },
    { href: '#reviews', label: 'Отзывы гостей' },
    { href: '#find', label: 'Как нас найти' },
];

function useHeroVideo() {
    const [src, setSrc] = useState<{ mp4: string; poster: string } | null>(null);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const pick = () =>
            setSrc(mq.matches
                ? { mp4: `${A}/hero-desktop.mp4`, poster: `${A}/hero-desktop-poster.jpg` }
                : { mp4: `${A}/hero-mobile.mp4`, poster: `${A}/hero-mobile-poster.jpg` });
        pick();
        mq.addEventListener('change', pick);
        return () => mq.removeEventListener('change', pick);
    }, []);
    return src;
}

// Контент-слой блока едет к курсору (spring); reduced-motion гасит параллакс.
function Parallax({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    const reduce = useReducedMotion();
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const x = useSpring(mx, { stiffness: 120, damping: 14 });
    const y = useSpring(my, { stiffness: 120, damping: 14 });
    if (reduce) return <div style={style}>{children}</div>;
    return (
        <motion.div
            style={{ ...style, x, y }}
            onPointerMove={(e) => {
                if (e.pointerType !== 'mouse') return;
                const r = e.currentTarget.parentElement!.getBoundingClientRect();
                mx.set((((e.clientX - r.left) / r.width) * 2 - 1) * 6);
                my.set((((e.clientY - r.top) / r.height) * 2 - 1) * 6);
            }}
            onPointerLeave={() => { mx.set(0); my.set(0); }}
        >
            {children}
        </motion.div>
    );
}

function Arrow({ r, b, t, size = 20 }: { r: number; b?: number; t?: number; size?: number }) {
    return <span className="rf-arrow" style={{ position: 'absolute', right: r, bottom: b, top: t, fontSize: size, color: C.onForest }}>→</span>;
}

function Sweep({ w }: { w: string }) {
    return <div className="rf-sweep" style={{ position: 'absolute', top: '-15%', bottom: '-15%', left: 0, width: w, background: 'linear-gradient(105deg,transparent,rgba(255,255,255,0.17),transparent)', pointerEvents: 'none' }} />;
}

const bandBase: React.CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', ...glass, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' };

export default function RedesignClient() {
    const video = useHeroVideo();
    const [scrolled, setScrolled] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
    const [lightbox, setLightbox] = useState<number | null>(null);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <main className="rf" style={{ margin: 0, background: '#0F1411', color: C.onForest, fontFamily: 'var(--font-body), system-ui, sans-serif', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            <style>{`
                .rf a { color: ${C.terracotta}; text-decoration: none; }
                .rf-serif { font-family: var(--font-display), Georgia, serif; }
                @keyframes rfChev { 0%{transform:translateY(0);opacity:0} 25%{opacity:1} 70%{opacity:1} 100%{transform:translateY(8px);opacity:0} }
                @keyframes rfSteam { 0%{transform:translateY(0) scaleX(1);opacity:0} 30%{opacity:.45} 100%{transform:translateY(-30px) scaleX(1.25);opacity:0} }
                @keyframes rfFlicker { 0%{opacity:.7} 42%{opacity:.86} 55%{opacity:.74} 100%{opacity:.9} }
                @keyframes rfTwinkle { from{opacity:.2} to{opacity:.9} }
                @keyframes rfSweep { from{transform:translateX(-240%) skewX(-14deg)} to{transform:translateX(340%) skewX(-14deg)} }
                .rf-bb .rf-photo { transition: transform .7s cubic-bezier(.22,1,.36,1); will-change: transform; }
                .rf-bb .rf-arrow { transition: transform .35s cubic-bezier(.22,1,.36,1); }
                .rf-bb .rf-sweep { opacity: 0; }
                @media (hover: hover) and (pointer: fine) {
                    .rf-bb:hover .rf-photo { transform: scale(1.05); }
                    .rf-bb:hover .rf-arrow { transform: translate(4px,-4px); }
                    .rf-bb:hover .rf-sweep { opacity: 1; animation: rfSweep .6s ease 1 both; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .rf-anim, .rf-anim * { animation: none !important; transition: none !important; }
                }
                .rf-btn { transition: transform .15s cubic-bezier(.22,1,.36,1), background .2s ease, border-color .2s ease; cursor: pointer; }
                .rf-btn:active { transform: scale(.97); }
                .rf-btn-primary:hover { background: #8F3A1B; }
                .rf-btn-ghost:hover { background: rgba(244,247,242,0.14); border-color: rgba(244,247,242,0.6); }
                .rf-nav a { padding: 8px 14px; border-radius: 8px; color: #FFFFFF; transition: background .2s ease; }
                .rf-nav a:hover { background: rgba(255,255,255,0.14); }
                .rf-menu-btn { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border-radius: 8px; padding: 9px 14px; border: 1px solid rgba(244,247,242,0.4); color: #FFFFFF; background: rgba(255,255,255,0.04); transition: background .2s ease, border-color .2s ease; }
                .rf-menu-btn:hover { background: rgba(255,255,255,0.14); border-color: rgba(244,247,242,0.6); }
                a.rf-drawer-link { display: block; padding: 14px 4px; font-size: 18px; color: #EDF2EA; border-bottom: 1px solid rgba(244,247,242,0.1); transition: color .2s ease, transform .2s ease; }
                a.rf-drawer-link:hover { color: #FFFFFF; transform: translateX(8px); }
                .rf-nav { display: none; }
                .rf-wrap { padding-left: 20px; padding-right: 20px; }
                .rf-hero-pad { padding-left: 20px; padding-right: 20px; padding-bottom: 76px; }
                .rf-h1 { font-size: clamp(2.6rem, 8vw, 3rem); }
                .rf-lede { font-size: 15px; }
                .rf-btns { flex-direction: column; width: 100%; }
                .rf-hero-btn { height: 56px; width: 100%; }
                .rf-desk { display: none; }
                .rf-mob { display: grid; }
                .rf-bentopad { padding-top: 28px; padding-bottom: 28px; }
                .rf-foot { grid-template-columns: 1fr; }
                .rf-find { grid-template-columns: 1fr; }
                @media (min-width: 768px) {
                    .rf-find { grid-template-columns: 1.5fr 1fr; }
                    .rf-nav { display: flex; }
                    .rf-wrap { padding-left: 32px; padding-right: 32px; }
                    .rf-hero-pad { padding-left: 100px; padding-right: 100px; padding-bottom: 118px; }
                    .rf-h1 { font-size: clamp(3.4rem, 6vw, 5.1rem); }
                    .rf-lede { font-size: 19px; }
                    .rf-btns { flex-direction: row; width: auto; }
                    .rf-hero-btn { height: 60px; width: auto; min-width: 250px; }
                    .rf-desk { display: grid; }
                    .rf-mob { display: none; }
                    .rf-bentopad { padding-top: 84px; padding-bottom: 84px; }
                    .rf-foot { grid-template-columns: 1.2fr 1fr 1fr; }
                }
            `}</style>

            {/* Фикс-хедер: тёмный скрим сверху для читаемости поверх видео */}
            <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, transition: 'background .3s, backdrop-filter .3s', background: scrolled ? 'rgba(15,20,17,0.86)' : 'linear-gradient(180deg, rgba(11,16,12,0.72) 0%, rgba(11,16,12,0.28) 60%, transparent 100%)', backdropFilter: scrolled ? 'blur(10px)' : 'none' }}>
                <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <Link href={A} className="rf-serif" style={{ fontWeight: 900, fontSize: 20, color: '#FFFFFF', textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>Кучер <span style={{ color: C.brass }}>&</span> Conga</Link>
                    <nav className="rf-nav" style={{ alignItems: 'center', gap: 6, fontSize: 15, color: '#FFFFFF', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
                        <Link href={LINKS.menu}>Меню</Link>
                        <Link href={LINKS.booking}>Бронь</Link>
                        <Link href={LINKS.events}>События</Link>
                        <Link href={LINKS.vacancies}>Команда</Link>
                    </nav>
                    <button type="button" onClick={() => setNavOpen(true)} className="rf-menu-btn" aria-label="Открыть меню разделов" style={{ fontSize: 14, fontWeight: 500, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                        <Menu style={{ width: 18, height: 18 }} aria-hidden />
                        <span>Разделы</span>
                    </button>
                </div>
            </header>

            {/* Выдвижное меню разделов справа */}
            <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

            <div className="rf-anim">
                {/* HERO: живой полог на видео, на весь экран */}
                <section style={{ position: 'relative', overflow: 'hidden', height: '100svh', minHeight: 560, background: '#16211B' }}>
                    {video && (
                        <video key={video.mp4} autoPlay loop muted playsInline poster={video.poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
                            <source src={video.mp4} type="video/mp4" />
                        </video>
                    )}
                    {/* Равномерное затемнение — прячет дефекты видео */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,16,12,0.34)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,16,12,0.5) 0%,rgba(11,16,12,0.18) 32%,rgba(11,16,12,0.55) 66%,rgba(11,16,12,0.94) 100%)' }} />

                    <div className="rf-hero-pad" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 20, maxWidth: 880 }}>
                        <motion.div style={{ display: 'flex', alignItems: 'center', gap: 14 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                            <span className="rf-serif" style={{ fontWeight: 900, fontSize: 'clamp(19px,2vw,27px)', color: '#F8FAF6', textShadow: '0 2px 16px rgba(0,0,0,0.55)' }}>Кучер &amp; Conga</span>
                            <span style={{ width: 34, height: 3, background: '#C0492A' }} />
                            <span style={{ fontSize: 13, color: 'rgba(248,250,246,0.84)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>ресторан · Дмитров</span>
                        </motion.div>

                        <motion.h1 className="rf-serif rf-h1" style={{ fontWeight: 900, margin: 0, lineHeight: 1.04, color: '#F8FAF6', textWrap: 'balance' as any, textShadow: '0 4px 30px rgba(0,0,0,0.55)' }} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: EASE }}>
                            Здесь лес растёт с&nbsp;потолка
                        </motion.h1>

                        <motion.p className="rf-lede" style={{ margin: 0, lineHeight: 1.58, color: 'rgba(248,250,246,0.9)', maxWidth: 565, textWrap: 'pretty' as any, textShadow: '0 2px 18px rgba(0,0,0,0.6)' }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16, ease: EASE }}>
                            Над залом висит настоящий сад, а среди зелени светятся войлочные лампы-грибы. Внизу — авторская кухня, мангал и тёплый свет над каждым столом.
                        </motion.p>

                        <motion.div className="rf-btns" style={{ display: 'flex', gap: 12, marginTop: 4 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24, ease: EASE }}>
                            <Link href={LINKS.booking} className="rf-btn rf-btn-primary rf-hero-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 600, fontSize: 16, letterSpacing: '0.01em', padding: '0 36px', background: C.terracotta, color: '#FBF3EA', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 8px 24px rgba(172,72,35,0.32)' }}>Забронировать стол</Link>
                            <Link href={LINKS.menu} className="rf-btn rf-btn-ghost rf-hero-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 500, fontSize: 16, padding: '0 36px', border: '1px solid rgba(244,247,242,0.45)', color: '#FFFFFF', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}>Заказать доставку</Link>
                        </motion.div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <svg viewBox="0 0 20 12" width="20" height="12" style={{ display: 'block', animation: 'rfChev 2s ease-in-out infinite' }}>
                            <path d="M 2 2 L 10 10 L 18 2" fill="none" stroke="#F4F7F2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 11, color: 'rgba(244,247,242,0.62)' }}>листайте</span>
                    </div>
                </section>

                {/* БЕНТО над фото зала — на весь экран */}
                <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center' }}>
                    <img src="/hero-image.webp" alt="Зал с подвешенным лесом" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,19,14,0.72) 0%,rgba(12,19,14,0.58) 45%,rgba(12,19,14,0.85) 100%)' }} />

                    <div className="rf-wrap rf-bentopad" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
                        {/* Desktop grid */}
                        <div className="rf-desk" style={{ gridTemplateColumns: '50% 27% 23%', gridTemplateRows: '346px 282px' }}>
                            {/* A. Меню и доставка */}
                            <Link href={LINKS.menu} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', gridColumn: 1, gridRow: '1 / 3', ...glass, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                <div style={{ position: 'absolute', left: 20, right: 20, top: 20, bottom: 132, borderRadius: '180px 180px 20px 20px', overflow: 'hidden' }}>
                                    <img className="rf-photo" src="/atmosphere_1.webp" alt="Авторское блюдо и вино" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%', display: 'block' }} />
                                    <div style={{ position: 'absolute', left: '36%', top: '16%', width: 52, height: 96, background: 'radial-gradient(closest-side,rgba(255,255,255,0.55),transparent)', filter: 'blur(9px)', animation: 'rfSteam 6s ease-in-out 1s infinite' }} />
                                </div>
                                <Parallax style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '24px 30px 26px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 35, color: C.onForest }}>Меню и доставка</h3>
                                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: C.onForestSoft, maxWidth: 480 }}>Авторская кухня и мангал. <span style={{ color: C.brass }}>Привезём горячим по Дмитрову — бесплатно.</span></p>
                                </Parallax>
                                <Arrow r={26} b={26} size={24} />
                                <Sweep w="38%" />
                            </Link>

                            {/* B. Забронировать стол */}
                            <Link href={LINKS.booking} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', gridColumn: '2 / 4', gridRow: 1, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                <img className="rf-photo" src={`${A}/bron-real.webp`} alt="Столы в зале ресторана" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 80%' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.12),rgba(14,22,17,0.42))' }} />
                                <div style={{ position: 'absolute', right: '16%', top: '26%', width: 130, height: 130, background: 'radial-gradient(closest-side,rgba(255,201,122,0.5),transparent)', filter: 'blur(14px)', animation: 'rfFlicker 5.2s ease-in-out 1.4s infinite alternate' }} />
                                <Parallax style={{ ...bandBase, padding: '20px 26px 22px', gap: 6 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 26, color: C.onForest }}>Забронировать стол</h3>
                                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: C.onForestSoft, maxWidth: 420 }}>Зал Conga, веранда у леса или банкетный зал — выберите место под лампами.</p>
                                </Parallax>
                                <Arrow r={24} b={22} size={22} />
                                <Sweep w="38%" />
                            </Link>

                            {/* C. Акции */}
                            <Link href={LINKS.promotions} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', gridColumn: 2, gridRow: 2, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                <img className="rf-photo" src={`${A}/konga_bron.webp`} alt="Зал Conga" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.12),rgba(14,22,17,0.52))' }} />
                                <Parallax style={{ ...bandBase, padding: '18px 26px 22px', gap: 6 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 23, color: C.onForest }}>Акции</h3>
                                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(244,247,242,0.85)' }}>Сезонные предложения и особые вечера в Conga.</p>
                                </Parallax>
                                <Arrow r={24} t={22} size={20} />
                                <Sweep w="45%" />
                            </Link>

                            {/* D + E */}
                            <div style={{ gridColumn: 3, gridRow: 2, display: 'grid', gridTemplateRows: '58% 42%' }}>
                                <Link href={LINKS.events} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                    <img className="rf-photo" src="/atmosphere_3.webp" alt="Вечер в зале Conga" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 54%' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.24),rgba(14,22,17,0.6))' }} />
                                    <span style={{ position: 'absolute', left: 26, top: 20, width: 5, height: 5, borderRadius: '50%', background: '#FFD9A0', boxShadow: '0 0 9px 2px rgba(255,217,160,0.75)', animation: 'rfTwinkle 3s ease-in-out 0.6s infinite alternate' }} />
                                    <Parallax style={{ ...bandBase, padding: '16px 26px 18px', gap: 5 }}>
                                        <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 20, color: C.onForest }}>События</h3>
                                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(244,247,242,0.85)' }}>Концерты и праздники под подвешенным садом.</p>
                                    </Parallax>
                                    <Arrow r={22} t={18} size={18} />
                                    <Sweep w="50%" />
                                </Link>
                                <Link href={LINKS.vacancies} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px' }}>
                                    <img className="rf-photo" src="/atmosphere_2.webp" alt="Команда ресторана" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 46%' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(14,22,17,0.82) 32%,rgba(14,22,17,0.4))' }} />
                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: C.onForest }}>Вакансии</h3>
                                        <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(244,247,242,0.8)' }}>Ищем тех, кто любит гостей.</p>
                                    </div>
                                    <span className="rf-arrow" style={{ position: 'relative', fontSize: 17, color: C.onForest }}>→</span>
                                    <Sweep w="50%" />
                                </Link>
                            </div>
                        </div>

                        {/* Mobile grid */}
                        <div className="rf-mob" style={{ gridTemplateRows: '300px 216px 168px 132px' }}>
                            <Link href={LINKS.menu} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', ...glass, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                <div style={{ position: 'absolute', left: 14, right: 14, top: 14, bottom: 96, borderRadius: '120px 120px 14px 14px', overflow: 'hidden' }}>
                                    <img src="/atmosphere_1.webp" alt="Авторское блюдо и вино" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 60%' }} />
                                </div>
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 23, color: C.onForest }}>Меню и доставка</h3>
                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: C.onForestSoft, maxWidth: 280 }}>Авторская кухня и мангал. <span style={{ color: C.brass }}>Доставка бесплатная.</span></p>
                                </div>
                                <Arrow r={18} b={18} size={19} />
                            </Link>

                            <Link href={LINKS.booking} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                <img src={`${A}/bron-real.webp`} alt="Столы в зале ресторана" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 80%' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.12),rgba(14,22,17,0.42))' }} />
                                <div style={{ ...bandBase, padding: '14px 18px 16px', gap: 4 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 19, color: C.onForest }}>Забронировать стол</h3>
                                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: C.onForestSoft }}>Зал Conga, веранда или банкетный зал.</p>
                                </div>
                                <Arrow r={16} b={14} size={17} />
                            </Link>

                            <div style={{ display: 'grid', gridTemplateColumns: '55% 45%' }}>
                                <Link href={LINKS.promotions} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                    <img src={`${A}/konga_bron.webp`} alt="Зал Conga" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.14),rgba(14,22,17,0.55))' }} />
                                    <div style={{ ...bandBase, padding: '12px 16px 14px', gap: 4 }}>
                                        <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: C.onForest }}>Акции</h3>
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'rgba(244,247,242,0.85)' }}>Сезонные предложения.</p>
                                    </div>
                                    <Arrow r={14} t={12} size={15} />
                                </Link>
                                <Link href={LINKS.events} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                    <img src="/atmosphere_3.webp" alt="Вечер в зале Conga" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 54%' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.24),rgba(14,22,17,0.6))' }} />
                                    <div style={{ ...bandBase, padding: '12px 16px 14px', gap: 4 }}>
                                        <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: C.onForest }}>События</h3>
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'rgba(244,247,242,0.85)' }}>Концерты и праздники.</p>
                                    </div>
                                    <Arrow r={14} t={12} size={15} />
                                </Link>
                            </div>

                            <Link href={LINKS.vacancies} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
                                <img src="/atmosphere_2.webp" alt="Команда ресторана" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 46%' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(14,22,17,0.82) 34%,rgba(14,22,17,0.42))' }} />
                                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.onForest }}>Вакансии</h3>
                                    <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(244,247,242,0.8)' }}>Ищем тех, кто любит гостей.</p>
                                </div>
                                <span className="rf-arrow" style={{ position: 'relative', fontSize: 15, color: C.onForest }}>→</span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* АТМОСФЕРА — галерея */}
                <section id="atmosphere" style={{ background: '#182620', padding: '72px 0' }}>
                    <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto' }}>
                        <SectionHead kicker="Зал Conga" title="Атмосфера" />
                        <div className="rf-gallery" style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                            {GALLERY.map((src, i) => (
                                <button key={src} type="button" onClick={() => setLightbox(i)} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', aspectRatio: '4 / 3', padding: 0, background: 'none' }}>
                                    <img className="rf-photo" src={src} alt={`Атмосфера ресторана, фото ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                                    <Sweep w="55%" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ОТЗЫВЫ — виджет Яндекс.Карт */}
                <section id="reviews" style={{ background: '#22352A', padding: '72px 0' }}>
                    <div className="rf-wrap" style={{ maxWidth: 900, margin: '0 auto' }}>
                        <SectionHead kicker="Нам доверяют" title="Отзывы гостей" />
                        <div style={{ marginTop: 36, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', ...glass }}>
                            <iframe
                                src={YANDEX_REVIEWS}
                                title="Отзывы о ресторане на Яндекс.Картах"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                style={{ width: '100%', height: 620, border: 0, display: 'block', background: '#fff' }}
                            />
                        </div>
                        <div style={{ marginTop: 16, textAlign: 'center' }}>
                            <a href={YANDEX_ORG} target="_blank" rel="noopener noreferrer" style={{ color: C.brass, fontSize: 14 }}>Читать все отзывы на Яндекс.Картах →</a>
                        </div>
                    </div>
                </section>

                {/* КАК НАС НАЙТИ — карта */}
                <section id="find" style={{ background: '#182620', padding: '72px 0' }}>
                    <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto' }}>
                        <SectionHead kicker="Дмитров" title="Как нас найти" />
                        <div className="rf-find" style={{ marginTop: 36, display: 'grid', gap: 20, alignItems: 'stretch' }}>
                            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <iframe
                                    src={YANDEX_MAP}
                                    title="Ресторан Кучер и Конга на карте Дмитрова"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    style={{ width: '100%', height: 420, border: 0, display: 'block' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center' }}>
                                <div><div style={{ fontSize: 12.5, color: C.brass, marginBottom: 6 }}>Адрес</div><div style={{ fontSize: 18, color: '#EDF2EA' }}>Дмитров, Промышленная улица, 20Б</div></div>
                                <div><div style={{ fontSize: 12.5, color: C.brass, marginBottom: 6 }}>Телефоны</div>
                                    <a href="tel:+79163177887" style={{ display: 'block', fontSize: 17, color: '#EDF2EA' }}>+7 (916) 317-78-87</a>
                                    <a href="tel:+79162977887" style={{ display: 'block', fontSize: 17, color: '#EDF2EA' }}>+7 (916) 297-78-87</a>
                                </div>
                                <a href={YANDEX_ORG} target="_blank" rel="noopener noreferrer" className="rf-btn rf-btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', borderRadius: 8, fontWeight: 600, padding: '13px 26px', background: C.terracotta, color: '#FBF3EA', border: '1px solid rgba(255,255,255,0.14)' }}>Открыть в Яндекс.Картах</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Футер */}
                <footer style={{ background: '#1B140E', borderTop: '3px solid #7A2E26' }}>
                    <div className="rf-wrap rf-foot" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 40, paddingBottom: 8, display: 'grid', gap: 28 }}>
                        <Col label="Адрес"><span style={{ fontSize: 16, color: '#EFE9E0', lineHeight: 1.5 }}>Дмитров, Промышленная улица, 20Б</span></Col>
                        <Col label="Телефоны">
                            <a href="tel:+79162977887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 297-78-87</a>
                            <a href="tel:+79163177887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 317-78-87</a>
                        </Col>
                        <Col label="Часы работы">
                            <span style={{ fontSize: 15, color: '#EFE9E0' }}>Пн–Чт&nbsp;&nbsp;12:00 — 23:00 <span style={{ color: 'rgba(239,233,224,0.5)' }}>(вход до 22:00)</span></span>
                            <span style={{ fontSize: 15, color: '#EFE9E0' }}>Пт, Сб&nbsp;&nbsp;12:00 — 01:00 <span style={{ color: 'rgba(239,233,224,0.5)' }}>(вход до 23:00)</span></span>
                            <span style={{ fontSize: 15, color: '#EFE9E0' }}>Вс&nbsp;&nbsp;13:00 — 23:00 <span style={{ color: 'rgba(239,233,224,0.5)' }}>(вход до 22:00)</span></span>
                            <span style={{ fontSize: 13, color: C.brass, marginTop: 4 }}>Брони и доставка — с 12:00 до 22:00</span>
                        </Col>
                    </div>
                    <div className="rf-wrap rf-foot-bottom" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 32, marginTop: 24, paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, borderTop: '1px solid rgba(239,233,224,0.12)' }}>
                        <span style={{ fontSize: 12.5, color: 'rgba(239,233,224,0.5)' }}>© 2026 Ресторан «Кучер и Конга»</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                            <a href="/privacy" style={{ color: 'rgba(239,233,224,0.72)' }}>Политика конфиденциальности</a>
                            <a href="/rules" style={{ color: 'rgba(239,233,224,0.72)' }}>Правила пользования</a>
                            <a href="https://t.me/Kvazar27" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(239,233,224,0.72)' }}>Сайт разработан — @Kvazar27</a>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Лайтбокс галереи */}
            <Lightbox index={lightbox} onClose={() => setLightbox(null)} onNav={(d) => setLightbox((i) => i === null ? null : (i + d + GALLERY.length) % GALLERY.length)} />
        </main>
    );
}

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
    const reduce = useReducedMotion();
    return (
        <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
            <span style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.brass }}>{kicker}</span>
            <h2 className="rf-serif" style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: '#F8FAF6', lineHeight: 1.05 }}>{title}</h2>
        </motion.div>
    );
}

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    useEffect(() => {
        if (open) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [open]);
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(9,13,10,0.6)', backdropFilter: 'blur(2px)' }}
                    />
                    <motion.aside
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 61, width: 'min(88vw, 380px)', background: '#182620', borderLeft: '1px solid rgba(255,255,255,0.12)', padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <span className="rf-serif" style={{ fontWeight: 900, fontSize: 20, color: '#FFFFFF' }}>Разделы</span>
                            <button type="button" onClick={onClose} aria-label="Закрыть меню" className="rf-menu-btn" style={{ padding: 9 }}><X style={{ width: 18, height: 18 }} aria-hidden /></button>
                        </div>
                        <nav style={{ display: 'flex', flexDirection: 'column' }}>
                            {NAV.map((item) => item.href.startsWith('#') ? (
                                <a key={item.href} href={item.href} onClick={onClose} className="rf-drawer-link">{item.label}</a>
                            ) : (
                                <Link key={item.href} href={item.href} onClick={onClose} className="rf-drawer-link">{item.label}</Link>
                            ))}
                        </nav>
                        <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <a href="tel:+79163177887" style={{ fontSize: 16, color: '#EDF2EA' }}>+7 (916) 317-78-87</a>
                            <a href="tel:+79162977887" style={{ fontSize: 16, color: '#EDF2EA' }}>+7 (916) 297-78-87</a>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

function Lightbox({ index, onClose, onNav }: { index: number | null; onClose: () => void; onNav: (d: number) => void }) {
    useEffect(() => {
        if (index === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onNav(-1);
            if (e.key === 'ArrowRight') onNav(1);
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [index, onClose, onNav]);
    return (
        <AnimatePresence>
            {index !== null && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(6,10,7,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                >
                    <button type="button" onClick={onClose} aria-label="Закрыть" style={{ position: 'fixed', top: 20, right: 20, padding: 10, borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}><X style={{ width: 24, height: 24 }} /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onNav(-1); }} aria-label="Предыдущее" style={{ position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 32, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer' }}>‹</button>
                    <img src={GALLERY[index]} alt={`Атмосфера ресторана, фото ${index + 1}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 12 }} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); onNav(1); }} aria-label="Следующее" style={{ position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 32, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: 'pointer' }}>›</button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Col({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: C.brass }}>{label}</span>
            {children}
        </div>
    );
}
