import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'События и вечера — Кучер и Конга, Дмитров',
    description:
        'Афиша ресторана «Кучер и Конга» в Дмитрове: концерты, тематические ужины и праздники в зале Конга под подвешенным лесом.',
    alternates: { canonical: '/events' },
    openGraph: {
        title: 'События и вечера — Кучер и Конга',
        description: 'Концерты и тематические вечера в зале Конга.',
        url: '/events',
        type: 'website',
        images: ['/atmosphere_3.webp'],
    },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
