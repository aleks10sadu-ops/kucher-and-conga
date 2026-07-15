'use client';

import React, { useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Menu, X, ShieldCheck } from 'lucide-react';

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

// 8 фото на ПК (симметричная сетка 4×2), 6 на телефоне (последние два скрыты).
const GALLERY = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/atmosphere_${n}.webp`);

// Счётчик лопнутых спор — общий на все инстансы AtmosphereFX, сбрасывается при
// перезагрузке (модуль пересоздаётся). Простой pub/sub без внешних зависимостей.
let _popCount = 0;
const _popSubs = new Set<() => void>();
function bumpPop() { _popCount += 1; _popSubs.forEach((f) => f()); }
function usePopCount() {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => { _popSubs.add(force); return () => { _popSubs.delete(force); }; }, []);
    return _popCount;
}
// Плавающие споры-одуванчики под пологом. Детерминированный псевдо-рандом на
// Math.sin даёт одинаковую стартовую раскладку на сервере и клиенте — без
// hydration mismatch. Респаун после «лопания» уже клиентский (там Math.random ок).
type Spore = { id: number; top: string; left: string; size: number; dur: number; delay: number };
const rnd = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
const INITIAL_SPORES: Spore[] = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    top: (5 + rnd(i * 12.9898) * 86).toFixed(2) + '%',
    left: (3 + rnd(i * 78.233) * 92).toFixed(2) + '%',
    size: Math.round(18 + rnd(i * 3.17) * 16),
    dur: Math.round(13 + rnd(i * 9.7) * 11),
    delay: +(rnd(i * 4.3) * 8).toFixed(2),
}));
// Нити «зонтика» споры — предрасчёт, чтобы не пересчитывать на каждый рендер.
const FILAMENTS = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: +(12 + Math.cos(a) * 10).toFixed(2), y: +(12 + Math.sin(a) * 10).toFixed(2) };
});
// Перья папоротника вдоль стебля (снизу вверх): пара листочков на каждом узле,
// короче к верхушке. Используется в курсорном следе.
const FERN = Array.from({ length: 9 }, (_, i) => {
    const p = i / 9;                       // 0 у основания … 1 у верхушки
    const y = +(42 - p * 38).toFixed(2);   // высота узла на стебле
    const len = +(11 * (1 - p * 0.72)).toFixed(2);
    return { y, len };
});
const YANDEX_REVIEWS = 'https://yandex.ru/maps-reviews-widget/10214255530?comments';
// theme=dark — нативная тёмная тема виджета карты (проверено: фон rgb(33,35,38)).
const YANDEX_MAP = 'https://yandex.ru/map-widget/v1/?um=constructor%3A1c90c41847ab12bb686f7ffc03fcb5b1930c854da9e094965c7ac7ad24f8e4b7&source=constructor&theme=dark';
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
        // Видео — прогрессивное улучшение поверх постера: стартуем после window.load,
        // чтобы тяжёлый mp4 не отбирал канал у критических ресурсов первого экрана.
        const start = () => { pick(); mq.addEventListener('change', pick); };
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });
        return () => { window.removeEventListener('load', start); mq.removeEventListener('change', pick); };
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
                @keyframes rfFloat { 0%{transform:translate(0,0) rotate(0deg);opacity:.72} 50%{transform:translate(10px,-26px) rotate(9deg);opacity:1} 100%{transform:translate(0,0) rotate(0deg);opacity:.72} }
                @keyframes rfHeroIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                .rf-hero-in { animation: rfHeroIn .65s cubic-bezier(.22,1,.36,1) both; }
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
                .rf-social { transition: background .2s ease, border-color .2s ease, color .2s ease; }
                @media (hover: hover) and (pointer: fine) {
                    .rf-social:hover { background: #C9A24B !important; border-color: #C9A24B !important; color: #1B140E !important; }
                }
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
                .rf-rf2 { grid-template-columns: 1fr; }
                .rf-gallery { grid-template-columns: repeat(2, 1fr); }
                .rf-g-desk { display: none; }
                .rf-only-desk { display: none; }
                @media (min-width: 768px) {
                    .rf-find { grid-template-columns: 1.5fr 1fr; }
                    .rf-rf2 { grid-template-columns: 1.05fr 0.95fr; }
                    .rf-gallery { grid-template-columns: repeat(4, 1fr); }
                    .rf-g-desk { display: block; }
                    .rf-only-desk { display: block; }
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
                    <Link href={A} aria-label="Кучер и Conga — на главную" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <img src={`${A}/kongo_logo_main.svg`} alt="Кучер и Conga" style={{ height: 26, width: 'auto', display: 'block', filter: 'brightness(0) invert(1) drop-shadow(0 1px 10px rgba(0,0,0,0.55))' }} />
                    </Link>
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

            {/* Счётчик лопнутых спор (только ПК): едет справа от бенто до заголовка «Атмосфера» */}
            <PopCounter />

            <div className="rf-anim">
                {/* HERO: живой полог на видео, на весь экран */}
                <section style={{ position: 'relative', overflow: 'hidden', height: '100svh', minHeight: 560, background: '#16211B' }}>
                    {/* Постер в SSR-разметке: первый экран виден мгновенно, ещё до загрузки JS */}
                    <picture>
                        <source media="(min-width: 768px)" srcSet={`${A}/hero-desktop-poster.jpg`} />
                        <img src={`${A}/hero-mobile-poster.jpg`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </picture>
                    {video && (
                        <video key={video.mp4} autoPlay loop muted playsInline poster={video.poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
                            <source src={video.mp4} type="video/mp4" />
                        </video>
                    )}
                    {/* Равномерное затемнение — прячет дефекты видео */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,16,12,0.34)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(11,16,12,0.5) 0%,rgba(11,16,12,0.18) 32%,rgba(11,16,12,0.55) 66%,rgba(11,16,12,0.94) 100%)' }} />

                    {/* Вход hero-текста — чистый CSS: играет сразу с HTML, не ждёт гидрации JS */}
                    <div className="rf-hero-pad" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 20, maxWidth: 880 }}>
                        <div className="rf-hero-in" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span className="rf-serif" style={{ fontWeight: 900, fontSize: 'clamp(19px,2vw,27px)', color: '#F8FAF6', textShadow: '0 2px 16px rgba(0,0,0,0.55)' }}>Кучер &amp; Conga</span>
                            <span style={{ width: 34, height: 3, background: '#C0492A' }} />
                            <span style={{ fontSize: 13, color: 'rgba(248,250,246,0.84)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>ресторан · Дмитров</span>
                        </div>

                        <h1 className="rf-serif rf-h1 rf-hero-in" style={{ fontWeight: 900, margin: 0, lineHeight: 1.04, color: '#F8FAF6', textWrap: 'balance' as any, textShadow: '0 4px 30px rgba(0,0,0,0.55)', animationDelay: '.08s' }}>
                            Здесь лес растёт с&nbsp;потолка
                        </h1>

                        <p className="rf-lede rf-hero-in" style={{ margin: 0, lineHeight: 1.58, color: 'rgba(248,250,246,0.9)', maxWidth: 565, textWrap: 'pretty' as any, textShadow: '0 2px 18px rgba(0,0,0,0.6)', animationDelay: '.16s' }}>
                            Над залом висит настоящий сад, а среди зелени светятся войлочные лампы-грибы. Внизу — авторская кухня, мангал и тёплый свет над каждым столом.
                        </p>

                        <div className="rf-btns rf-hero-in" style={{ display: 'flex', gap: 12, marginTop: 4, animationDelay: '.24s' }}>
                            <Link href={LINKS.booking} className="rf-btn rf-btn-primary rf-hero-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 600, fontSize: 16, letterSpacing: '0.01em', padding: '0 36px', background: C.terracotta, color: '#FBF3EA', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 8px 24px rgba(172,72,35,0.32)' }}>Забронировать стол</Link>
                            <Link href={LINKS.menu} className="rf-btn rf-btn-ghost rf-hero-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 500, fontSize: 16, padding: '0 36px', border: '1px solid rgba(244,247,242,0.45)', color: '#FFFFFF', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}>Заказать доставку</Link>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <svg viewBox="0 0 20 12" width="20" height="12" style={{ display: 'block', animation: 'rfChev 2s ease-in-out infinite' }}>
                            <path d="M 2 2 L 10 10 L 18 2" fill="none" stroke="#F4F7F2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 11, color: 'rgba(244,247,242,0.62)' }}>листайте</span>
                    </div>
                </section>

                {/* Официальное уведомление: у ресторана один адрес, филиалов нет */}
                <SingleLocationNotice />

                {/* БЕНТО над фото зала — на весь экран */}
                <section id="bento" style={{ position: 'relative', minHeight: '100svh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <img src="/hero-image.webp" alt="Зал с подвешенным лесом" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,19,14,0.72) 0%,rgba(12,19,14,0.58) 45%,rgba(12,19,14,0.85) 100%)' }} />

                    {/* Споры + курсорный след-папоротник и в разделе бенто */}
                    <AtmosphereFX />

                    <div className="rf-wrap rf-bentopad" style={{ position: 'relative', zIndex: 2, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
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
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'rgba(244,247,242,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Сезонные предложения</p>
                                    </div>
                                    <Arrow r={14} t={12} size={15} />
                                </Link>
                                <Link href={LINKS.events} className="rf-bb" style={{ position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                                    <img src="/atmosphere_3.webp" alt="Вечер в зале Conga" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 54%' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,22,17,0.24),rgba(14,22,17,0.6))' }} />
                                    <div style={{ ...bandBase, padding: '12px 16px 14px', gap: 4 }}>
                                        <h3 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 17, color: C.onForest }}>События</h3>
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'rgba(244,247,242,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Концерты и вечера</p>
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

                {/* Нижний блок: реальное фото зала под тёмным слоем + атмосферные эффекты */}
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Фон — интерьер зала, затемнён, чтобы текст читался, а споры светились */}
                    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                        <img src="/hero-image.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,16,12,0.86) 0%,rgba(10,16,12,0.9) 50%,rgba(10,16,12,0.94) 100%)' }} />
                    </div>

                    {/* Споры (за контентом, только в пустых местах) + курсорный след-папоротник (поверх) */}
                    <AtmosphereFX />

                    {/* АТМОСФЕРА — галерея */}
                    <section id="atmosphere" style={{ position: 'relative', zIndex: 2, paddingTop: 72, paddingBottom: 34 }}>
                        <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto' }}>
                            <SectionHead kicker="Зал Conga" title="Атмосфера" />
                            <div className="rf-gallery" style={{ marginTop: 36, display: 'grid', gap: 12 }}>
                                {GALLERY.map((src, i) => (
                                    <button key={src} type="button" onClick={() => setLightbox(i)} className={`rf-bb${i >= 6 ? ' rf-g-desk' : ''}`} style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', aspectRatio: '4 / 3', padding: 0, background: 'none' }}>
                                        <img className="rf-photo" src={src} alt={`Атмосфера ресторана, фото ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                                        <Sweep w="55%" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ОТЗЫВЫ + КАК НАС НАЙТИ — на одном уровне: отзывы слева, карта справа */}
                    <section id="reviews" style={{ position: 'relative', zIndex: 2, paddingTop: 10, paddingBottom: 76 }}>
                        <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto' }}>
                            <div className="rf-rf2" style={{ display: 'grid', gap: 28, alignItems: 'start' }}>
                                {/* Отзывы */}
                                <div>
                                    <SectionHead kicker="Нам доверяют" title="Отзывы гостей" />
                                    <div style={{ marginTop: 26, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', ...glass }}>
                                        <LazyFrame src={YANDEX_REVIEWS} title="Отзывы о ресторане на Яндекс.Картах" height={560} dark note="Загружаем отзывы…" />
                                    </div>
                                    <div style={{ marginTop: 14 }}>
                                        <a href={YANDEX_ORG} target="_blank" rel="noopener noreferrer" style={{ color: C.brass, fontSize: 14 }}>Читать все отзывы на Яндекс.Картах →</a>
                                    </div>
                                </div>

                                {/* Как нас найти */}
                                <div id="find">
                                    <SectionHead kicker="Дмитров" title="Как нас найти" />
                                    <div style={{ marginTop: 26, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
                                        <LazyFrame src={YANDEX_MAP} title="Ресторан Кучер и Конга на карте Дмитрова" height={360} note="Загружаем карту…" />
                                    </div>
                                    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                        <div><div style={{ fontSize: 12.5, color: C.brass, marginBottom: 6 }}>Адрес</div><div style={{ fontSize: 18, color: '#EDF2EA' }}>Дмитров, Промышленная улица, 20Б</div></div>
                                        <div><div style={{ fontSize: 12.5, color: C.brass, marginBottom: 6 }}>Телефоны</div>
                                            <a href="tel:+79163177887" style={{ display: 'block', fontSize: 17, color: '#EDF2EA' }}>+7 (916) 317-78-87</a>
                                            <a href="tel:+79162977887" style={{ display: 'block', fontSize: 17, color: '#EDF2EA' }}>+7 (916) 297-78-87</a>
                                        </div>
                                        <a href={YANDEX_ORG} target="_blank" rel="noopener noreferrer" className="rf-btn rf-btn-primary" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', borderRadius: 8, fontWeight: 600, padding: '13px 26px', background: C.terracotta, color: '#FBF3EA', border: '1px solid rgba(255,255,255,0.14)' }}>Открыть в Яндекс.Картах</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Футер */}
                <footer style={{ background: '#1B140E', borderTop: '3px solid #7A2E26' }}>
                    <div className="rf-wrap rf-foot" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 40, paddingBottom: 8, display: 'grid', gap: 28 }}>
                        <Col label="Адрес"><span style={{ fontSize: 16, color: '#EFE9E0', lineHeight: 1.5 }}>Дмитров, Промышленная улица, 20Б</span></Col>
                        <Col label="Телефоны">
                            <a href="tel:+79162977887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 297-78-87</a>
                            <a href="tel:+79163177887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 317-78-87</a>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}>
                                <a href="https://t.me/kucherandconga" target="_blank" rel="noopener noreferrer" aria-label="Мы в Telegram" className="rf-social" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, border: '1px solid rgba(239,233,224,0.15)', background: 'rgba(239,233,224,0.06)', padding: '8px 16px 8px 10px', fontSize: 14, color: '#EFE9E0' }}>
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><path d="M9.78 15.6 9.6 20c.53 0 .76-.23 1.03-.5l2.48-2.37 5.14 3.76c.94.52 1.61.25 1.86-.87l3.38-15.83c.3-1.4-.5-1.94-1.42-1.6L1.14 9.9c-1.37.53-1.35 1.29-.23 1.63l5.1 1.6L17.8 6.32c.56-.37 1.06-.16.65.2Z" /></svg>
                                    Мы в Telegram
                                </a>
                                <a href="https://vk.com/restoran_kucher" target="_blank" rel="noopener noreferrer" aria-label="Мы ВКонтакте" className="rf-social" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, border: '1px solid rgba(239,233,224,0.15)', background: 'rgba(239,233,224,0.06)', padding: '8px 16px 8px 10px', fontSize: 14, color: '#EFE9E0' }}>
                                    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden><path d="M13.16 17.36c-5.46 0-8.98-3.84-9.12-10.2h2.79c.1 4.68 2.26 6.68 3.9 7.09V7.16h2.66v3.94c1.6-.17 3.28-2.03 3.85-3.94h2.6c-.43 2.35-2.23 4.2-3.5 4.97 1.27.62 3.32 2.24 4.12 5.23h-2.86c-.62-1.98-2.15-3.5-4.21-3.71v3.71h-.32Z" /></svg>
                                    Мы ВКонтакте
                                </a>
                            </div>
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

