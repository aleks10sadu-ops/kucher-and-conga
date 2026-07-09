import type { Metadata } from 'next';
import Link from 'next/link';
import ForestHeader from '../components/forest/ForestHeader';
import SporeField from '../components/forest/SporeField';
import ForestFooter from '../components/forest/ForestFooter';
import { SITE } from '../components/forest/site';

export const metadata: Metadata = {
    title: 'Акции и особые вечера — Кучер & Conga, Дмитров',
    description:
        'Постоянные предложения ресторана «Кучер & Conga» в Дмитрове: бизнес-ланч по будням, банкетные сеты в зале Conga, бесплатная доставка по городу. Сезонные акции появляются здесь.',
    alternates: { canonical: '/promotions' },
    openGraph: {
        title: 'Акции и особые вечера — Кучер & Conga',
        description: 'Бизнес-ланч, банкетные сеты и бесплатная доставка по Дмитрову.',
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
        href: '/menu',
        cta: 'Смотреть меню',
    },
    {
        tag: 'Для компаний',
        title: 'Банкетные сеты',
        text: 'Готовые сеты «Кучер» и «Conga» на большой стол — от 5000 ₽. Проведём свадьбу, юбилей или корпоратив под подвешенным лесом.',
        href: '/halls',
        cta: 'Залы и сеты',
    },
    {
        tag: 'По Дмитрову',
        title: 'Бесплатная доставка',
        text: 'Привезём горячим по городу — без платы за доставку. Та же авторская кухня, что и в зале.',
        href: '/menu',
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
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/85 via-forest-ink/80 to-forest-ink" />
                    <SporeField count={12} />
                    <div className="relative mx-auto max-w-[1280px] px-5 pb-14 pt-20 md:px-8 md:pb-20 md:pt-28">
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
                <section className="relative border-t border-white/5 bg-forest-deep py-16 md:py-20">
                    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            {OFFERS.map((o) => (
                                <Link
                                    key={o.title}
                                    href={o.href}
                                    className="group flex flex-col rounded-2xl border border-white/12 bg-white/[0.04] p-7 transition-colors hover:border-brass/50 hover:bg-white/[0.07]"
                                >
                                    <span className="text-[12px] uppercase tracking-[0.16em] text-brass">{o.tag}</span>
                                    <h2 className="mt-2 font-display text-[26px] font-bold text-cream">{o.title}</h2>
                                    <p className="mt-3 flex-1 text-[15px] leading-relaxed text-cream/78">{o.text}</p>
                                    <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-terracotta transition-transform group-hover:translate-x-1">
                                        {o.cta} <span aria-hidden>→</span>
                                    </span>
                                </Link>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-white/12 bg-white/[0.04] p-8 md:flex-row md:items-center md:justify-between md:p-10">
                            <div>
                                <h2 className="font-display text-[24px] font-bold text-cream">Планируете вечер или праздник?</h2>
                                <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-cream/78">
                                    Забронируйте стол в зале Conga или на веранде — под лампами-грибами и подвешенным лесом.
                                </p>
                            </div>
                            <Link
                                href="/booking"
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
                            'Постоянные предложения ресторана «Кучер & Conga» в Дмитрове: бизнес-ланч, банкетные сеты, бесплатная доставка.',
                        url: 'https://kucherandconga.ru/promotions',
                        isPartOf: { '@type': 'Restaurant', name: SITE.name, address: SITE.address },
                    }),
                }}
            />
        </>
    );
}
