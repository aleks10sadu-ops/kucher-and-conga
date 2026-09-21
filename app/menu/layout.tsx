import type { Metadata } from 'next';
import React from 'react';
import { SITE, SITE_URL } from '../components/forest/site';

export const metadata: Metadata = {
    title: 'Основное меню, доставка и самовывоз — Кучер & Conga, Дмитров',
    description:
        'Основное бумажное меню ресторана «Кучер & Conga», доставка и самовывоз в Дмитрове: актуальные блюда, цены, бар и винная карта.',
    alternates: { canonical: '/menu' },
    openGraph: {
        title: 'Основное меню, доставка и самовывоз — Кучер & Conga',
        description: 'Бумажное меню ресторана и отдельный раздел заказа доставки или самовывоза в Дмитрове.',
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
