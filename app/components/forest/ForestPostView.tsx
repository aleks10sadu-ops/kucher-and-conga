'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import ForestHeader from './ForestHeader';
import ForestFooter from './ForestFooter';

export interface ForestPost {
    title: string;
    excerpt: string | null;
    content: string | null;
    image_url: string | null;
    published_at: string | null;
    event_date?: string | null;
}

export const isValidImageUrl = (url: string | null | undefined): boolean =>
    !!url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));

// Общий каркас статьи-детали: герой, лид, контент, слот (например, анкета), возврат.
export default function ForestPostView({
    post,
    backHref,
    backLabel,
    kicker,
    children,
}: {
    post: ForestPost;
    backHref: string;
    backLabel: string;
    kicker: { label: string; icon: React.ReactNode };
    children?: React.ReactNode;
}) {
    const hasImage = isValidImageUrl(post.image_url);

    const Meta = () => (
        <div className="flex flex-wrap items-center gap-4 text-sm text-cream/70">
            <span className="inline-flex items-center gap-1.5 text-brass">{kicker.icon} {kicker.label}</span>
            {post.event_date ? (
                <span>{new Date(post.event_date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
            ) : post.published_at ? (
                <span>{new Date(post.published_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            ) : null}
        </div>
    );

    const Back = ({ floating = false }: { floating?: boolean }) => (
        <Link
            href={backHref}
            className={
                floating
                    ? 'inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-cream backdrop-blur-sm transition-colors hover:bg-black/60'
                    : 'inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-cream/85 transition-colors hover:border-brass/40 hover:bg-white/[0.08]'
            }
        >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
        </Link>
    );

    return (
        <>
            <ForestHeader />
            <main className="min-h-screen bg-forest-ink font-body text-cream">
                {hasImage ? (
                    <section className="relative h-[46vh] min-h-[320px] w-full overflow-hidden md:h-[56vh]">
                        <Image src={post.image_url!} alt={post.title} fill className="object-cover" priority />
                        <div className="absolute inset-0 bg-gradient-to-t from-forest-ink via-forest-ink/70 to-forest-ink/25" />
                        <div className="absolute inset-0">
                            <div className="mx-auto flex h-full max-w-[880px] flex-col justify-between px-5 pb-9 pt-20 md:px-8 md:pb-12">
                                <Back floating />
                                <div>
                                    <Meta />
                                    <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-black leading-[1.06] text-cream">{post.title}</h1>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="mx-auto max-w-[880px] px-5 pb-4 pt-24 md:px-8">
                        <Back floating />
                        <div className="mt-6">
                            <Meta />
                            <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.6rem)] font-black leading-[1.06] text-cream">{post.title}</h1>
                        </div>
                    </section>
                )}

                <article className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
                    {post.excerpt && (
                        <p className="mb-8 border-b border-white/10 pb-8 text-[clamp(17px,2.2vw,22px)] leading-relaxed text-cream/85">
                            {post.excerpt}
                        </p>
                    )}
                    <div className="forest-prose" dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                </article>

                {children && <div className="mx-auto max-w-[760px] px-5 pb-8 md:px-8">{children}</div>}

                <div className="mx-auto max-w-[760px] px-5 pb-16 md:px-8">
                    <Back />
                </div>
            </main>
            <ForestFooter />
        </>
    );
}

export function ForestPostLoading() {
    return (
        <>
            <ForestHeader />
            <main className="flex min-h-screen items-center justify-center bg-forest-ink text-cream">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-brass" />
                    <p className="text-cream/50">Загрузка…</p>
                </div>
            </main>
        </>
    );
}

export function ForestPostNotFound({ backHref, backLabel, title, message }: { backHref: string; backLabel: string; title: string; message?: string }) {
    return (
        <>
            <ForestHeader />
            <main className="flex min-h-screen items-center justify-center bg-forest-ink px-4 text-cream">
                <div className="mx-auto max-w-md text-center">
                    <h1 className="mb-4 font-display text-3xl font-bold">{title}</h1>
                    <p className="mb-6 text-cream/60">{message || 'Запись не существует или была удалена'}</p>
                    <Link href={backHref} className="inline-flex items-center gap-2 rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">
                        <ArrowLeft className="h-5 w-5" />
                        {backLabel}
                    </Link>
                </div>
            </main>
            <ForestFooter />
        </>
    );
}
