import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'Личный кабинет | Кучер и Конга',
    robots: { index: false, follow: false, nocache: true },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
    return children;
}