// Официальное уведомление: у ресторана единственный адрес, филиалов и других залов нет.
// Без упоминания названий, адресов и фото сторонних заведений — по юридическим причинам.
function SingleLocationNotice() {
    return (
        <section aria-label="Официальное уведомление" style={{ position: 'relative', zIndex: 3, background: '#120E0A', borderTop: '1px solid rgba(194,148,85,0.28)', borderBottom: '1px solid rgba(194,148,85,0.28)' }}>
            <div className="rf-wrap rf-notice" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 22, paddingBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <div className="rf-notice-icon" style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(172,72,35,0.16)', border: '1px solid rgba(194,148,85,0.4)' }}>
                    <ShieldCheck style={{ width: 24, height: 24, color: C.brass }} aria-hidden />
                </div>
                <div>
                    <h2 className="rf-serif" style={{ margin: 0, fontWeight: 700, fontSize: 20, color: '#F4F7F2', lineHeight: 1.25 }}>
                        У&nbsp;нас один ресторан
                    </h2>
                    <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.6, color: 'rgba(244,247,242,0.82)', maxWidth: 760 }}>
                        «Кучер&nbsp;&amp;&nbsp;Conga» работает по&nbsp;единственному адресу — Дмитров, Промышленная&nbsp;улица,&nbsp;20Б.
                        Филиалов и&nbsp;других залов в&nbsp;городе у&nbsp;нас нет. Любые заведения с&nbsp;похожими названиями к&nbsp;нам
                        не&nbsp;относятся и&nbsp;нашими партнёрами не&nbsp;являются.
                    </p>
                </div>
            </div>
        </section>
    );
}

