'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import useAdminCheck from '@/lib/hooks/useAdminCheck';
import HallEditor from './HallEditor';
import HallViewer from './HallViewer';
import { createCrmBrowserClient } from '@/lib/supabase/crm-client';

import { type Hall, FALLBACK_HALLS, mergeHalls } from '@/lib/halls/halls-data';

type HallSelectorProps = {
    selectedHallId: string | null;
    onSelect: (id: string | null, name?: string | null) => void;
    /** Залы, загруженные на сервере (ISR): браузер не ходит в Supabase/CRM (замедлены в РФ). */
    initialHallsData?: Hall[];
};

export default function HallSelector({ selectedHallId, onSelect, initialHallsData }: HallSelectorProps) {
    const [halls, setHalls] = useState<Hall[]>(initialHallsData?.length ? initialHallsData : FALLBACK_HALLS);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const { isAdmin } = useAdminCheck();
    const [editingHall, setEditingHall] = useState<Hall | null>(null);
    const [viewingHall, setViewingHall] = useState<Hall | null>(null);

    // Fetch halls from CRM (real IDs) + local Supabase (rich content like images).
    const loadHallsFromDB = async () => {
        try {
            const crmUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
            const crmKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;
            let crmHalls: any[] = [];

            if (crmUrl && crmKey) {
                const crmSupabase = createCrmBrowserClient();
                if (crmSupabase) {
                    const { data: remoteHalls, error: remoteError } = await crmSupabase
                        .from('halls')
                        .select('id, name, capacity');
                    if (remoteError) console.error('Error fetching halls from CRM:', remoteError);
                    else crmHalls = remoteHalls || [];
                }
            }

            const supabase = createSupabaseBrowserClient() as any;
            let localContent: any[] = [];
            if (supabase) {
                const { data, error } = await supabase
                    .from('content_posts')
                    .select('*')
                    .eq('category', 'halls');
                if (error) console.error('Error fetching local hall content:', error);
                else localContent = data || [];
            }

            if (crmHalls.length > 0 || localContent.length > 0) {
                setHalls(mergeHalls(crmHalls, localContent));
            }
        } catch (err) {
            console.error('Error loading halls:', err);
        }
    };

    useEffect(() => {
        // Данные уже пришли с сервера — клиентский поход в Supabase/CRM не нужен
        // (и не сработал бы у посетителей без VPN). Редактор админа по-прежнему
        // вызывает loadHallsFromDB после сохранения.
        if (!initialHallsData?.length) loadHallsFromDB();
    }, []);

    useEffect(() => {
        if (selectedHallId) {
            const index = halls.findIndex((h) => h.id === selectedHallId);
            if (index !== -1) setCurrentIndex(index);
        }
    }, [selectedHallId, halls]);

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % halls.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + halls.length) % halls.length);

    const currentHall = halls[currentIndex];
    const isSelected = selectedHallId === currentHall?.id;
    const capacityText = typeof currentHall?.capacity === 'number' ? `до ${currentHall.capacity}` : currentHall?.capacity;

    const handleCardClick = () => {
        if (isAdmin) setEditingHall(currentHall);
        else setViewingHall(currentHall);
    };

    return (
        <>
            <div className="w-full space-y-4">
                <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium uppercase tracking-wider text-cream/60">Выберите зал</label>
                    <span className="text-xs text-cream/45">
                        {currentIndex + 1} / {halls.length}
                    </span>
                </div>

                <div
                    className="group relative aspect-[16/9] cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:aspect-[2/1]"
                    onClick={handleCardClick}
                    title={isAdmin ? 'Редактировать зал' : 'Посмотреть фото'}
                >
                    {!currentHall.image || currentHall.image.endsWith('placeholder.jpg') ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-forest-mid text-cream/30">
                            <span className="text-4xl font-bold opacity-20">{currentHall.name}</span>
                        </div>
                    ) : (
                        <Image
                            src={currentHall.image}
                            alt={currentHall.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    )}

                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrev(); }}
                        aria-label="Предыдущий зал"
                        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-cream transition-all hover:bg-brass hover:text-forest-ink"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNext(); }}
                        aria-label="Следующий зал"
                        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-cream transition-all hover:bg-brass hover:text-forest-ink"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>

                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-forest-ink/95 via-forest-ink/20 to-transparent p-4 sm:p-6">
                        <motion.div
                            key={currentHall.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-1"
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="font-display text-xl font-bold text-cream transition-colors group-hover:text-brass sm:text-2xl">
                                    {currentHall.name}
                                </h3>
                                {isAdmin && (
                                    <div className="rounded-full border border-brass/50 bg-brass/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brass">
                                        Редактировать
                                    </div>
                                )}
                            </div>
                            {currentHall.description && (
                                <p className="line-clamp-2 text-sm text-cream/75">{currentHall.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-cream/60">
                                <span className="rounded bg-white/10 px-2 py-1" suppressHydrationWarning>
                                    Вместимость: {capacityText} чел.
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {isSelected && (
                        <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full bg-terracotta px-3 py-1 text-sm font-bold text-[#FBF3EA] shadow-lg">
                            <Check className="h-4 w-4" />
                            Выбран
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => (isSelected ? onSelect(null, null) : onSelect(currentHall.id, currentHall.name))}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all duration-200 ${
                        isSelected
                            ? 'bg-terracotta text-[#FBF3EA] ring-2 ring-brass ring-offset-2 ring-offset-forest-ink'
                            : 'bg-white/10 text-cream hover:bg-white/20'
                    }`}
                >
                    {isSelected ? (
                        <>
                            <Check className="h-5 w-5" />
                            Зал выбран
                        </>
                    ) : (
                        'Выбрать этот зал'
                    )}
                </button>
            </div>

            {editingHall && (
                <HallEditor hall={editingHall} isOpen={!!editingHall} onClose={() => setEditingHall(null)} onSave={loadHallsFromDB} />
            )}
            {viewingHall && <HallViewer hall={viewingHall} isOpen={!!viewingHall} onClose={() => setViewingHall(null)} />}
        </>
    );
}
