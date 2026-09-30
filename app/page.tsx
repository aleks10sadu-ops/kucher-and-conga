import type { Metadata } from 'next';
import ForestScene from './redesign/ForestBloom';

export const metadata: Metadata = {
    title: 'Кучер и Конга — ресторан в Дмитрове. Здесь лес растёт с потолка',
    description:
        'Авторская кухня, шашлычные сеты и банкеты в Дмитрове. Зал Конга с подвешенным лесом и лампами-грибами, веранда у леса, доставка по городу.',
    alternates: { canonical: '/' },
    openGraph: {
        title: 'Кучер и Конга — ресторан в Дмитрове',
        description: 'Авторская кухня, зал Конга с подвешенным лесом, веранда, банкеты и доставка по Дмитрову.',
        url: '/',
        type: 'website',
        images: ['/hero-image.webp'],
    },
};

export default function Page() {
    return <ForestScene />;
}
