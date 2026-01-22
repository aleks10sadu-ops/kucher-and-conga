'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HallData } from './HallEditor';

interface HallViewerProps {
    hall: HallData;
    isOpen: boolean;
    onClose: () => void;
}

export default function HallViewer({ hall, isOpen, onClose }: HallViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const allImages = [hall.image, ...(hall.gallery || [])].filter(Boolean);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = 'unset'; };
        }
    }, [isOpen]);

    // Reset index when hall changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [hall.id]);

    if (!isOpen) return null;

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % allImages.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Image Gallery */}
                <div className="relative aspect-video w-full bg-neutral-800 group">
                    <img
                        src={allImages[currentIndex]}
                        alt={`${hall.name} - Image ${currentIndex + 1}`}
                        className="w-full h-full object-cover transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition backdrop-blur-sm z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Navigation Buttons */}
                    {allImages.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-amber-400 hover:text-black transition z-10 opacity-0 group-hover:opacity-100"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-amber-400 hover:text-black transition z-10 opacity-0 group-hover:opacity-100"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {/* Dots Indicator */}
                            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2 z-10">
                                {allImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-amber-400 w-4' : 'bg-white/50 hover:bg-white'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                        <h2 className="text-3xl font-bold text-white mb-2">{hall.name}</h2>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-400 text-black font-semibold text-sm">
                            Вместимость: {hall.capacity} чел.
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8">
                    <div className="prose prose-invert max-w-none">
                        <p className="text-lg text-neutral-300 leading-relaxed">
                            {hall.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
