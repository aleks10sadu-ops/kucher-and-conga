'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import useAdminCheck from '@/lib/hooks/useAdminCheck';
import HallEditor, { HallData } from './HallEditor';
import HallViewer from './HallViewer';

type Hall = {
    id: string; // The hardcoded ID
    name: string;
    capacity: number | string;
    description: string;
    image: string;
    gallery?: string[];
    dbId?: number | string; // The ID in Supabase if exists
};

// Данные залов из CRM (Hardcoded base data)
const initialHalls: Hall[] = [
    {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'Conga',
        capacity: 140,
        description: 'Главный зал ресторана Conga',
        image: '/halls/conga.jpg' // Placeholder path
    },
    {
        id: 'beb2bc56-1cba-465c-bb9e-f2eba1b4d516',
        name: 'Морской (Кучер)',
        capacity: 52,
        description: 'Морской зал ресторана Кучер',
        image: '/halls/morskoy.jpg' // Placeholder path
    },
    {
        id: 'ab07a708-20c0-4f76-a81b-00dae310e665',
        name: 'Барный (Кучер)',
        capacity: 36,
        description: 'Уютный барный зал',
        image: '/halls/bar.jpg' // Placeholder path
    },
    {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Летняя веранда',
        capacity: 50,
        description: 'Веранда с кальянной зоной',
        image: '/halls/letka.jpg' // Placeholder path
    },
    {
        id: 'baf64959-fecf-4bd6-a9a8-a2889f36d146',
        name: 'Веранда (Кучер)',
        capacity: 20,
        description: 'Веранда ресторана Кучер',
        image: '/halls/veranda.jpg' // Placeholder path
    },
    {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Банкетные залы',
        capacity: 25,
        description: 'Шоколад, Рубин, Изумруд',
        image: '/halls/banquet.jpg' // Placeholder path
    },
    {
        id: 'ce1818f1-3e9f-4e2b-b373-ac273451b8ae',
        name: 'Беседки',
        capacity: '6-8',
        description: 'Беседки с первой по четвертую',
        image: '/halls/gazebo.jpg' // Placeholder path
    }
];

type HallSelectorProps = {
    selectedHallId: string | null;
    onSelect: (id: string | null) => void;
};

export default function HallSelector({ selectedHallId, onSelect }: HallSelectorProps) {
    const [halls, setHalls] = useState<Hall[]>(initialHalls);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const { isAdmin } = useAdminCheck();
    const [editingHall, setEditingHall] = useState<Hall | null>(null);
    const [viewingHall, setViewingHall] = useState<Hall | null>(null);

    // Fetch halls from Supabase content_posts
    const loadHallsFromDB = async () => {
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { data, error } = await supabase
                .from('content_posts')
                .select('*')
                .eq('category', 'halls');

            if (error) {
                console.error('Error fetching halls:', error);
                return;
            }

            if (data && data.length > 0) {
                // Merge DB data with initialHalls based on Name
                setHalls(prevHalls => {
                    return prevHalls.map(hall => {
                        // Find matching DB entry by title (case insensitive)
                        const dbEntry = data.find((p: any) => p.title.toLowerCase() === hall.name.toLowerCase());

                        if (dbEntry) {
                            return {
                                ...hall,
                                description: dbEntry.content || hall.description, // Use content as description
                                image: dbEntry.image_url || hall.image,
                                capacity: dbEntry.metadata?.capacity || hall.capacity,
                                gallery: dbEntry.metadata?.gallery || [],
                                dbId: dbEntry.id
                            };
                        }
                        return hall;
                    });
                });
            }
        } catch (err) {
            console.error('Error loading halls:', err);
        }
    };

    useEffect(() => {
        loadHallsFromDB();
    }, []);

    // Если зал выбран извне, находим его индекс
    useEffect(() => {
        if (selectedHallId) {
            const index = halls.findIndex(h => h.id === selectedHallId);
            if (index !== -1) {
                setCurrentIndex(index);
            }
        }
    }, [selectedHallId, halls]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % halls.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + halls.length) % halls.length);
    };

    const currentHall = halls[currentIndex];
    const isSelected = selectedHallId === currentHall?.id;
    const capacityText = typeof currentHall?.capacity === 'number' ? `до ${currentHall.capacity}` : currentHall?.capacity;

    const handleCardClick = () => {
        if (isAdmin) {
            setEditingHall(currentHall);
        } else {
            setViewingHall(currentHall);
        }
    };

    return (
        <>
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-neutral-400 uppercase tracking-wider">
                        Выберите зал
                    </label>
                    <span className="text-xs text-neutral-500">
                        {currentIndex + 1} / {halls.length}
                    </span>
                </div>

                <div
                    className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/10 aspect-[16/9] sm:aspect-[2/1] cursor-pointer"
                    onClick={handleCardClick}
                    title={isAdmin ? "Редактировать зал" : "Посмотреть фото"}
                >

                    {/* Placeholder Image Generation since real images are missing */}
                    {(!currentHall.image || currentHall.image.endsWith('placeholder.jpg')) ? (
                        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center text-neutral-600">
                            <span className="text-4xl font-bold opacity-20">{currentHall.name}</span>
                        </div>
                    ) : (
                        <Image
                            src={currentHall.image}
                            alt={currentHall.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    )}


                    {/* Navigation Buttons */}
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrev(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-amber-400 hover:text-black transition-all z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNext(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-amber-400 hover:text-black transition-all z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-6 pointer-events-none">
                        <motion.div
                            key={currentHall.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-1"
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                    {currentHall.name}
                                </h3>
                                {isAdmin && (
                                    <div className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-400/50">
                                        Редактировать
                                    </div>
                                )}
                            </div>

                            {currentHall.description && (
                                <p className="text-sm text-neutral-300 line-clamp-2">{currentHall.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-2">
                                <span className="bg-white/10 px-2 py-1 rounded" suppressHydrationWarning>
                                    Вместимость: {capacityText} чел.
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Selection Indicator Overlay */}
                    {isSelected && (
                        <div className="absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg z-20">
                            <Check className="w-4 h-4" />
                            Выбран
                        </div>
                    )}
                </div>

                {/* Select Button */}
                <button
                    type="button"
                    onClick={() => isSelected ? onSelect(null) : onSelect(currentHall.id)}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${isSelected
                        ? 'bg-amber-400 text-black ring-2 ring-amber-400 ring-offset-2 ring-offset-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isSelected ? (
                        <>
                            <Check className="w-5 h-5" />
                            Зал выбран
                        </>
                    ) : (
                        'Выбрать этот зал'
                    )}
                </button>
            </div>

            {/* Editor Modal */}
            {editingHall && (
                <HallEditor
                    hall={editingHall}
                    isOpen={!!editingHall}
                    onClose={() => setEditingHall(null)}
                    onSave={loadHallsFromDB}
                />
            )}

            {/* Viewer Modal */}
            {viewingHall && (
                <HallViewer
                    hall={viewingHall}
                    isOpen={!!viewingHall}
                    onClose={() => setViewingHall(null)}
                />
            )}
        </>
    );
}
