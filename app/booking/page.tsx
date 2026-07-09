import type { Metadata } from 'next';
import ForestHeader from '../components/forest/ForestHeader';
import ForestFooter from '../components/forest/ForestFooter';
import { SITE } from '../components/forest/site';
import BookingForm from './BookingForm';

export const metadata: Metadata = {
    title: 'Забронировать стол — Кучер & Conga, Дмитров',
    description:
        'Бронь стола в ресторане «Кучер & Conga» в Дмитрове: зал Conga под подвешенным лесом, веранда у деревьев, банкеты. Оставьте заявку — администратор подтвердит. Брони с 12:00 до 22:00.',
    alternates: { canonical: '/booking' },
    openGraph: {
        title: 'Забронировать стол — Кучер & Conga',
        description: 'Зал Conga под подвешенным лесом, веранда и банкеты. Оставьте заявку — подтвердим.',
        url: '/booking',
        type: 'website',
        images: ['/redesign/bron-real.webp'],
    },
};

export default function BookingPage() {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                {/* Герой */}
                <section className="relative overflow-hidden">
                    <img src="/redesign/bron-real.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/82 via-forest-ink/85 to-forest-ink" />
                    <div className="relative mx-auto max-w-[1080px] px-5 pb-12 pt-20 md:px-8 md:pb-16 md:pt-28">
                        <span className="text-[13px] uppercase tracking-[0.18em] text-brass">Бронь · {SITE.city}</span>
                        <h1 className="mt-2 max-w-[16ch] font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04] text-cream">
                            Забронировать стол
                        </h1>
                        <p className="mt-4 max-w-[54ch] text-[clamp(15px,2vw,19px)] leading-relaxed text-cream/85">
                            Зал Conga под подвешенным лесом, веранда у деревьев или банкетное пространство. Оставьте заявку —
                            подберём стол и подтвердим.
                        </p>
                    </div>
                </section>

                {/* Форма + инфо */}
                <section className="relative border-t border-white/5 bg-forest-deep py-14 md:py-20">
                    <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-8 px-5 md:px-8 lg:grid-cols-[1.6fr_1fr]">
                        <BookingForm />

                        <aside className="flex flex-col gap-6">
                            <InfoCard title="Часы для броней">
                                <p className="text-[15px] text-cream/80">Каждый день с 12:00 до 22:00</p>
                                <div className="mt-3 space-y-1 text-[14px] text-cream/60">
                                    {SITE.hours.map((h) => (
                                        <div key={h.d}>{h.d} — {h.t} <span className="text-cream/40">({h.note})</span></div>
                                    ))}
                                </div>
                            </InfoCard>

                            <InfoCard title="Телефоны">
                                <div className="flex flex-col gap-1.5">
                                    {SITE.phones.map((p) => (
                                        <a key={p.tel} href={`tel:${p.tel}`} className="text-[17px] text-cream/90 hover:text-brass">{p.label}</a>
                                    ))}
                                </div>
                                <p className="mt-3 text-[14px] text-cream/60">{SITE.address}</p>
                            </InfoCard>

                            <InfoCard title="Банкеты">
                                <p className="text-[15px] leading-relaxed text-cream/75">
                                    Готовые сеты «Кучер» и «Conga» от 5000 ₽ или меню под ваш повод — выберите режим «Выбрать зал
                                    и меню» и отметьте банкет.
                                </p>
                            </InfoCard>
                        </aside>
                    </div>
                </section>
            </main>
            <ForestFooter />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Restaurant',
                        name: SITE.name,
                        address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressCountry: 'RU' },
                        telephone: SITE.phones[0].label,
                        acceptsReservations: 'True',
                        url: 'https://kucher-conga.ru/booking',
                    }),
                }}
            />
        </>
    );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-3 text-[12px] uppercase tracking-[0.16em] text-brass">{title}</div>
            {children}
        </div>
    );
}
