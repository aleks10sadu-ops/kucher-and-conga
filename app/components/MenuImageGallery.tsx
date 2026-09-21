'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Props = { images: string[]; alt: string };

// Галерея страниц бумажного меню (бар/вино): листалка + зум по клику.
export default function MenuImageGallery({ images, alt }: Props) {
    const [index, setIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);

    const go = (next: number) => setIndex((next + images.length) % images.length);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="block w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl cursor-zoom-in"
                    aria-label="Увеличить страницу меню"
                >
                    <Image
                        src={images[index]}
                        alt={`${alt} — страница ${index + 1}`}
                        width={1099}
                        height={2070}
                        priority={index === 0}
                        sizes="(max-width: 767px) calc(100vw - 24px), 672px"
                        quality={75}
                        className="block h-auto w-full"
                    />
                </button>

                {images.length > 1 && (
                    <>
                        <button
                            type="button"
                            aria-label="Предыдущая страница"
                            onClick={() => go(index - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            type="button"
                            aria-label="Следующая страница"
                            onClick={() => go(index + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}
            </div>

            <div className="mt-4 text-center text-neutral-400 text-sm">
                Страница {index + 1} из {images.length}
            </div>

            {/* Зум-оверлей */}
            {zoomed && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-2 sm:p-4"
                    onClick={() => setZoomed(false)}
                >
                    <button
                        type="button"
                        aria-label="Закрыть"
                        className="fixed top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                        onClick={() => setZoomed(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <Image
                        src={images[index]}
                        alt={`${alt} — страница ${index + 1} (увеличено)`}
                        width={1099}
                        height={2070}
                        sizes="100vw"
                        quality={80}
                        className="h-auto w-auto max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] object-contain sm:max-h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)]"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
