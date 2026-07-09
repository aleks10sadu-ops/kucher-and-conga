import React from 'react';
import ForestHeader from './ForestHeader';
import ForestFooter from './ForestFooter';
import SporeField from './SporeField';

// Единый каркас для юридических страниц (политика/правила/соглашение).
export default function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                <section className="relative overflow-hidden border-b border-white/5 px-5 pb-8 pt-20 md:px-8 md:pt-28">
                    <img src="/hero-image.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/88 via-forest-ink/88 to-forest-ink" />
                    <SporeField count={9} />
                    <div className="relative z-10 mx-auto max-w-[820px]">
                        <h1 className="font-display text-[clamp(1.9rem,4.5vw,3.2rem)] font-black leading-[1.08] text-cream">{title}</h1>
                        {updated && <p className="mt-3 text-sm text-cream/50">Редакция от {updated}</p>}
                    </div>
                </section>
                <section className="px-5 py-12 md:px-8 md:py-16">
                    <div className="forest-prose mx-auto max-w-[820px]">{children}</div>
                </section>
            </main>
            <ForestFooter />
        </>
    );
}
