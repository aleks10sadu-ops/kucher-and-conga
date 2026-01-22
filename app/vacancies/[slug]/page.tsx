'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Briefcase } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

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

const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
};

export default function VacancyPostPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        loadPost();
    }, [slug]);

    const loadPost = async () => {
        setLoading(true);
        setError(null);
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setError('Supabase не настроен');
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('content_posts')
                .select('*')
                .eq('category', 'vacancies')
                .eq('slug', slug)
                .eq('is_published', true)
                .maybeSingle();

            if (fetchError) {
                setError('Ошибка загрузки');
                console.error('Error loading post:', fetchError);
            } else if (!data) {
                setError('Запись не найдена');
            } else {
                setPost(data);
            }
        } catch (err) {
            setError('Ошибка загрузки');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
                    <p className="text-neutral-400">Загрузка...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <h1 className="text-3xl font-bold mb-4">Запись не найдена</h1>
                    <p className="text-neutral-400 mb-6">{error || 'Запись не существует или была удалена'}</p>
                    <Link
                        href="/vacancies"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Вернуться к вакансиям
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-950 text-white min-h-screen">
            {/* Hero Section с изображением */}
            {post.image_url && isValidImageUrl(post.image_url) && (
                <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden">
                    {post.image_url.includes('supabase.co') ? (
                        <img
                            src={post.image_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Image
                            src={post.image_url}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />

                    {/* Навигация */}
                    <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-8">
                        <Link
                            href="/vacancies"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 hover:bg-black/60 transition text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Назад к вакансиям
                        </Link>
                    </div>
                </div>
            )}

            {/* Контент */}
            <article className="max-w-4xl mx-auto px-4 py-12 md:py-16">
                {/* Заголовок и метаданные */}
                <header className="mb-8 md:mb-12">
                    {!post.image_url && (
                        <Link
                            href="/vacancies"
                            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-6 transition text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Назад к вакансиям
                        </Link>
                    )}

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        {post.title}
                    </h1>

                    {post.excerpt && (
                        <p className="text-xl md:text-2xl text-neutral-300 mb-6 leading-relaxed">
                            {post.excerpt}
                        </p>
                    )}

                    {/* Метаданные */}
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base text-neutral-400">
                        {post.published_at && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                                <span>
                                    {new Date(post.published_at).toLocaleDateString('ru-RU', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                            <span>Вакансия</span>
                        </div>
                    </div>
                </header>

                {/* Основной контент */}
                <div
                    className="prose prose-invert prose-lg max-w-none text-neutral-200 leading-relaxed
            prose-headings:text-white prose-headings:font-bold
            prose-p:text-neutral-200 prose-p:mb-6
            prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-semibold
            prose-ul:text-neutral-200 prose-ol:text-neutral-200
            prose-li:my-2
            prose-img:rounded-xl prose-img:shadow-2xl
            prose-blockquote:border-l-amber-400 prose-blockquote:pl-6 prose-blockquote:italic
            prose-code:text-amber-400 prose-code:bg-black/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10"
                    dangerouslySetInnerHTML={{ __html: post.content || '' }}
                />
            </article>

            {/* Навигация внизу */}
            <div className="max-w-4xl mx-auto px-4 pb-12 md:pb-16">
                <Link
                    href="/vacancies"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Вернуться к вакансиям
                </Link>
            </div>
        </div>
    );
}
