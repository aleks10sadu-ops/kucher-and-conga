import type { Metadata } from 'next';
import ForestScene from './redesign/ForestBloom';
import { SITE } from './components/forest/site';

export const metadata: Metadata = {
    title: 'Кучер & Conga — ресторан в Дмитрове. Здесь лес растёт с потолка',
    description:
        'Авторская кухня, шашлычные сеты и банкеты в Дмитрове. Зал Conga с подвешенным лесом и лампами-грибами, веранда у леса, доставка по городу.',
    alternates: { canonical: '/' },
    openGraph: {
        title: 'Кучер & Conga — ресторан в Дмитрове',
        description: 'Авторская кухня, зал Conga с подвешенным лесом, веранда, банкеты и доставка по Дмитрову.',
        url: '/',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

export default function Page() {
    return (
        <>
            <ForestScene />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Restaurant',
                        name: SITE.name,
                        description: 'Авторская кухня, зал Conga с подвешенным лесом, банкеты и доставка в Дмитрове.',
                        servesCuisine: ['Авторская', 'Европейская', 'Русская', 'Мангал'],
                        address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressCountry: 'RU' },
                        telephone: SITE.phones[0].label,
                        acceptsReservations: 'True',
                        url: 'https://kucherandconga.ru/',
                        priceRange: '₽₽',
                    }),
                }}
            />
        </>
    );
}
