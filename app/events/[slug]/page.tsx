'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import ForestPostView, { ForestPostLoading, ForestPostNotFound, ForestPost } from '../../components/forest/ForestPostView';

export default function EventPostPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [post, setPost] = useState<(ForestPost & { title: string }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const supabase = createSupabaseBrowserClient() as any;
                if (!supabase) {
                    setError('Supabase не настроен');
                    return;
                }
                const { data, error: fetchError } = await supabase
                    .from('content_posts')
                    .select('*')
                    .eq('category', 'events')
                    .eq('slug', slug)
                    .eq('is_published', true)
                    .maybeSingle();
                if (fetchError) setError('Ошибка загрузки');
                else if (!data) setError('Запись не найдена');
                else setPost(data);
            } catch (err) {
                console.error('Error:', err);
                setError('Ошибка загрузки');
            } finally {
                setLoading(false);
            }
        })();
    }, [slug]);

    if (loading) return <ForestPostLoading />;
    if (error || !post) return <ForestPostNotFound backHref="/events" backLabel="Ко всем событиям" title="Событие не найдено" message={error || undefined} />;

    return (
        <ForestPostView
            post={post}
            backHref="/events"
            backLabel="Ко всем событиям"
            kicker={{ label: 'Событие', icon: <CalendarDays className="h-4 w-4" /> }}
        />
    );
}
