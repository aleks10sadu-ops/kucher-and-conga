'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type GallerySectionProps = {
    gallery: string[];
};

export default function GallerySection({ gallery }: GallerySectionProps) {
    const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

    // Блокируем скролл body при открытом модальном окне
    useEffect(() => {
        if (selectedGalleryImage) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [selectedGalleryImage]);

    // Навигация по галерее клавиатурой
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedGalleryImage(null);
                setCurrentGalleryIndex(0);
            }
            if (selectedGalleryImage) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const newIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : gallery.length - 1;
                    setCurrentGalleryIndex(newIndex);
                    setSelectedGalleryImage(gallery[newIndex]);
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const newIndex = currentGalleryIndex < gallery.length - 1 ? currentGalleryIndex + 1 : 0;
                    setCurrentGalleryIndex(newIndex);
                    setSelectedGalleryImage(gallery[newIndex]);
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedGalleryImage, currentGalleryIndex, gallery]);

    return (
        <section id="gallery" className="py-8 sm:py-12 lg:py-16 border-t border-white/10">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider">Атмосфера</h2>
                <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {gallery.map((src, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                setSelectedGalleryImage(src);
                                setCurrentGalleryIndex(idx);
                            }}
                            className="overflow-hidden rounded-xl border border-white/10 hover:border-amber-400/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Image
                                src={src}
                                alt={`Галерея ${idx + 1}`}
                                width={400}
                                height={300}
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, 33vw"
                                className={`h-56 md:h-64 w-full object-cover transition-transform duration-300 hover:scale-110 ${idx === 0 ? 'object-[center_75%]' : ''
                                    }`}
                                loading={idx < 3 ? "eager" : "lazy"}
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Gallery Image Modal */}
            {selectedGalleryImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => {
                        setSelectedGalleryImage(null);
                        setCurrentGalleryIndex(0);
                    }}
                >
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => {
                                setSelectedGalleryImage(null);
                                setCurrentGalleryIndex(0);
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition z-10"
                            aria-label="Закрыть"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Левая стрелка */}
                        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : gallery.length - 1;
                                    setCurrentGalleryIndex(newIndex);
                                    setSelectedGalleryImage(gallery[newIndex]);
                                }}
                                className="p-2 sm:p-3 rounded-full bg-gray-500/50 hover:bg-gray-500/70 text-white transition-all duration-200 backdrop-blur-sm"
                                aria-label="Предыдущее изображение"
                            >
                                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                            </button>
                        </div>

                        {/* Изображение */}
                        <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
                            <Image
                                src={selectedGalleryImage}
                                alt="Развернутое изображение"
                                width={1920}
                                height={1080}
                                sizes="100vw"
                                className="max-w-full max-h-full object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                                priority
                                style={{ width: 'auto', height: 'auto' }}
                            />
                        </div>

                        {/* Правая стрелка */}
                        <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = currentGalleryIndex < gallery.length - 1 ? currentGalleryIndex + 1 : 0;
                                    setCurrentGalleryIndex(newIndex);
                                    setSelectedGalleryImage(gallery[newIndex]);
                                }}
                                className="p-2 sm:p-3 rounded-full bg-gray-500/50 hover:bg-gray-500/70 text-white transition-all duration-200 backdrop-blur-sm"
                                aria-label="Следующее изображение"
                            >
                                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
