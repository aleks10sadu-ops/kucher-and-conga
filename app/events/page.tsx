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
    // Должен быть абсолютный URL (http:// или https://) или относительный путь, начинающийся с /
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) return false;
    // Проверяем, что это валидный URL
    try {
        // Для относительных путей просто проверяем формат
        if (trimmedUrl.startsWith('/')) return true;
        // Для абсолютных URL проверяем через URL конструктор
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
                    filter: `category=eq.events`,
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
                .eq('category', 'events')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading posts:', error);
                setPosts([]);
            } else {
                const postsData = (data as Post[]) || [];
                console.log('Загружено событий:', postsData.length);
                postsData.forEach(post => {
                    console.log(`Событие "${post.title}":`, {
                        id: post.id,
                        image_url: post.image_url,
                        hasImage: !!post.image_url,
                        isValidUrl: post.image_url ? isValidImageUrl(post.image_url) : false
                    });
                });
                setPosts(postsData);
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
                                Управление событиями
                            </button>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-12">События</h1>

                    {loading ? (
                        <div className="text-center py-12 text-neutral-400">Загрузка...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400">
                            <p>События будут добавлены позже</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {posts.map((post, index) => {
                                // Bento Style: чередуем размеры карточек для визуального интереса
                                const isLarge = index % 6 === 0; // Каждая 6-я карточка большая
                                const isWide = index % 6 === 3; // Каждая 3-я карточка широкая

                                return (
                                    <Link
                                        key={post.id}
                                        href={`/events/${post.slug}`}
                                        className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-400/10 flex flex-col ${isLarge ? 'md:col-span-2 md:row-span-2' : ''
                                            } ${isWide ? 'md:col-span-2' : ''}`}
                                    >
                                        {/* Изображение - всегда сверху */}
                                        {post.image_url && isValidImageUrl(post.image_url) ? (
                                            <div className={`relative w-full ${isLarge ? 'h-64 md:h-80' : 'h-48 md:h-56'} overflow-hidden flex-shrink-0 bg-neutral-900`}>
                                                {post.image_url.includes('supabase.co') ? (
                                                    // Для Supabase используем обычный img для лучшей совместимости
                                                    <img
                                                        src={post.image_url}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        loading="lazy"
                                                        crossOrigin="anonymous"
                                                        onLoad={() => {
                                                            console.log('✅ Изображение загружено успешно:', post.image_url);
                                                        }}
                                                        onError={async (e) => {
                                                            console.error('❌ Ошибка загрузки изображения:', post.image_url);

                                                            // Проверяем доступность файла
                                                            try {
                                                                const response = await fetch(post.image_url!, {
                                                                    method: 'HEAD',
                                                                    mode: 'no-cors' // Пробуем без CORS для диагностики
                                                                }).catch(() => {
                                                                    // Если no-cors не работает, пробуем обычный запрос
                                                                    return fetch(post.image_url!, { method: 'HEAD' });
                                                                });

                                                                console.log('Проверка доступности файла:', {
                                                                    url: post.image_url,
                                                                    status: response?.status,
                                                                    statusText: response?.statusText,
                                                                    ok: response?.ok,
                                                                    type: response?.type
                                                                });

                                                                // Пробуем проверить через Supabase API
                                                                if (post.image_url!.includes('supabase.co')) {
                                                                    const supabase = createSupabaseBrowserClient() as any;
                                                                    if (supabase) {
                                                                        const urlParts = post.image_url!.split('/');
                                                                        const bucketIndex = urlParts.indexOf('public');
                                                                        if (bucketIndex !== -1) {
                                                                            const bucketName = urlParts[bucketIndex + 1];
                                                                            const filePath = urlParts.slice(bucketIndex + 2).join('/');

                                                                            console.log('Проверка через Supabase API:', { bucketName, filePath });

                                                                            // Пробуем получить список файлов в папке
                                                                            const folderPath = filePath.split('/').slice(0, -1).join('/');
                                                                            const fileName = filePath.split('/').pop();

                                                                            const { data: files, error: listError } = await supabase.storage
                                                                                .from(bucketName)
                                                                                .list(folderPath, {
                                                                                    limit: 100
                                                                                });

                                                                            if (listError) {
                                                                                console.error('Ошибка при проверке файлов:', listError);
                                                                            } else {
                                                                                console.log('Файлы в папке:', files);
                                                                                const fileExists = files?.some((f: any) => f.name === fileName);
                                                                                console.log(`Файл "${fileName}" ${fileExists ? 'найден' : 'НЕ найден'} в папке "${folderPath}"`);
                                                                            }
                                                                        }
                                                                    }
                                                                }

                                                                if (response?.status === 404) {
                                                                    console.error('❌ Файл не найден по указанному пути (404)');
                                                                    console.error('Возможные причины:');
                                                                    console.error('1. Файл был удален');
                                                                    console.error('2. Файл не был перемещен из temp после создания записи');
                                                                    console.error('3. Неправильный путь в URL');
                                                                } else if (response?.status === 403) {
                                                                    console.error('❌ Доступ запрещен (403)');
                                                                    console.error('Проверьте:');
                                                                    console.error('1. Bucket настроен как Public bucket');
                                                                    console.error('2. RLS политики настроены для чтения');
                                                                } else if (response?.status === 400) {
                                                                    console.error('❌ Bad Request (400)');
                                                                    console.error('Возможные причины:');
                                                                    console.error('1. Неправильный формат URL');
                                                                    console.error('2. Файл поврежден или имеет неправильный формат');
                                                                    console.error('3. Проблемы с кодировкой пути');
                                                                }
                                                            } catch (fetchError) {
                                                                console.error('Ошибка при проверке файла:', fetchError);
                                                            }

                                                            // Показываем плейсхолдер при ошибке
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const container = target.parentElement;
                                                            if (container && !container.querySelector('.error-placeholder')) {
                                                                const placeholder = document.createElement('div');
                                                                placeholder.className = 'error-placeholder w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5';
                                                                placeholder.innerHTML = `
                                  <div class="text-center">
                                    <div class="text-4xl mb-2">📅</div>
                                    <p class="text-xs text-neutral-500">Ошибка загрузки</p>
                                    <p class="text-xs text-neutral-600 mt-1">Проверьте консоль</p>
                                  </div>
                                `;
                                                                container.appendChild(placeholder);
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    // Для других источников используем Next.js Image
                                                    <Image
                                                        src={post.image_url}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        onError={(e) => {
                                                            console.error('Ошибка загрузки изображения:', post.image_url);
                                                        }}
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
                                            </div>
                                        ) : (
                                            // Плейсхолдер если нет изображения
                                            <div className={`relative w-full ${isLarge ? 'h-48 md:h-64' : 'h-40 md:h-48'} overflow-hidden flex-shrink-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center`}>
                                                <div className="text-center">
                                                    <div className="text-4xl mb-2">📅</div>
                                                    <p className="text-xs text-neutral-500">Нет изображения</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Контент - название, описание, дата */}
                                        <div className="flex flex-col flex-1 p-4 md:p-6 min-h-0">
                                            {/* Название */}
                                            <h2 className={`font-bold mb-2 md:mb-3 line-clamp-2 group-hover:text-amber-400 transition-colors ${isLarge ? 'text-xl md:text-2xl lg:text-3xl' : 'text-lg md:text-xl lg:text-2xl'
                                                }`}>
                                                {post.title}
                                            </h2>

                                            {/* Описание */}
                                            {post.excerpt && (
                                                <p className={`text-neutral-300 mb-3 md:mb-4 flex-1 ${isLarge ? 'text-sm md:text-base line-clamp-4' : 'text-xs md:text-sm line-clamp-3'
                                                    }`}>
                                                    {post.excerpt}
                                                </p>
                                            )}

                                            {/* Дата и стрелка - всегда внизу */}
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
                    category="events"
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