// Споры-одуванчики: светящееся семя с нитями-зонтиком. Наведи курсор — лопается,
// разлетается частицами, и на её месте где-то ещё появляется новая.
function SporeGlyph() {
    return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
            <g stroke="rgba(246,249,243,0.72)" strokeWidth={1} strokeLinecap="round">
                {FILAMENTS.map((f, i) => (
                    <g key={i}>
                        <line x1={12} y1={12} x2={f.x} y2={f.y} />
                        <circle cx={f.x} cy={f.y} r={0.9} fill="rgba(246,249,243,0.85)" stroke="none" />
                    </g>
                ))}
            </g>
            <circle cx={12} cy={12} r={2.4} fill="#F6F9F3" />
        </svg>
    );
}

// Разлёт частиц при сдувании споры (координаты в px внутри слоя эффектов).
function Burst({ left, top, size }: { left: number; top: number; size: number }) {
    const n = 8;
    return (
        <div style={{ position: 'absolute', left, top, width: 0, height: 0, pointerEvents: 'none' }}>
            {Array.from({ length: n }, (_, i) => {
                const a = (i / n) * Math.PI * 2;
                const d = size * 1.4 + (i % 3) * 8;
                const px = Math.max(3, Math.round(size * 0.22));
                return (
                    <motion.span key={i}
                        initial={{ opacity: 0.95, x: 0, y: 0, scale: 1 }}
                        animate={{ opacity: 0, x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.2 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ position: 'absolute', left: -px / 2, top: -px / 2, width: px, height: px, borderRadius: '50%', background: 'radial-gradient(closest-side,#F6F9F3,rgba(194,148,85,0.5),transparent)' }}
                    />
                );
            })}
        </div>
    );
}

