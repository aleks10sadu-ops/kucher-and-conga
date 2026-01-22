'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import ContentManager from '../components/ContentManager';

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
}

// Вспомогательная функция для проверки валидности URL для Next.js Image
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

export default function HallsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminLoading, setAdminLoading] = useState(true);
    const [showContentManager, setShowContentManager] = useState(false);

    useEffect(() => {
        loadPosts();
        checkAdmin();

        // Realtime синхронизация
        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) return;

        const channel = supabase
            .channel('content-posts-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'content_posts',
                    filter: `category=eq.halls`,
                },
                () => {
                    loadPosts();
                }
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
            const { data: adminRecord } = await supabase
                .from('admins')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
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
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('content_posts')
                .select('*')
                .eq('category', 'halls')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading posts:', error);
                setPosts([]);
            } else {
                setPosts(data || []);
            }
        } catch (err) {
            console.error('Error:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-neutral-950 text-white min-h-screen">
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <Link href="/" className="inline-block text-amber-400 hover:text-amber-300 transition-colors">
                            ← Вернуться на главную
                        </Link>
                        {!adminLoading && isAdmin && (
                            <button
                                onClick={() => setShowContentManager(true)}
                                className="px-4 py-2 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                            >
                                Управление залами
                            </button>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-12">Залы</h1>

                    {loading ? (
                        <div className="text-center py-12 text-neutral-400">Загрузка...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400">
                            <p>Информация о залах будет добавлена позже</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {posts.map((post, index) => {
                                const isLarge = index % 6 === 0;
                                const isWide = index % 6 === 3;

                                return (
                                    <Link
                                        key={post.id}
                                        href={`/halls/${post.slug}`}
                                        className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-400/10 flex flex-col ${isLarge ? 'md:col-span-2 md:row-span-2' : ''
                                            } ${isWide ? 'md:col-span-2' : ''}`}
                                    >
                                        {post.image_url && isValidImageUrl(post.image_url) ? (
                                            <div className={`relative w-full ${isLarge ? 'h-64 md:h-80' : 'h-48 md:h-56'} overflow-hidden flex-shrink-0 bg-neutral-900`}>
                                                {post.image_url.includes('supabase.co') ? (
                                                    <img
                                                        src={post.image_url}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <Image
                                                        src={post.image_url}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <div className={`relative w-full ${isLarge ? 'h-48 md:h-64' : 'h-40 md:h-48'} overflow-hidden flex-shrink-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center`}>
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">🏛️</div>
                                                    <p className="text-xs text-neutral-500">Нет изображения</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col flex-1 p-4 md:p-6 min-h-0">
                                            <h2 className={`font-bold mb-2 md:mb-3 line-clamp-2 group-hover:text-amber-400 transition-colors ${isLarge ? 'text-xl md:text-2xl lg:text-3xl' : 'text-lg md:text-xl lg:text-2xl'
                                                }`}>
                                                {post.title}
                                            </h2>

                                            {post.excerpt && (
                                                <p className={`text-neutral-300 mb-3 md:mb-4 flex-1 ${isLarge ? 'text-sm md:text-base line-clamp-4' : 'text-xs md:text-sm line-clamp-3'
                                                    }`}>
                                                    {post.excerpt}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-auto pt-3 md:pt-4 border-t border-white/10">
                                                {post.published_at && (
                                                    <p className="text-xs md:text-sm text-neutral-400">
                                                        {new Date(post.published_at).toLocaleDateString('ru-RU', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                )}
                                                <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg md:text-xl">
                                                    →
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {showContentManager && (
                <ContentManager
                    category="halls"
                    isOpen={showContentManager}
                    onClose={() => {
                        setShowContentManager(false);
                        loadPosts();
                    }}
                />
            )}
        </div>
    );
}
