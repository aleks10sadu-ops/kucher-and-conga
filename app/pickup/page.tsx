import type { Metadata } from 'next';
import Link from 'next/link';
import ForestFooter from '../components/forest/ForestFooter';
import ForestHeader from '../components/forest/ForestHeader';
import { SITE, SITE_URL } from '../components/forest/site';

const PICKUP_HREF = '/menu?fulfillment=pickup#delivery';

export const metadata: Metadata = {
    title: 'Самовывоз еды в Дмитрове — Кучер & Conga',
    description:
        'Самовывоз блюд из ресторана «Кучер & Conga» в Дмитрове. Соберите заказ на сайте и заберите его по адресу: Промышленная улица, 20Б.',
    alternates: { canonical: '/pickup' },
    openGraph: {
        title: 'Самовывоз еды в Дмитрове — Кучер & Conga',
        description: 'Закажите блюда заранее и заберите их в ресторане на Промышленной улице, 20Б.',
        url: '/pickup',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

const pickupJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Самовывоз еды в Дмитрове',
    serviceType: 'Самовывоз еды из ресторана',
    url: `${SITE_URL}/pickup`,
    areaServed: { '@type': 'City', name: SITE.city },
    provider: {
        '@type': 'Restaurant',
        '@id': `${SITE_URL}/#restaurant`,
        name: SITE.name,
        address: SITE.address,
    },
};

export default function PickupPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                <section className="relative overflow-hidden">
                    <img src="/hero-image.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-forest-ink via-forest-ink/95 to-forest-ink/75" />
                    <div className="relative mx-auto max-w-[1120px] px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
                        <p className="text-[13px] uppercase tracking-[0.18em] text-brass">Заберите заказ в ресторане</p>
                        <h1 className="mt-2 max-w-[13ch] text-balance font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04]">
                            Самовывоз еды в Дмитрове
                        </h1>
                        <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-cream/85 md:text-lg">
                            Выберите блюда, соберите корзину и оформите самовывоз. Форма заказа сразу откроется в нужном режиме — без адреса доставки.
                        </p>
                        <Link href={PICKUP_HREF} className="mt-7 inline-flex rounded-lg bg-terracotta px-7 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">
                            Заказать на самовывоз
                        </Link>
                    </div>
                </section>

                <section className="mx-auto grid max-w-[1120px] gap-5 px-5 py-14 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-20">
                    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 md:p-9">
                        <p className="text-[12px] uppercase tracking-[0.16em] text-brass">Как оформить</p>
                        <h2 className="mt-2 font-display text-3xl font-bold">Три коротких шага</h2>
                        <ol className="mt-6 space-y-5 text-cream/80">
                            <li><span className="mr-3 font-display text-xl font-bold text-brass">01</span>Добавьте блюда из раздела «Доставка и самовывоз».</li>
                            <li><span className="mr-3 font-display text-xl font-bold text-brass">02</span>Откройте корзину и перейдите к оформлению.</li>
                            <li><span className="mr-3 font-display text-xl font-bold text-brass">03</span>Выберите время и дождитесь подтверждения администратора.</li>
                        </ol>
                    </article>
                    <aside className="rounded-2xl border border-brass/25 bg-brass/10 p-7 md:p-9">
                        <p className="text-[12px] uppercase tracking-[0.16em] text-brass">Адрес получения</p>
                        <h2 className="mt-2 font-display text-2xl font-bold">{SITE.address}</h2>
                        <p className="mt-4 leading-relaxed text-cream/75">Заказы принимаем в часы работы кухни. Администратор позвонит и подтвердит готовность заказа.</p>
                        <a href={SITE.yandexOrg} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-semibold text-terracotta hover:underline">
                            Открыть в Яндекс Картах →
                        </a>
                    </aside>
                </section>

                <section className="mx-auto max-w-[1120px] px-5 pb-16 md:px-8 md:pb-24">
                    <div className="flex flex-col items-start gap-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-7 md:flex-row md:items-center md:justify-between md:p-10">
                        <div>
                            <p className="text-[12px] uppercase tracking-[0.16em] text-brass">По будням, 12:00–16:00</p>
                            <h2 className="mt-2 font-display text-3xl font-bold">Счастливые часы: скидка 20%</h2>
                            <p className="mt-3 max-w-[62ch] leading-relaxed text-cream/75">Предложение действует на самовывоз с 12:00 до 16:00 включительно и на заказы в ресторане. Для заказа в ресторане — только для столиков до 8 взрослых включительно. На доставку, банкетные меню и праздничные дни скидка не распространяется. Скидки не суммируются — применяется наибольшая.</p>
                        </div>
                        <Link href="/promotions#happy-hours" className="inline-flex shrink-0 rounded-lg border border-white/15 px-6 py-3 font-semibold text-cream transition-colors hover:border-brass/60 hover:bg-white/[0.06]">
                            Все условия
                        </Link>
                    </div>
                </section>
            </main>
            <ForestFooter />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pickupJsonLd) }} />
        </>
    );
}
