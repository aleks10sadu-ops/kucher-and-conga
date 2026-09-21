import type { Metadata } from 'next';
import Link from 'next/link';
import ForestFooter from '../components/forest/ForestFooter';
import ForestHeader from '../components/forest/ForestHeader';
import { SITE, SITE_URL } from '../components/forest/site';

export const metadata: Metadata = {
    title: 'Доставка еды в Дмитрове — Кучер & Conga',
    description: 'Доставка еды из ресторана «Кучер & Conga» по Дмитрову: горячие блюда, мангал, шашлык и хинкали. Актуальное меню, цены и оформление заказа на сайте.',
    alternates: { canonical: '/delivery' },
    openGraph: { title: 'Доставка еды в Дмитрове — Кучер & Conga', description: 'Актуальное меню доставки ресторана по Дмитрову.', url: '/delivery', type: 'website', images: ['/hero-image.webp'] },
};

const deliveryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Доставка еды в Дмитрове',
    serviceType: 'Доставка еды из ресторана',
    url: `${SITE_URL}/delivery`,
    areaServed: { '@type': 'City', name: 'Дмитров' },
    provider: { '@type': 'Restaurant', '@id': `${SITE_URL}/#restaurant`, name: SITE.name },
};

export default function DeliveryPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                <section className="relative overflow-hidden">
                    <img src="/hero-image.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-forest-ink/90" />
                    <div className="relative mx-auto max-w-[1120px] px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
                        <p className="text-[13px] uppercase tracking-[0.18em] text-brass">Ресторан Кучер &amp; Conga</p>
                        <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04]">Доставка еды в Дмитрове</h1>
                        <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-cream/85 md:text-lg">Выберите блюда из актуального меню доставки, соберите корзину и оформите заказ прямо на сайте.</p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link href="/menu#delivery" className="inline-flex rounded-lg bg-terracotta px-7 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">Заказать доставку</Link>
                            <Link href="/pickup" className="inline-flex rounded-lg border border-white/15 bg-white/[0.05] px-7 py-3.5 font-semibold text-cream transition-colors hover:border-brass/60 hover:bg-white/[0.09]">Перейти к самовывозу</Link>
                        </div>
                    </div>
                </section>
                <section className="mx-auto grid max-w-[1120px] gap-5 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
                    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                        <h2 className="font-display text-2xl font-bold">Время приёма заказов</h2>
                        <p className="mt-4 text-cream/80">Пн–Чт: 12:00–21:45</p>
                        <p className="mt-2 text-cream/80">Пт–Сб: 12:00–23:00</p>
                        <p className="mt-2 text-cream/80">Вс: 13:00–21:45</p>
                    </article>
                    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                        <h2 className="font-display text-2xl font-bold">Стоимость и зоны</h2>
                        <p className="mt-4 leading-relaxed text-cream/80">В центральной зоне доставка бесплатна при заказе от 1000 ₽ или от двух бизнес-ланчей. Для остальных адресов стоимость и минимальная сумма показываются при оформлении.</p>
                    </article>
                </section>
                <section className="mx-auto max-w-[1120px] px-5 pb-14 md:px-8 md:pb-20">
                    <h2 className="font-display text-3xl font-bold">Популярные блюда с доставкой</h2>
                    <p className="mt-3 max-w-[68ch] leading-relaxed text-cream/75">
                        Посмотрите актуальные позиции и цены, затем откройте нужную категорию в меню доставки.
                    </p>
                    <div className="mt-7 grid gap-5 md:grid-cols-2">
                        <Link href="/menu?category=khinkali#delivery" className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-brass/60 hover:bg-white/[0.07]">
                            <h3 className="font-display text-2xl font-bold">Хинкали в Дмитрове</h3>
                            <p className="mt-3 text-cream/70">Виды хинкали, актуальные цены и быстрый переход к заказу.</p>
                        </Link>
                        <Link href="/menu?category=shashlyk#delivery" className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors hover:border-brass/60 hover:bg-white/[0.07]">
                            <h3 className="font-display text-2xl font-bold">Шашлык в Дмитрове</h3>
                            <p className="mt-3 text-cream/70">Блюда с мангала и сеты из актуального меню доставки.</p>
                        </Link>
                    </div>
                </section>
                <section className="mx-auto max-w-[1120px] px-5 pb-14 md:px-8 md:pb-20">
                    <div className="flex flex-col items-start gap-5 rounded-2xl border border-brass/25 bg-brass/10 p-7 md:flex-row md:items-center md:justify-between md:p-9">
                        <div>
                            <p className="text-[12px] uppercase tracking-[0.16em] text-brass">Без ожидания курьера</p>
                            <h2 className="mt-2 font-display text-2xl font-bold">Заказ можно забрать самостоятельно</h2>
                            <p className="mt-3 max-w-[62ch] leading-relaxed text-cream/75">Соберите корзину заранее, выберите самовывоз при оформлении и заберите заказ в ресторане на Промышленной улице, 20Б.</p>
                        </div>
                        <Link href="/pickup" className="inline-flex shrink-0 rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">Условия самовывоза</Link>
                    </div>
                </section>
            </main>
            <ForestFooter />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(deliveryJsonLd) }} />
        </>
    );
}
