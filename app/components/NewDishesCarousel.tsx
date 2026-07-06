'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [1, 2, 3, 4, 5].map((n) => `/new-dishes/slide-${n}.webp`);
const AUTOPLAY_MS = 5000;

// Карусель анонса новых блюд на hero. Автопрокрутка, свайп, стрелки, точки.
export default function NewDishesCarousel() {
    const [index, setIndex] = useState(0);
    const touchStartX = useRef<number | null>(null);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const go = useCallback((next: number) => {
        setIndex((next + SLIDES.length) % SLIDES.length);
    }, []);

    const resetTimer = useCallback(() => {
        if (timer.current) clearInterval(timer.current);
        timer.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), AUTOPLAY_MS);
    }, []);

    useEffect(() => {
        resetTimer();
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [resetTimer]);

    return (
        <div
            className="relative w-full h-full min-h-[340px] sm:min-h-[420px] overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl group"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
                if (touchStartX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(dx) > 40) { go(dx < 0 ? index + 1 : index - 1); resetTimer(); }
            }}
        >
            {SLIDES.map((src, i) => (
                <Image
                    key={src}
                    src={src}
                    alt={`Новые блюда Kucher&Conga — слайд ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 450px"
                    className={`object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                    priority={i === 0}
                    quality={75}
                />
            ))}

            {/* Стрелки (десктоп) */}
            <button
                type="button"
                aria-label="Предыдущий слайд"
                onClick={() => { go(index - 1); resetTimer(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/60 hidden sm:block"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                type="button"
                aria-label="Следующий слайд"
                onClick={() => { go(index + 1); resetTimer(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/60 hidden sm:block"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Точки */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Слайд ${i + 1}`}
                        onClick={() => { go(i); resetTimer(); }}
                        className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-amber-400' : 'w-2 bg-white/60 hover:bg-white'}`}
                    />
                ))}
            </div>
        </div>
    );
}
