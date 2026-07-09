import type { Metadata } from 'next';
import React from 'react';
import { SITE, SITE_URL } from '../components/forest/site';

export const metadata: Metadata = {
    title: 'Меню и доставка — Кучер & Conga, Дмитров',
    description:
        'Меню ресторана «Кучер & Conga» в Дмитрове: авторская кухня, мангал, шашлычные сеты, бар и винная карта. Доставка по Дмитрову ежедневно с 12:00 до 22:00.',
    alternates: { canonical: '/menu' },
    openGraph: {
        title: 'Меню и доставка — Кучер & Conga',
        description: 'Авторская кухня и мангал. Доставка по Дмитрову.',
        url: '/menu',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Menu',
                        name: 'Меню ресторана Кучер & Conga',
                        url: `${SITE_URL}/menu`,
                        inLanguage: 'ru',
                        provider: {
                            '@type': 'Restaurant',
                            name: SITE.name,
                            address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressCountry: 'RU' },
                            telephone: SITE.phones[0].label,
                            servesCuisine: ['Авторская', 'Европейская', 'Русская', 'Мангал'],
                        },
                    }),
                }}
            />
        </>
    );
}
