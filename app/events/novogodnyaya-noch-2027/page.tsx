import type { Metadata } from 'next';
import { Vollkorn } from 'next/font/google';
import NewYearNight from './NewYearNight';

const nightDisplay = Vollkorn({
  subsets: ['cyrillic', 'latin'], weight: '400', style: 'normal',
  variable: '--font-night-display', display: 'swap',
});

const description = 'Новогодняя ночь 2027 в ресторане Кучер и Конга в Дмитрове. 31 декабря 2026: зал Конга с программой — 15 000 ₽/чел.; отдельные банкетные залы — 8 000 ₽/чел.';

export const metadata: Metadata = {
  title: 'Новогодняя ночь 2027 — Кучер и Конга, Дмитров',
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: '/events/novogodnyaya-noch-2027' },
  openGraph: {
    title: 'Новогодняя ночь 2027 — Кучер и Конга',
    description,
    url: '/events/novogodnyaya-noch-2027',
    type: 'website',
    images: [{ url: '/new-year-night-2027/conga-stage-guests-v5.webp', width: 1672, height: 941, alt: 'Иллюстрация новогодней ночи в зале Конга' }],
  },
};

export default function Page() {
  return <div className={nightDisplay.variable}><NewYearNight /></div>;
}
