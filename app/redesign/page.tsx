import type { Metadata } from 'next';
import { Vollkorn, Golos_Text } from 'next/font/google';
import RedesignClient from './Landing';

const vollkorn = Vollkorn({
    subsets: ['cyrillic', 'latin'],
    weight: ['600', '900'],
    style: ['normal', 'italic'],
    variable: '--font-display',
    display: 'swap',
});

const golos = Golos_Text({
    subsets: ['cyrillic', 'latin'],
    weight: ['400', '500', '600'],
    variable: '--font-body',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Кучер & Conga — ресторан в Дмитрове. Здесь лес растёт с потолка',
    description:
        'Авторская кухня, шашлычные сеты и банкеты в Дмитрове. Зал Conga с подвешенным лесом и лампами-грибами, веранда у леса, доставка по городу своими курьерами.',
};

export default function RedesignPage() {
    return (
        <div className={`${vollkorn.variable} ${golos.variable}`}>
            <RedesignClient />
        </div>
    );
}
