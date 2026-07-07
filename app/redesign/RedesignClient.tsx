'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Phone, ArrowUpRight } from 'lucide-react';

// Демо редизайна «Перевёрнутый лес». Палитра снята с зала Conga:
// лесной зелёный кирпича и полога, терракота кресел, окись красного со штор, латунь ламп.
const C = {
    forest: '#22352A',
    forestDeep: '#182620',
    daylight: '#F4F7F2',
    ink: '#1C2921',
    inkSoft: '#45564B',
    onForest: '#ECF2EA',
    onForestSoft: '#C2D0C4',
    terracotta: '#AC4823',
    terracottaDark: '#8F3A1B',
    oxblood: '#7A2E26',
    brass: '#C29455',
    wood: '#1B140E',
};

const EASE = [0.23, 1, 0.32, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

export default function RedesignClient() {
    const reduce = useReducedMotion();

    return (
        <main
            className="w-full max-w-full overflow-x-hidden"
            style={{ fontFamily: 'var(--font-body), system-ui, sans-serif', background: C.forestDeep, color: C.onForest }}
        >
            <style>{`
                .rd-display { font-family: var(--font-display), Georgia, serif; }
                .rd-kenburns { animation: rd-kenburns 24s ease-out forwards; }
                @keyframes rd-kenburns { from { transform: scale(1.08); } to { transform: scale(1); } }
                .rd-glow { animation: rd-glow 9s ease-in-out infinite alternate; }
                @keyframes rd-glow { from { opacity: .45; } to { opacity: .8; } }
                .rd-press { transition: transform 150ms cubic-bezier(0.23,1,0.32,1); }
                .rd-press:active { transform: scale(0.97); }
                @media (prefers-reduced-motion: reduce) {
                    .rd-kenburns, .rd-glow { animation: none; }
                }
                .rd-scroll { scrollbar-width: none; }
                .rd-scroll::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Шапка */}
            <header className="absolute top-0 left-0 right-0 z-30">
                <div className="mx-auto max-w-7xl px-5 md:px-8 py-5 flex items-center justify-between gap-4">
                    <Link href="/redesign" className="rd-display text-xl md:text-2xl font-semibold tracking-wide" style={{ color: C.onForest }}>
                        Кучер <span style={{ color: C.brass }}>&</span> Conga
                    </Link>
                    <nav className="hidden md:flex items-center gap-7 text-[15px]" style={{ color: C.onForestSoft }}>
                        <Link href="/menu" className="hover:text-white transition-colors">Меню</Link>
                        <Link href="/#booking" className="hover:text-white transition-colors">Залы и банкеты</Link>
                        <Link href="/#menu" className="hover:text-white transition-colors">Доставка</Link>
                        <Link href="/vacancies" className="hover:text-white transition-colors">Команда</Link>
                    </nav>
                    <a
                        href="tel:+79163177887"
                        className="rd-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border"
                        style={{ borderColor: 'rgba(236,242,234,0.35)', color: C.onForest }}
                    >
                        <Phone className="w-4 h-4" aria-hidden />
                        <span className="hidden sm:inline">+7 916 317-78-87</span>
                        <span className="sm:hidden">Позвонить</span>
                    </a>
                </div>
            </header>

            {/* Hero «Полог»: потолок зала нависает над заголовком */}
            <section className="relative">
                <div className="relative h-[58vh] min-h-[380px] md:h-[66vh] overflow-hidden">
                    <Image
                        src="/halls/conga.jpg"
                        alt="Зал Conga: лампы-грибы и подвешенный лес над столами"
                        fill
                        priority
                        sizes="100vw"
                        quality={82}
                        className="rd-kenburns object-cover object-top"
                    />
                    {/* Тёплые пятна света от ламп */}
                    <div
                        aria-hidden
                        className="rd-glow absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(38% 30% at 22% 12%, rgba(255,196,110,0.35), transparent 70%), radial-gradient(30% 26% at 74% 8%, rgba(255,196,110,0.28), transparent 70%)',
                        }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-2/3"
                        style={{ background: `linear-gradient(to bottom, transparent, ${C.forestDeep})` }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 md:px-8 -mt-28 md:-mt-40 pb-16 md:pb-24">
                    <motion.h1
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE }}
                        className="rd-display font-black leading-[1.05] max-w-5xl"
                        style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)', color: C.onForest, textWrap: 'balance' as any }}
                    >
                        Здесь лес растёт{' '}
                        <em className="not-italic" style={{ color: C.brass, fontStyle: 'italic' }}>
                            с потолка
                        </em>
                    </motion.h1>
                    <motion.p
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
                        className="mt-5 max-w-xl text-base md:text-lg leading-relaxed"
                        style={{ color: C.onForestSoft }}
                    >
                        Kucher &amp; Conga — ресторан в Дмитрове. Внизу мангал и авторская кухня,
                        наверху — настоящий подвешенный лес и лампы-грибы размером с зонт.
                    </motion.p>
                    <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.22, ease: EASE }}
                        className="mt-8 flex flex-wrap gap-3"
                    >
                        <Link
                            href="/#booking"
                            className="rd-press inline-flex items-center rounded-full px-7 py-3.5 font-semibold text-white"
                            style={{ background: C.terracotta }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = C.terracottaDark)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = C.terracotta)}
                        >
                            Забронировать стол
                        </Link>
                        <Link
                            href="/#menu"
                            className="rd-press inline-flex items-center rounded-full px-7 py-3.5 font-semibold border"
                            style={{ borderColor: 'rgba(236,242,234,0.4)', color: C.onForest }}
                        >
                            Заказать домой
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Три двери: вечер / праздник / домой */}
            <section className="relative" style={{ background: C.forest }}>
                <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-28">
                    <Reveal>
                        <h2 className="rd-display font-black leading-tight max-w-3xl" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.8rem)' }}>
                            За чем вы к нам?
                        </h2>
                    </Reveal>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
                        {/* Вечер */}
                        <Reveal className="md:col-span-7" delay={0.05}>
                            <Link href="/#booking" className="group block relative overflow-hidden h-[340px] md:h-[440px]" style={{ borderRadius: '180px 180px 20px 20px' }}>
                                <Image
                                    src="/atmosphere_5.webp"
                                    alt="Накрытый стол под грибной лампой, вечерний свет из окна"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 58vw"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                />
                                <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(16,24,19,0.85) 8%, transparent 55%)' }} />
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                    <h3 className="rd-display text-2xl md:text-3xl font-black text-white">Вечер под лампами</h3>
                                    <p className="mt-2 max-w-md text-sm md:text-base leading-relaxed" style={{ color: C.onForestSoft }}>
                                        Столик у панорамного окна, утиное филе со спаржей, вино по бокалам.
                                        Бронь подтверждаем по телефону за пару минут.
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.brass }}>
                                        Выбрать стол <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                                    </span>
                                </div>
                            </Link>
                        </Reveal>

                        {/* Праздник */}
                        <Reveal className="md:col-span-5" delay={0.12}>
                            <Link href="/#booking" className="group block relative overflow-hidden h-[340px] md:h-[440px]" style={{ borderRadius: '180px 180px 20px 20px' }}>
                                <Image
                                    src="/atmosphere_6.webp"
                                    alt="Вечерний зал с гирляндами в зелени и терракотовыми диванами"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 42vw"
                                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                />
                                <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(16,24,19,0.85) 8%, transparent 55%)' }} />
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                                    <h3 className="rd-display text-2xl md:text-3xl font-black text-white">Праздник на сто гостей</h3>
                                    <p className="mt-2 text-sm md:text-base leading-relaxed" style={{ color: C.onForestSoft }}>
                                        Свадьбы, юбилеи, корпоративы. Сеты от 5000 ₽ на гостя,
                                        свой алкоголь принести можно.
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.brass }}>
                                        Посмотреть залы <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                                    </span>
                                </div>
                            </Link>
                        </Reveal>

                        {/* Домой */}
                        <Reveal className="md:col-span-12" delay={0.18}>
                            <Link
                                href="/#menu"
                                className="group flex flex-col md:flex-row items-stretch overflow-hidden rounded-[20px] border"
                                style={{ borderColor: 'rgba(236,242,234,0.14)', background: 'rgba(236,242,234,0.04)' }}
                            >
                                <div className="flex-1 p-6 md:p-10 flex flex-col justify-center">
                                    <h3 className="rd-display text-2xl md:text-3xl font-black text-white">Ужин, который едет к вам</h3>
                                    <p className="mt-2 max-w-lg text-sm md:text-base leading-relaxed" style={{ color: C.onForestSoft }}>
                                        Вся кухня ресторана — с доставкой по Дмитрову. Возим своими курьерами,
                                        заказ с сайта попадает на кухню сразу, без посредников.
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.brass }}>
                                        Открыть меню доставки <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                                    </span>
                                </div>
                                <div className="relative h-52 md:h-auto md:w-[38%] overflow-hidden">
                                    <Image
                                        src="/atmosphere_1.webp"
                                        alt="Утиная грудка с пюре и вино на столе"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 38vw"
                                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                    />
                                </div>
                            </Link>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Новые блюда: светлая «дневная» секция */}
            <section style={{ background: C.daylight, color: C.ink }}>
                <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-28">
                    <Reveal>
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <h2 className="rd-display font-black leading-tight" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.8rem)' }}>
                                Шеф переписал меню в июне
                            </h2>
                            <Link href="/menu" className="inline-flex items-center gap-1.5 font-semibold rd-press" style={{ color: C.terracotta }}>
                                Всё меню <ArrowUpRight className="w-4 h-4" aria-hidden />
                            </Link>
                        </div>
                        <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: C.inkSoft }}>
                            Севиче из гребешка, казаречче с говяжьими щёчками, тирамису на греческом
                            йогурте. Всё уже на кухне — и в зале, и на доставку.
                        </p>
                    </Reveal>

                    <div className="rd-scroll mt-10 flex gap-4 md:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {[2, 3, 4, 5].map((n, i) => (
                            <Reveal key={n} delay={i * 0.06} className="snap-start shrink-0 w-[260px] md:w-[320px]">
                                <div className="overflow-hidden rounded-2xl shadow-lg">
                                    <Image
                                        src={`/new-dishes/slide-${n}.webp`}
                                        alt={['Закуски и стартеры нового меню', 'Основные блюда: рыба и паста', 'Основные блюда: утка и баранина', 'Десерты нового меню'][i]}
                                        width={640}
                                        height={800}
                                        sizes="(max-width: 768px) 260px, 320px"
                                        className="w-full h-auto"
                                    />
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
                {/* Мотив штор: белое полотно заканчивается красной полосой */}
                <div aria-hidden className="h-2.5" style={{ background: C.oxblood }} />
            </section>

            {/* Банкеты */}
            <section style={{ background: C.forest }}>
                <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-28 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
                    <Reveal>
                        <div className="relative overflow-hidden h-[320px] md:h-[520px]" style={{ borderRadius: '180px 180px 20px 20px' }}>
                            <Image
                                src="/atmosphere_4.webp"
                                alt="Зал целиком: бар, латунные лампы и зелень под потолком"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />
                        </div>
                    </Reveal>
                    <div>
                        <Reveal>
                            <h2 className="rd-display font-black leading-tight" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.8rem)' }}>
                                Праздники мы умеем
                            </h2>
                            <p className="mt-4 max-w-lg leading-relaxed" style={{ color: C.onForestSoft }}>
                                Три банкетных сета — от сытного шашлычного до порционной подачи с телячьими
                                щёчками. Составы честные, граммовки прописаны, детское меню посчитаем отдельно.
                            </p>
                        </Reveal>
                        <div className="mt-8 space-y-0 divide-y" style={{ borderColor: 'rgba(236,242,234,0.12)' }}>
                            {[
                                { name: 'Кучер', price: '5000 ₽', desc: '1350 г на гостя: шашлычный сет, осётр на гриле, хачапури' },
                                { name: 'Conga', price: '6000 ₽', desc: '1450 г: плюс креветки панко и жареный сулугуни' },
                                { name: 'Conga', price: '7500 ₽', desc: '1435 г: телячьи щёчки, стейк из вырезки, форель — порционно' },
                            ].map((s, i) => (
                                <Reveal key={i} delay={i * 0.07}>
                                    <div className="py-5 flex items-baseline justify-between gap-6" style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(236,242,234,0.12)' }}>
                                        <div>
                                            <div className="rd-display text-xl md:text-2xl font-semibold text-white">
                                                {s.name} <span style={{ color: C.brass }}>· {s.price}</span>
                                            </div>
                                            <p className="mt-1 text-sm md:text-[15px]" style={{ color: C.onForestSoft }}>{s.desc}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                        <Reveal delay={0.2}>
                            <Link
                                href="/#booking"
                                className="rd-press mt-8 inline-flex items-center rounded-full px-7 py-3.5 font-semibold text-white"
                                style={{ background: C.terracotta }}
                            >
                                Собрать свой банкет
                            </Link>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Футер */}
            <footer style={{ background: C.wood }}>
                <div className="mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-20 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div>
                        <div className="rd-display text-2xl font-semibold" style={{ color: C.onForest }}>
                            Кучер <span style={{ color: C.brass }}>&</span> Conga
                        </div>
                        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(236,242,234,0.6)' }}>
                            Дмитров, Промышленная улица, 20Б
                        </p>
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: 'rgba(236,242,234,0.6)' }}>
                        <div className="font-semibold mb-2" style={{ color: C.onForest }}>Часы</div>
                        <p>Брони столов — с 12:00 до 22:00</p>
                        <p>Доставка — с 14:00 до 22:00</p>
                    </div>
                    <div className="text-sm leading-relaxed">
                        <div className="font-semibold mb-2" style={{ color: C.onForest }}>Администраторы</div>
                        <p><a href="tel:+79163177887" className="hover:underline" style={{ color: 'rgba(236,242,234,0.75)' }}>+7 916 317-78-87</a></p>
                        <p><a href="tel:+79162977887" className="hover:underline" style={{ color: 'rgba(236,242,234,0.75)' }}>+7 916 297-78-87</a></p>
                    </div>
                </div>
                <div className="mx-auto max-w-7xl px-5 md:px-8 pb-8 text-xs" style={{ color: 'rgba(236,242,234,0.4)' }}>
                    © 2026 Kucher &amp; Conga · Это демо редизайна: боевой сайт живёт на главной
                </div>
            </footer>
        </main>
    );
}
