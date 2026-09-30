import type { Metadata } from 'next';
import React from 'react';
import { SITE, SITE_URL } from '../components/forest/site';

export const metadata: Metadata = {
    title: 'Залы и банкеты — Кучер и Конга, Дмитров',
    description:
        'Залы ресторана «Кучер и Конга» в Дмитрове для банкетов: зал Конга под подвешенным лесом, веранда у деревьев, банкетное пространство. Банкетное меню «Кучер» и «Конга» от 5000 ₽ — свадьбы, юбилеи, корпоративы.',
    alternates: { canonical: '/halls' },
    openGraph: {
        title: 'Залы и банкеты — Кучер и Конга',
        description: 'Зал Конга, веранда и банкетное пространство. Банкетное меню от 5000 ₽.',
        url: '/halls',
        type: 'website',
        images: ['/konga_bron.webp'],
    },
};

export default function HallsLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Restaurant',
                        name: SITE.name,
                        description: 'Банкетные залы и банкетное меню в Дмитрове: зал Конга, веранда, банкетное пространство.',
                        address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressCountry: 'RU' },
                        telephone: SITE.phones[0].label,
                        acceptsReservations: 'True',
                        url: `${SITE_URL}/halls`,
                    }),
                }}
            />
        </>
    );
}
