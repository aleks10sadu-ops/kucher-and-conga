import type { Metadata } from 'next';
import Link from 'next/link';
import ForestFooter from '../components/forest/ForestFooter';
import ForestHeader from '../components/forest/ForestHeader';
import { SITE_URL } from '../components/forest/site';
import { BUSINESS_LUNCH_WINDOW_TEXT } from '@/lib/menu/businessLunchWindow';
import { CURRENT_BUSINESS_LUNCH_POSTER } from '@/lib/menu/businessLunchPoster';

export const metadata: Metadata = {
    title: 'Бизнес-ланч в Дмитрове — Кучер и Конга',
    description: 'Бизнес-ланч в ресторане «Кучер и Конга» в Дмитрове по будням с 12:00 до 16:00. Выберите блюда в конструкторе и оформите заказ.',
    alternates: { canonical: '/business-lunch' },
    openGraph: { title: 'Бизнес-ланч в Дмитрове — Кучер и Конга', description: 'Обед по будням с 12:00 до 16:00.', url: '/business-lunch', type: 'website', images: [CURRENT_BUSINESS_LUNCH_POSTER.image] },
};

export default function BusinessLunchPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                <section className="mx-auto max-w-[1000px] px-5 py-16 md:px-8 md:py-24">
                    <p className="text-[13px] uppercase tracking-[0.18em] text-brass">Обед в Дмитрове</p>
                    <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04]">Бизнес-ланч в Дмитрове</h1>
                    <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-cream/80">Готовим бизнес-ланчи {BUSINESS_LUNCH_WINDOW_TEXT}. Актуальный состав недели и конструктор заказа находятся в меню.</p>
                    <Link href="/menu#business" className="mt-7 inline-flex rounded-lg bg-terracotta px-7 py-3.5 font-semibold text-[#FBF3EA] hover:bg-terracotta-dark">Открыть бизнес-ланч</Link>
                </section>
            </main>
            <ForestFooter />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Бизнес-ланч в Дмитрове', url: `${SITE_URL}/business-lunch`, about: { '@id': `${SITE_URL}/#restaurant` } }) }} />
        </>
    );
}
