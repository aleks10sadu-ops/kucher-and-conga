'use client';

import React from 'react';
import Link from 'next/link';

export default function RulesPage() {
    return (
        <div className="bg-neutral-950 text-white min-h-screen">
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto text-center">
                    <Link href="/" className="inline-block mb-8 text-amber-400 hover:text-amber-300">
                        ← Вернуться на главную
                    </Link>

                    <h1 className="text-4xl font-bold mb-8">Правила нахождения гостей в ресторане</h1>

                    <div className="mt-10 text-neutral-400">
                        <p>Правила будут добавлены позже</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
