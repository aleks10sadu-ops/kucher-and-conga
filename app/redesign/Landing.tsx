'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

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
                .rf-btn { transition: transform .15s cubic-bezier(.22,1,.36,1), background .2s ease, border-color .2s ease; }
                .rf-btn:active { transform: scale(.97); }
                .rf-btn-primary:hover { background: #8F3A1B; }
                .rf-btn-ghost:hover { background: rgba(244,247,242,0.1); border-color: rgba(244,247,242,0.55); }
                .rf-nav a { position: relative; transition: color .2s ease; }
                .rf-nav a:hover { color: #F8FAF6; }
                .rf-nav { display: none; }
                .rf-wrap { padding-left: 20px; padding-right: 20px; }
                .rf-hero-pad { padding-left: 20px; padding-right: 20px; padding-bottom: 76px; }
                .rf-h1 { font-size: clamp(2.6rem, 8vw, 3rem); }
                .rf-lede { font-size: 15px; }
                .rf-btns { flex-direction: column; width: 100%; }
                .rf-btn { height: 52px; }
                .rf-desk { display: none; }
                .rf-mob { display: grid; }
                .rf-bentopad { padding-top: 28px; padding-bottom: 28px; }
                .rf-foot { grid-template-columns: 1fr; }
                @media (min-width: 768px) {
                    .rf-nav { display: flex; }
                    .rf-wrap { padding-left: 32px; padding-right: 32px; }
                    .rf-hero-pad { padding-left: 100px; padding-right: 100px; padding-bottom: 118px; }
                    .rf-h1 { font-size: clamp(3.4rem, 6vw, 5.1rem); }
                    .rf-lede { font-size: 19px; }
                    .rf-btns { flex-direction: row; width: auto; }
                    .rf-btn { height: auto; padding-top: 17px; padding-bottom: 17px; }
                    .rf-desk { display: grid; }
                    .rf-mob { display: none; }
                    .rf-bentopad { padding-top: 84px; padding-bottom: 84px; }
                    .rf-foot { grid-template-columns: 1.2fr 1fr 1fr; }
                }
            `}</style>

            {/* Фикс-хедер: тёмный скрим сверху для читаемости поверх видео */}
            <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, transition: 'background .3s, backdrop-filter .3s', background: scrolled ? 'rgba(15,20,17,0.86)' : 'linear-gradient(180deg, rgba(11,16,12,0.72) 0%, rgba(11,16,12,0.28) 60%, transparent 100%)', backdropFilter: scrolled ? 'blur(10px)' : 'none' }}>
                <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <Link href={A} className="rf-serif" style={{ fontWeight: 900, fontSize: 20, color: '#F8FAF6', textShadow: '0 1px 12px rgba(0,0,0,0.6)' }}>Кучер <span style={{ color: C.brass }}>&</span> Conga</Link>
                    <nav className="rf-nav" style={{ alignItems: 'center', gap: 28, fontSize: 15, color: 'rgba(244,247,242,0.9)', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
                        <Link href={LINKS.menu}>Меню</Link>
                        <Link href={LINKS.booking}>Бронь</Link>
                        <Link href={LINKS.events}>События</Link>
                        <Link href={LINKS.vacancies}>Команда</Link>
                    </nav>
                    <a href="tel:+79163177887" className="rf-btn rf-btn-ghost" style={{ fontSize: 14, fontWeight: 500, borderRadius: 8, padding: '9px 16px', border: '1px solid rgba(244,247,242,0.4)', color: '#F8FAF6', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>+7 916 317-78-87</a>
                </div>
            </header>

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
                            <Link href={LINKS.booking} className="rf-btn rf-btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 600, fontSize: 15, letterSpacing: '0.01em', padding: '0 30px', background: C.terracotta, color: '#FBF3EA', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 8px 24px rgba(172,72,35,0.32)' }}>Забронировать стол</Link>
                            <Link href={LINKS.menu} className="rf-btn rf-btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontWeight: 500, fontSize: 15, padding: '0 30px', border: '1px solid rgba(244,247,242,0.4)', color: '#F8FAF6', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(6px)' }}>Заказать доставку</Link>
                        </motion.div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <svg viewBox="0 0 20 12" width="20" height="12" style={{ display: 'block', animation: 'rfChev 2s ease-in-out infinite' }}>
                            <path d="M 2 2 L 10 10 L 18 2" fill="none" stroke="#F4F7F2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 11, color: 'rgba(244,247,242,0.62)' }}>листайте</span>
                    </div>
                </section>

                {/* БЕНТО над фото зала */}
                <section style={{ position: 'relative' }}>
                    <img src="/hero-image.webp" alt="Зал с подвешенным лесом" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(12,19,14,0.66) 0%,rgba(12,19,14,0.55) 45%,rgba(12,19,14,0.82) 100%)' }} />

                    <div className="rf-wrap rf-bentopad" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto' }}>
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

                {/* Футер */}
                <footer style={{ background: '#1B140E', borderTop: '3px solid #7A2E26' }}>
                    <div className="rf-wrap rf-foot" style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 40, paddingBottom: 8, display: 'grid', gap: 28 }}>
                        <Col label="Адрес"><span style={{ fontSize: 16, color: '#EFE9E0', lineHeight: 1.5 }}>Дмитров, Промышленная улица, 20Б</span></Col>
                        <Col label="Телефоны">
                            <a href="tel:+79162977887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 297-78-87</a>
                            <a href="tel:+79163177887" style={{ fontSize: 16, color: '#EFE9E0' }}>+7 (916) 317-78-87</a>
                        </Col>
                        <Col label="Часы работы">
                            <span style={{ fontSize: 16, color: '#EFE9E0' }}>пн–вс, 12:00 — 00:00</span>
                            <span style={{ fontSize: 13, color: 'rgba(239,233,224,0.55)' }}>брони до 22:00 · доставка с 14:00 до 22:00</span>
                        </Col>
                    </div>
                    <div className="rf-wrap" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 32, marginTop: 24, paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(239,233,224,0.12)' }}>
                        <span className="rf-serif" style={{ fontWeight: 700, fontSize: 15, color: '#EFE9E0' }}>Кучер &amp; Conga</span>
                        <span style={{ fontSize: 12.5, color: 'rgba(239,233,224,0.45)' }}>© 2026 Ресторан «Кучер и Конга»</span>
                    </div>
                </footer>
            </div>
        </main>
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