// Побег папоротника в курсорном следе.
function FernGlyph() {
    return (
        <svg viewBox="0 0 30 46" width="30" height="46" style={{ display: 'block', overflow: 'visible' }}>
            <g stroke="rgba(246,249,243,0.85)" strokeWidth={1.4} strokeLinecap="round" fill="none">
                <path d="M15 46 C 15 34, 13 20, 15 4" />
                {FERN.map((n, i) => (
                    <g key={i} strokeWidth={1.1}>
                        <path d={`M15 ${n.y} C ${15 - n.len * 0.5} ${n.y - 1}, ${15 - n.len} ${n.y - n.len * 0.5}, ${15 - n.len} ${n.y - n.len}`} />
                        <path d={`M15 ${n.y} C ${15 + n.len * 0.5} ${n.y - 1}, ${15 + n.len} ${n.y - n.len * 0.5}, ${15 + n.len} ${n.y - n.len}`} />
                    </g>
                ))}
            </g>
        </svg>
    );
}

// Прорастает снизу вверх от точки курсора, держится миг и сжимается-исчезает.
function Fern({ x, y, rot, scale }: { x: number; y: number; rot: number; scale: number }) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.15 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.15, scale, scale, scale * 0.55] }}
            transition={{ duration: 1, ease: 'easeOut', times: [0, 0.32, 0.66, 1] }}
            style={{ position: 'absolute', left: x, top: y, width: 30, height: 46, marginLeft: -15, marginTop: -46, transformOrigin: '50% 100%', rotate: rot, filter: 'drop-shadow(0 0 6px rgba(244,247,242,0.5)) drop-shadow(0 0 2px rgba(122,190,122,0.55))' }}
        >
            <FernGlyph />
        </motion.span>
    );
}

