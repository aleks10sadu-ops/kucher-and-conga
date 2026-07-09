import React from 'react';
import SporeField from './SporeField';

// Единый герой внутренних страниц: фоновое изображение + тёмный оверлей (как на
// главной) + лёгкие споры в пустых местах. Контент — над эффектами (z-10).
export default function ForestHero({
    image = '/hero-image.webp',
    eyebrow,
    title,
    subtitle,
    children,
    spores = 12,
}: {
    image?: string;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    spores?: number;
}) {
    return (
        <section className="relative overflow-hidden">
            <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/82 via-forest-ink/85 to-forest-ink" />
            <SporeField count={spores} />
            <div className="relative z-10 mx-auto max-w-[1080px] px-5 pb-12 pt-20 md:px-8 md:pb-16 md:pt-28">
                {eyebrow && <span className="text-[13px] uppercase tracking-[0.18em] text-brass">{eyebrow}</span>}
                <h1 className="mt-2 max-w-[16ch] font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04] text-cream">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-4 max-w-[54ch] text-[clamp(15px,2vw,19px)] leading-relaxed text-cream/85">{subtitle}</p>
                )}
                {children}
            </div>
        </section>
    );
}
