import type { Metadata } from 'next';
import Link from 'next/link';
import ForestHeader from '../components/forest/ForestHeader';
import SporeField from '../components/forest/SporeField';
import ForestFooter from '../components/forest/ForestFooter';
import { SITE, SITE_URL } from '../components/forest/site';
import { buildBookingHref } from '@/lib/booking/bookingContext';

export const promotionBookingHref = (ref = 'promotions'): string => buildBookingHref({ source: 'promotion', ref });

export const metadata: Metadata = {
    title: 'Акции и особые вечера — Кучер & Conga, Дмитров',
    description:
        'Счастливые часы со скидкой 20% по будням, скидка 10% в день рождения и другие предложения ресторана «Кучер & Conga» в Дмитрове.',
    alternates: { canonical: '/promotions' },
    openGraph: {
        title: 'Акции и особые вечера — Кучер & Conga',
        description: 'Счастливые часы, скидка в день рождения и постоянные предложения ресторана в Дмитрове.',
        url: '/promotions',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

// Постоянные предложения — честно и по делу, без выдуманных «скидок 50%».
const OFFERS = [
    {
        tag: 'По будням',
        title: 'Бизнес-ланч',
        text: 'Пн–Пт с 12:00 до 16:00. Суп, горячее и напиток — быстрый обед в двух шагах от работы.',
        href: '/menu#business',
        cta: 'Смотреть меню',
    },
    {
        tag: 'Для компаний',
        title: 'Банкетное меню',
        text: 'Банкетное меню «Кучер» и «Conga» на большой стол — от 5000 ₽. Проведём свадьбу, юбилей или корпоратив под подвешенным лесом.',
        href: '/halls',
        cta: 'Залы и банкетное меню',
    },
    {
        tag: 'По Дмитрову',
        title: 'Бесплатная доставка',
        text: 'Привезём горячим по центру города — без платы за доставку при заказе от 1000 ₽ или от 2 бизнес-ланчей. Та же авторская кухня, что и в зале.',
        href: '/menu#delivery',
        cta: 'Заказать',
    },
];

export default function PromotionsPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                {/* Герой с фото зала под тёмным слоем */}
                <section className="relative overflow-hidden">
                    <img src="/hero-image.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/90 via-forest-ink/95 to-forest-ink" />
                    <div className="relative z-10 mx-auto max-w-[1280px] px-5 pb-14 pt-20 md:px-8 md:pb-20 md:pt-28">
                        <span className="text-[13px] uppercase tracking-[0.18em] text-brass">{SITE.city}</span>
                        <h1 className="mt-2 max-w-[16ch] font-display text-[clamp(2.4rem,6vw,4.2rem)] font-black leading-[1.04] text-cream">
                            Акции и особые вечера
                        </h1>
                        <p className="mt-4 max-w-[54ch] text-[clamp(15px,2vw,19px)] leading-relaxed text-cream/85">
                            Сезонные предложения и события мы публикуем здесь. А ещё у нас всегда есть то, ради чего стоит зайти
                            без повода.
                        </p>
                    </div>
                </section>

                {/* Постоянные предложения */}
                <section className="relative overflow-hidden border-t border-white/5 py-16 md:py-20">
                    <img src="/atmosphere_7.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-forest-ink/90" />
                    <SporeField count={16} fern={false} />
                    <div className="relative z-10 mx-auto max-w-[1280px] px-5 md:px-8">
                        <div className="mb-10 max-w-[68ch]">
                            <p className="text-[12px] uppercase tracking-[0.16em] text-brass">Поводы прийти чаще</p>
                            <h2 className="mt-2 text-balance font-display text-[clamp(2rem,4vw,3.2rem)] font-black leading-tight text-cream">Скидки в зале и на самовывоз</h2>
                            <p className="mt-3 leading-relaxed text-cream/75">Выберите подходящее предложение и сразу перейдите к бронированию стола или заказу.</p>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-5">
                            <article id="happy-hours" className="relative overflow-hidden rounded-2xl border border-brass/25 bg-brass/10 p-7 scroll-mt-24 lg:col-span-3 md:p-9">
                                <div aria-hidden className="pointer-events-none absolute -right-3 -top-10 font-display text-[9rem] font-black leading-none text-brass/[0.08] md:text-[12rem]">20</div>
                                <div className="relative max-w-[62ch]">
                                    <p className="text-[12px] uppercase tracking-[0.16em] text-brass">По будням · 12:00–16:00</p>
                                    <h3 className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-black leading-tight text-cream">Счастливые часы</h3>
                                    <p className="mt-4 text-lg font-semibold text-cream">Скидка 20% на заказ в ресторане и на самовывоз.</p>
                                    <div className="mt-4 space-y-2 text-sm leading-relaxed text-cream/70">
                                        <p>Для столиков до 8 взрослых включительно.</p>
                                        <p>На доставку скидка не распространяется.</p>
                                        <p>На банкетные меню скидки не распространяются.</p>
                                        <p>В праздничные дни предложение не действует.</p>
                                        <p>Скидки не суммируются — применяется наибольшая из доступных.</p>
                                    </div>
                                    <div className="mt-7 flex flex-wrap gap-3">
                                        <Link href={promotionBookingHref('happy-hours')} className="inline-flex rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">
                                            Забронировать стол
                                        </Link>
                                        <Link href="/menu?fulfillment=pickup#delivery" className="inline-flex rounded-lg border border-white/15 bg-white/[0.04] px-6 py-3 font-semibold text-cream transition-colors hover:border-brass/60 hover:bg-white/[0.08]">
                                            Заказать на самовывоз
                                        </Link>
                                    </div>
                                </div>
                            </article>

                            <article id="birthday" className="flex scroll-mt-24 flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-7 lg:col-span-2 md:p-9">
                                <p className="text-[12px] uppercase tracking-[0.16em] text-brass">День в день</p>
                                <h3 className="mt-2 font-display text-[clamp(1.8rem,3vw,2.5rem)] font-black leading-tight text-cream">Скидка 10% в день рождения</h3>
                                <p className="mt-4 leading-relaxed text-cream/80">При заказе в ресторане вас ждут скидка и поздравление от команды «Кучер &amp; Conga».</p>
                                <p className="mt-4 text-sm leading-relaxed text-cream/60">Предложение действует только в дату рождения для столиков до 8 взрослых включительно. Потребуется подтверждающий документ непосредственно в ресторане. На банкетные меню скидки не распространяются. С другими скидками не суммируется — применяется наибольшая.</p>
                                <Link href={promotionBookingHref('birthday')} className="mt-7 inline-flex w-fit rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark lg:mt-auto">
                                    Забронировать стол
                                </Link>
                            </article>
                        </div>

                        <div className="mb-6 mt-14">
                            <p className="text-[12px] uppercase tracking-[0.16em] text-brass">Ещё предложения</p>
                            <h2 className="mt-2 font-display text-3xl font-bold text-cream">Для обеда, праздника и заказа домой</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            {OFFERS.map((o) => (
                                <Link
                                    key={o.title}
                                    href={o.href}
                                    className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-brass/50 hover:bg-white/[0.07]"
                                >
                                    <span className="text-[12px] uppercase tracking-[0.16em] text-brass">{o.tag}</span>
                                    <h2 className="mt-2 font-display text-[26px] font-bold text-cream">{o.title}</h2>
                                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-cream/80">{o.text}</p>
                                    <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-terracotta transition-transform group-hover:translate-x-1">
                                        {o.cta} <span aria-hidden>→</span>
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 md:flex-row md:items-center md:justify-between md:p-10">
                            <div>
                                <h2 className="font-display text-[24px] font-bold text-cream">Планируете вечер или праздник?</h2>
                                <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-cream/80">
                                    Забронируйте стол в зале Conga или на веранде — под лампами-грибами и подвешенным лесом.
                                </p>
                            </div>
                            <Link
                                href={promotionBookingHref()}
                                className="inline-flex shrink-0 items-center rounded-lg border border-white/15 bg-terracotta px-7 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark"
                            >
                                Забронировать стол
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <ForestFooter />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebPage',
                        name: 'Акции и особые вечера — Кучер & Conga',
                        description:
                            'Счастливые часы со скидкой 20% по будням, скидка 10% в день рождения и постоянные предложения ресторана.',
                        url: `${SITE_URL}/promotions`,
                        isPartOf: { '@type': 'Restaurant', name: SITE.name, address: SITE.address },
                        mainEntity: [
                            {
                                '@type': 'Offer',
                                name: 'Счастливые часы — скидка 20%',
                                description: 'По будням с 12:00 до 16:00 на заказы в ресторане для столиков до 8 взрослых и самовывоз. Не действует на доставку, банкетные меню и в праздничные дни.',
                                url: `${SITE_URL}/promotions#happy-hours`,
                            },
                            {
                                '@type': 'Offer',
                                name: 'Скидка 10% в день рождения',
                                description: 'Действует в день рождения при заказе в ресторане для столиков до 8 взрослых после предъявления подтверждающего документа. Не действует на банкетные меню.',
                                url: `${SITE_URL}/promotions#birthday`,
                            },
                        ],
                    }),
                }}
            />
        </>
    );
}
