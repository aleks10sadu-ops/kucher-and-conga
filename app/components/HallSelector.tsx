'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import useAdminCheck from '@/lib/hooks/useAdminCheck';
import HallEditor, { HallData } from './HallEditor';
import HallViewer from './HallViewer';

type Hall = {
    id: string; // The ID to use for API (from CRM or fallback)
    name: string;
    capacity: number | string;
    description: string;
    image: string;
    gallery?: string[];
    dbId?: number | string; // The ID in local Supabase for content
};

// Данные залов из CRM (Hardcoded base data)
// Used as fallback if CRM is unreachable or for initial render
const initialHalls: Hall[] = [
    {
        id: 'fallback-1', // These IDs should be replaced by real ones from CRM
        name: 'Conga',
        capacity: 140,
        description: 'Главный зал ресторана Conga',
        image: '/halls/conga.jpg'
    },
    {
        id: 'fallback-2',
        name: 'Морской (Кучер)',
        capacity: 52,
        description: 'Морской зал ресторана Кучер',
        image: '/halls/morskoy.jpg'
    },
    {
        id: 'fallback-3',
        name: 'Барный (Кучер)',
        capacity: 36,
        description: 'Уютный барный зал',
        image: '/halls/bar.jpg'
    },
    {
        id: 'fallback-4',
        name: 'Летняя веранда',
        capacity: 50,
        description: 'Веранда с кальянной зоной',
        image: '/halls/letka.jpg'
    },
    {
        id: 'fallback-5',
        name: 'Веранда (Кучер)',
        capacity: 20,
        description: 'Веранда ресторана Кучер',
        image: '/halls/veranda.jpg'
    },
    {
        id: 'fallback-6',
        name: 'Банкетные залы',
        capacity: 25,
        description: 'Шоколад, Рубин, Изумруд',
        image: '/halls/banquet.jpg'
    },
    {
        id: 'fallback-7',
        name: 'Беседки',
        capacity: '6-8',
        description: 'Беседки с первой по четвертую',
        image: '/halls/gazebo.jpg'
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

    // Fetch halls from:
    // 1. CRM Supabase (for real IDs)
    // 2. Local Supabase (for rich content like images)
    const loadHallsFromDB = async () => {
        try {
            // 1. Fetch real hall IDs from CRM
            const crmUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
            const crmKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;
            let crmHalls: any[] = [];

            if (crmUrl && crmKey) {
                const crmSupabase = createClient(crmUrl, crmKey);
                const { data: remoteHalls, error: remoteError } = await crmSupabase
                    .from('halls')
                    .select('id, name, capacity');

                if (remoteError) {
                    console.error('Error fetching halls from CRM:', remoteError);
                } else {
                    crmHalls = remoteHalls || [];
                }
            }

            // 2. Fetch rich content from local DB
            const supabase = createSupabaseBrowserClient() as any;
            let localContent: any[] = [];

            if (supabase) {
                const { data, error } = await supabase
                    .from('content_posts')
                    .select('*')
                    .eq('category', 'halls');

                if (error) {
                    console.error('Error fetching local hall content:', error);
                } else {
                    localContent = data || [];
                }
            }

            // 3. Merge data
            // If we have CRM data, use it as the source of truth for halls list
            if (crmHalls.length > 0) {
                const mergedHalls = crmHalls.map(crmHall => {
                    // Try to find matching local content by name
                    const localEntry = localContent.find(
                        (p: any) => p.title.toLowerCase() === crmHall.name.toLowerCase()
                    );

                    // Or finding matching initial hall for fallback image
                    const initialEntry = initialHalls.find(
                        h => h.name.toLowerCase() === crmHall.name.toLowerCase()
                    );

                    return {
                        id: crmHall.id, // REAL ID from CRM
                        name: crmHall.name,
                        capacity: crmHall.capacity || localEntry?.metadata?.capacity || initialEntry?.capacity || 0,
                        description: localEntry?.content || initialEntry?.description || '',
                        image: localEntry?.image_url || initialEntry?.image || '/halls/placeholder.jpg',
                        gallery: localEntry?.metadata?.gallery || [],
                        dbId: localEntry?.id
                    };
                });
                setHalls(mergedHalls);
            } else if (localContent.length > 0) {
                // If CRM failed but we have local content, try to use it with initialHalls IDs (fallback)
                // This scenario is less likely to fix the bug but keeps UI working
                setHalls(prevHalls => {
                    return prevHalls.map(hall => {
                        const dbEntry = localContent.find((p: any) => p.title.toLowerCase() === hall.name.toLowerCase());
                        if (dbEntry) {
                            return {
                                ...hall,
                                description: dbEntry.content || hall.description,
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
