'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { loadContentPosts } from '@/lib/content/loadContentPosts';
import ContentManager from '../components/ContentManager';
import ForestHeader from '../components/forest/ForestHeader';
import ForestFooter from '../components/forest/ForestFooter';
import { SITE } from '../components/forest/site';

interface Post {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    image_url: string | null;
    published_at: string | null;
    created_at: string;
    category: string;
    is_published: boolean;
    event_date?: string | null;
}

const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) return false;
    try {
        if (trimmedUrl.startsWith('/')) return true;
        new URL(trimmedUrl);
        return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
    } catch {
        return false;
    }
};

export default function EventsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(true);
    const [showContentManager, setShowContentManager] = useState(false);

    useEffect(() => {
        loadPosts();
        checkAdmin();

        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) return;

        const channel = supabase
            .channel('content-posts-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'content_posts', filter: `category=eq.events` },
                () => loadPosts()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const checkAdmin = async () => {
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setAdminLoading(false);
                return;
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsAdmin(false);
                setAdminLoading(false);
                return;
            }
            const { data: adminRecord } = await supabase.from('admins').select('role').eq('id', user.id).maybeSingle();
            setIsAdmin(!!adminRecord);
        } catch {
            setIsAdmin(false);
        } finally {
            setAdminLoading(false);
        }
    };

    const loadPosts = async () => {
        setLoading(true);
        try {
            const { data, error } = await loadContentPosts('events');
            if (error) console.warn('События: не удалось загрузить (сеть):', error?.message || error?.code || 'unknown');
            setPosts(data as Post[]);
        } catch (err) {
            console.warn('События: ошибка загрузки:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                {/* Герой */}
                <section className="relative overflow-hidden">
                    <img src="/atmosphere_3.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-forest-ink/82 via-forest-ink/85 to-forest-ink" />
                    <div className="relative mx-auto max-w-[1280px] px-5 pb-14 pt-20 md:px-8 md:pb-20 md:pt-28">
                        <span className="text-[13px] uppercase tracking-[0.18em] text-brass">Зал Conga · {SITE.city}</span>
                        <h1 className="mt-2 max-w-[16ch] font-display text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.04] text-cream">
                            События и вечера
                        </h1>
                        <p className="mt-4 max-w-[56ch] text-[clamp(15px,2vw,19px)] leading-relaxed text-cream/85">
                            Концерты, тематические ужины и праздники под подвешенным лесом и лампами-грибами. Загляните, что у
                            нас будет в ближайшее время.
                        </p>
                    </div>
                </section>

                {/* Список */}
                <section className="relative border-t border-white/5 bg-forest-deep py-14 md:py-20">
                    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
                        {!adminLoading && isAdmin && (
                            <div className="mb-8 flex justify-end">
                                <button
                                    onClick={() => setShowContentManager(true)}
                                    className="rounded-lg border border-brass/40 bg-white/[0.04] px-4 py-2 text-sm font-medium text-brass transition-colors hover:bg-white/[0.08]"
                                >
                                    Управление событиями
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="py-16 text-center text-cream/50">Загрузка…</div>
                        ) : posts.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
                                <p className="text-cream/70">Пока ближайших событий нет.</p>
                                <p className="mt-2 text-sm text-cream/50">
                                    Забронируйте стол — и мы расскажем, что готовим.{' '}
                                    <Link href="/booking" className="text-brass hover:underline">Забронировать →</Link>
                                </p>
                            </div>
                        ) : (
                            <div className="grid auto-rows-[1fr] grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                                {posts.map((post, index) => {
                                    const feature = index % 5 === 0;
                                    return (
                                        <Link
                                            key={post.id}
                                            href={`/events/${post.slug}`}
                                            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 hover:border-brass/40 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-black/40 ${
                                                feature ? 'sm:col-span-2 lg:row-span-2' : ''
                                            }`}
                                        >
                                            {post.image_url && isValidImageUrl(post.image_url) ? (
                                                <div className={`relative w-full flex-shrink-0 overflow-hidden bg-forest-mid ${feature ? 'h-56 md:h-72' : 'h-44 md:h-52'}`}>
                                                    {post.image_url.includes('supabase.co') ? (
                                                        <img
                                                            src={post.image_url}
                                                            alt={post.title}
                                                            loading="lazy"
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                                        />
                                                    ) : (
                                                        <Image src={post.image_url} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    )}
                                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-ink/45 to-transparent" />
                                                </div>
                                            ) : (
                                                <div className={`relative flex w-full flex-shrink-0 items-end overflow-hidden bg-gradient-to-br from-forest-mid to-forest-deep ${feature ? 'h-40 md:h-52' : 'h-28 md:h-32'}`}>
                                                    <span className="p-5 font-display text-[15px] uppercase tracking-[0.16em] text-brass/70">Событие</span>
                                                </div>
                                            )}

                                            <div className="flex min-h-0 flex-1 flex-col p-5 md:p-6">
                                                <h2 className={`mb-2 font-display font-bold leading-snug text-cream transition-colors group-hover:text-brass ${feature ? 'text-2xl md:text-[28px]' : 'text-xl'}`}>
                                                    {post.title}
                                                </h2>
                                                {post.excerpt && (
                                                    <p className={`flex-1 leading-relaxed text-cream/72 ${feature ? 'text-[15px] line-clamp-4' : 'text-sm line-clamp-3'}`}>
                                                        {post.excerpt}
                                                    </p>
                                                )}
                                                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                                    <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-terracotta">
                                                        Подробнее <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                                                    </span>
                                                    {post.event_date ? (
                                                        <span className="text-xs font-medium text-brass">
                                                            {new Date(post.event_date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : post.published_at ? (
                                                        <span className="text-xs text-cream/45">
                                                            {new Date(post.published_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <ForestFooter />

            {showContentManager && (
                <ContentManager
                    category="events"
                    isOpen={showContentManager}
                    onClose={() => {
                        setShowContentManager(false);
                        loadPosts();
                    }}
                />
            )}
        </>
    );
}
