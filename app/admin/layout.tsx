import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Админ-панель | Кучер и Конга',
};

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="bg-neutral-950 text-white min-h-screen">
            <header className="border-b border-white/10 bg-neutral-950/95 backdrop-blur">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="font-semibold">Админ-панель</div>
                    <a
                        href="/"
                        className="text-sm text-neutral-300 hover:text-amber-400 transition-colors"
                    >
                        На сайт
                    </a>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">{children}</main>
        </div>
    );
}
