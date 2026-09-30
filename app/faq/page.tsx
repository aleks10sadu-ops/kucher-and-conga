import type { Metadata } from 'next';
import Link from 'next/link';
import ForestFooter from '../components/forest/ForestFooter';
import ForestHeader from '../components/forest/ForestHeader';
import { SITE } from '../components/forest/site';
import { buildBreadcrumbJsonLd, buildFaqJsonLd, serializeJsonLd, type FaqItem } from '@/lib/seo/structuredData';

export const metadata: Metadata = {
    title: 'Вопросы о ресторане, доставке и банкетах — Кучер и Конга',
    description:
        'Ответы о бронировании столов, часах работы, доставке по Дмитрову, банкетах и расположении ресторана «Кучер и Конга».',
    alternates: { canonical: '/faq' },
    openGraph: {
        title: 'Вопросы и ответы — Кучер и Конга',
        description: 'Бронирование, доставка, банкеты, часы работы и адрес ресторана в Дмитрове.',
        url: '/faq',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

const FAQ_ITEMS: readonly FaqItem[] = [
    {
        question: 'Как забронировать стол?',
        answer:
            'Оставьте заявку на странице бронирования или позвоните по телефону. Бронь действует после подтверждения администратором.',
    },
    {
        question: 'В какие часы работает ресторан?',
        answer:
            'С понедельника по четверг ресторан работает с 12:00 до 23:00, в пятницу и субботу — с 12:00 до 01:00, в воскресенье — с 13:00 до 23:00.',
    },
    {
        question: 'Есть ли доставка по Дмитрову?',
        answer:
            'Да. Заказы принимаем: Пн–Чт с 12:00 до 21:45, Пт–Сб с 12:00 до 23:00, Вс с 13:00 до 21:45. Стоимость зависит от адреса и зоны доставки; точный расчёт показывается при оформлении.',
    },
    {
        question: 'Можно ли провести свадьбу, юбилей или корпоратив?',
        answer:
            'Да. Можно выбрать зал Конга, веранду или отдельное банкетное пространство и оставить заявку на подбор зала и меню.',
    },
    {
        question: 'Где находится ресторан?',
        answer: `Ресторан находится по адресу: ${SITE.address}. На сайте есть ссылка на официальную карточку в Яндекс Картах.`,
    },
];

export default function FaqPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                <section className="mx-auto max-w-[900px] px-5 pb-12 pt-24 md:px-8 md:pb-16 md:pt-32">
                    <nav aria-label="Хлебные крошки" className="text-sm text-cream/60">
                        <Link href="/" className="hover:text-brass">Главная</Link>
                        <span aria-hidden className="mx-2">/</span>
                        <span aria-current="page">Вопросы и ответы</span>
                    </nav>
                    <p className="mt-8 text-[13px] uppercase tracking-[0.18em] text-brass">Коротко и по делу</p>
                    <h1 className="mt-2 font-display text-[clamp(2.4rem,6vw,4.2rem)] font-black leading-[1.04]">
                        Вопросы и ответы
                    </h1>
                    <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-cream/80">
                        Подтверждённая информация о бронировании, доставке, банкетах и работе ресторана в Дмитрове.
                    </p>
                </section>

                <section aria-labelledby="faq-list-title" className="border-t border-white/10 py-12 md:py-16">
                    <div className="mx-auto max-w-[900px] px-5 md:px-8">
                        <h2 id="faq-list-title" className="sr-only">Частые вопросы</h2>
                        <div className="space-y-4">
                            {FAQ_ITEMS.map((item) => (
                                <article key={item.question} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
                                    <h3 className="font-display text-[22px] font-bold text-cream">{item.question}</h3>
                                    <p className="mt-3 text-[16px] leading-relaxed text-cream/75">{item.answer}</p>
                                </article>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-wrap gap-3">
                            <Link href="/menu#delivery" className="rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] hover:bg-terracotta-dark">
                                Заказать доставку
                            </Link>
                            <Link href="/booking" className="rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] hover:bg-terracotta-dark">
                                Забронировать стол
                            </Link>
                            <Link href="/halls" className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-cream hover:border-brass">
                                Посмотреть залы
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <ForestFooter />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqJsonLd(FAQ_ITEMS)) }} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: serializeJsonLd(
                        buildBreadcrumbJsonLd([
                            { name: 'Главная', path: '/' },
                            { name: 'Вопросы и ответы', path: '/faq' },
                        ]),
                    ),
                }}
            />
        </>
    );
}
