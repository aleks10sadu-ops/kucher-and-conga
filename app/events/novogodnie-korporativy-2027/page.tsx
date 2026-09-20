import type { Metadata } from 'next';
import ChristmasParty from './ChristmasParty';

const description = 'Новогодние корпоративы в декабре 2026 в Кучер & CONGA: Ираклий, Елена «Золотая стрекоза», живая музыка, конкурсы, призы и дискотека. Программа с 19:00 до 00:00.';

export const metadata: Metadata = {
    robots: { index: true, follow: true },
    title: 'Новогодние корпоративы 2027 — Кучер & CONGA, Дмитров',
    description,
    alternates: { canonical: '/events/novogodnie-korporativy-2027' },
    twitter: { card: 'summary_large_image', images: ['/christmas-2027/hosts-cover.webp'] },
    openGraph: {
        title: 'Этот декабрь — ваш праздник · Кучер & CONGA',
        description,
        url: '/events/novogodnie-korporativy-2027',
        type: 'website',
        images: [{ url: '/christmas-2027/hosts-cover.webp', width: 1200, height: 630, alt: 'Ираклий и Елена — новогодние корпоративы в Кучер & CONGA' }],
    },
};

export default function ChristmasPartyPage() {
    return <ChristmasParty />;
}
