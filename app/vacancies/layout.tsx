import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Вакансии — работа в ресторане Кучер & Conga, Дмитров',
    description:
        'Работа в ресторане «Кучер & Conga» в Дмитрове: вакансии на кухне, в зале, баре и доставке. Отклик прямо на сайте.',
    alternates: { canonical: '/vacancies' },
    openGraph: {
        title: 'Вакансии — Кучер & Conga',
        description: 'Ищем тех, кто любит гостей. Кухня, зал, бар, доставка.',
        url: '/vacancies',
        type: 'website',
        images: ['/atmosphere_2.webp'],
    },
};

export default function VacanciesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
