import type { Metadata } from 'next';
import NewYearNight from './NewYearNight';

const description = 'Новогодняя ночь 2027 в Кучер & CONGA: Ираклий, живая музыка, дискотека и праздничный стол. CONGA: 15 000 ₽/чел., программа с 22:30 до 04:00. Банкетные залы без программы: 8 000 ₽/чел.';

export const metadata: Metadata = {
    title: 'Новогодняя ночь 2027: Кучер & CONGA, Дмитров',
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: '/events/novogodnyaya-noch-2027' },
    openGraph: {
        title: 'Новогодняя ночь в CONGA',
        description,
        url: '/events/novogodnyaya-noch-2027',
        images: [{ url: '/new-year-night-2027/irakliy.webp', alt: 'Ираклий: ведущий новогодней ночи в CONGA' }],
    },
};

export default function Page() { return <NewYearNight />; }
