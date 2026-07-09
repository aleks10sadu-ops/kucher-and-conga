import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'События и вечера — Кучер & Conga, Дмитров',
    description:
        'Афиша ресторана «Кучер & Conga» в Дмитрове: концерты, тематические ужины и праздники в зале Conga под подвешенным лесом.',
    alternates: { canonical: '/events' },
    openGraph: {
        title: 'События и вечера — Кучер & Conga',
        description: 'Концерты и тематические вечера в зале Conga.',
        url: '/events',
        type: 'website',
        images: ['/atmosphere_3.webp'],
    },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