// Атмосферные эффекты — только на десктопе с мышью: споры и папоротник завязаны
// на курсор, а на телефонах их рендер и rAF-физика только жгут CPU и батарею.
function useDesktopFX() {
    const [ok, setOk] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)');
        const upd = () => setOk(mq.matches);
        upd();
        mq.addEventListener('change', upd);
        return () => mq.removeEventListener('change', upd);
    }, []);
    return ok;
}

function AtmosphereFX() {
    const desktop = useDesktopFX();
    return desktop ? <AtmosphereFXDesktop /> : null;
}

// Атмосфера нижнего блока: споры за контентом (только в пустых местах) реагируют
// на ветер курсора и сдуваются при резком рывке; поверх — прорастающий след-папоротник.
function AtmosphereFXDesktop() {
    const reduce = useReducedMotion();
    const rootRef = useRef<HTMLDivElement>(null);
    const [spores, setSpores] = useState<Spore[]>(INITIAL_SPORES);
    const [ferns, setFerns] = useState<{ id: number; x: number; y: number; rot: number; scale: number }[]>([]);
    const [bursts, setBursts] = useState<{ id: number; left: number; top: number; size: number }[]>([]);
    const sporesRef = useRef(spores);
    const spanRefs = useRef(new Map<number, HTMLElement>());
    const runtime = useRef(new Map<number, { x: number; y: number; vx: number; vy: number; ph: number }>());
    const popping = useRef(new Set<number>());
    const mouse = useRef({ x: -9999, y: -9999, in: false, spd: 0 });
    const lastFern = useRef({ x: 0, y: 0, t: 0 });
    const idRef = useRef(10000);

    useEffect(() => { sporesRef.current = spores; }, [spores]);

    const pop = (id: number, px: number, py: number, size: number) => {
        if (popping.current.has(id)) return;
        popping.current.add(id);
        const bid = idRef.current++;
        setBursts((b) => [...b, { id: bid, left: px, top: py, size }]);
        setTimeout(() => { setBursts((b) => b.filter((z) => z.id !== bid)); popping.current.delete(id); }, 700);
        bumpPop();
        runtime.current.delete(id);
        spanRefs.current.delete(id);
        const repl: Spore = {
            id: idRef.current++,
            top: (5 + Math.random() * 86).toFixed(2) + '%',
            left: (3 + Math.random() * 92).toFixed(2) + '%',
            size: Math.round(18 + Math.random() * 14),
            dur: 0, delay: 0,
        };
        setSpores((prev) => prev.filter((z) => z.id !== id).concat(repl));
    };

    const spawnFern = (x: number, y: number) => {
        const id = idRef.current++;
        const rot = Math.random() * 44 - 22;
        const scale = 0.72 + Math.random() * 0.6;
        setFerns((f) => (f.length > 20 ? f.slice(1) : f).concat({ id, x, y, rot, scale }));
        setTimeout(() => setFerns((f) => f.filter((z) => z.id !== id)), 1050);
    };

    // Курсор: координаты внутри слоя, скорость, посев папоротника вдоль пути.
    useEffect(() => {
        if (reduce) return;
        const onMove = (e: PointerEvent) => {
            const el = rootRef.current; if (!el) return;
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;
            const m = mouse.current;
            const inb = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
            m.spd = Math.min(70, Math.hypot(x - m.x, y - m.y));
            m.x = x; m.y = y; m.in = inb;
            if (inb) {
                const lf = lastFern.current;
                const now = performance.now();
                if (Math.hypot(x - lf.x, y - lf.y) > 44 && now - lf.t > 55) {
                    lf.x = x; lf.y = y; lf.t = now;
                    spawnFern(x, y);
                }
            }
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
    }, [reduce]);

    // Физика спор: амбиентный дрейф + ветер от курсора + сдувание при резком рывке.
    useEffect(() => {
        if (reduce) return;
        let raf = 0, t0 = 0;
        const R = 155;
        const loop = (t: number) => {
            if (!t0) t0 = t;
            const time = (t - t0) / 1000;
            const el = rootRef.current;
            const w = el ? el.clientWidth : 1000, h = el ? el.clientHeight : 1000;
            const m = mouse.current;
            for (const s of sporesRef.current) {
                const bx = (parseFloat(s.left) / 100) * w;
                const by = (parseFloat(s.top) / 100) * h;
                let rt = runtime.current.get(s.id);
                if (!rt) { rt = { x: bx, y: by, vx: 0, vy: 0, ph: (s.id % 12) * 0.7 }; runtime.current.set(s.id, rt); }
                const ax = bx + Math.sin(time * 0.5 + rt.ph) * 9;
                const ay = by + Math.cos(time * 0.42 + rt.ph * 1.3) * 11;
                if (m.in) {
                    const dx = rt.x - m.x, dy = rt.y - m.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    if (dist < R) {
                        const f = 1 - dist / R;
                        // Мягче, чем раньше: медленное приближение можно «догнать» и лопнуть,
                        // резкий рывок сдувает спору прочь.
                        const push = f * (0.32 + m.spd * 0.045);
                        rt.vx += (dx / dist) * push;
                        rt.vy += (dy / dist) * push;
                        // Лопается при аккуратном подведении (не на резком махе).
                        if (dist < 26 && m.spd < 30) pop(s.id, rt.x, rt.y, s.size);
                    }
                }
                rt.vx += (ax - rt.x) * 0.02;
                rt.vy += (ay - rt.y) * 0.02;
                rt.vx *= 0.87; rt.vy *= 0.87;
                rt.x += rt.vx; rt.y += rt.vy;
                const node = spanRefs.current.get(s.id);
                if (node) node.style.transform = `translate(${(rt.x - bx).toFixed(2)}px,${(rt.y - by).toFixed(2)}px)`;
            }
            m.spd *= 0.9;
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [reduce]);

    return (
        <>
            {/* Споры — за контентом (zIndex 1): видны только в пустых местах фона */}
            <div ref={rootRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                {spores.map((s) => (
                    <span key={s.id}
                        ref={(n) => { if (n) spanRefs.current.set(s.id, n); else spanRefs.current.delete(s.id); }}
                        style={{ position: 'absolute', top: s.top, left: s.left, width: s.size, height: s.size, willChange: 'transform', opacity: reduce ? 0.68 : 0.92, filter: 'drop-shadow(0 0 8px rgba(244,247,242,0.5)) drop-shadow(0 0 3px rgba(194,148,85,0.55))' }}
                    >
                        <SporeGlyph />
                    </span>
                ))}
            </div>
            {/* Курсорный след-папоротник + разлёт спор — поверх контента (zIndex 3) */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
                {ferns.map((f) => <Fern key={f.id} x={f.x} y={f.y} rot={f.rot} scale={f.scale} />)}
                {bursts.map((b) => <Burst key={b.id} left={b.left} top={b.top} size={b.size} />)}
            </div>
        </>
    );
}

// Счётчик лопнутых спор (ПК). На телефонах не монтируется вовсе — иначе его
// scroll-обработчик крутился бы вхолостую под скрывающим CSS-классом.
function PopCounter() {
    const desktop = useDesktopFX();
    return desktop ? <PopCounterDesktop /> : null;
}

// Появляется на бенто справа сверху и съезжает вниз
// по мере скролла, паркуясь на уровне заголовка «Атмосфера»; дальше исчезает.
function PopCounterDesktop() {
    const count = usePopCount();
    const [pos, setPos] = useState({ top: 96, visible: false });
    useEffect(() => {
        const update = () => {
            const bento = document.getElementById('bento');
            const atm = document.getElementById('atmosphere');
            if (!bento || !atm) { setPos((p) => (p.visible ? { ...p, visible: false } : p)); return; }
            const vh = window.innerHeight;
            const bRect = bento.getBoundingClientRect();
            const aRect = atm.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, -bRect.top / Math.max(1, bRect.height)));
            const top = 96 + p * 204;                       // плавно съезжает 96 → 300
            const visible = bRect.top < vh * 0.5 && aRect.bottom > 120;
            setPos({ top, visible });
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
    }, []);
    return (
        <div className="rf-only-desk" aria-hidden style={{ position: 'fixed', right: 24, top: pos.top, zIndex: 45, pointerEvents: 'none', opacity: pos.visible ? 1 : 0, transform: pos.visible ? 'translateX(0)' : 'translateX(16px)', transition: 'opacity .45s ease, transform .45s ease, top .12s linear' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '13px 18px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', ...glass }}>
                <span style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.brass, whiteSpace: 'nowrap' }}>Спор лопнуто</span>
                <motion.span key={count} className="rf-serif" initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 15 }} style={{ fontSize: 30, fontWeight: 900, color: '#F6F9F3', lineHeight: 1 }}>{count}</motion.span>
            </div>
        </div>
    );
}

// Ленивый iframe: монтируется, только когда секция подъезжает к вьюпорту, — виджеты
// Яндекса (12+ секунд загрузки) больше не тормозят первый экран. До готовности —
// тёмная заглушка. dark — инверсия цветов для виджетов без нативной тёмной темы:
// invert+hue-rotate возвращает оттенки на место, светлый фон становится тёмным
// (побочный эффект — фото/аватары в отзывах тоже инвертируются).
function LazyFrame({ src, title, height, dark = false, note }: { src: string; title: string; height: number; dark?: boolean; note: string }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        if (!('IntersectionObserver' in window)) { setShow(true); return; }
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); }
        }, { rootMargin: '360px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return (
        <div ref={hostRef} style={{ position: 'relative', height, background: '#121A15' }}>
            {!ready && (
                <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(244,247,242,0.55)' }}>{note}</div>
            )}
            {show && (
                <iframe
                    src={src}
                    title={title}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    onLoad={() => setReady(true)}
                    style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff', opacity: ready ? 1 : 0, transition: 'opacity .35s ease', filter: dark ? 'invert(0.92) hue-rotate(180deg)' : undefined }}
                />
            )}
        </div>
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
