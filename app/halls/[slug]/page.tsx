import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { loadContentPostServer } from '@/lib/content/loadContentPosts.server';
import ForestPostView, { ForestPostNotFound } from '../../components/forest/ForestPostView';
import { buildBreadcrumbJsonLd, buildHallJsonLd, serializeJsonLd } from '@/lib/seo/structuredData';
import { buildBookingHref } from '@/lib/booking/bookingContext';
import { bookingHallKeyForName } from '@/lib/booking/hallCatalog';
import {
    EXACT_PUBLIC_HALLS,
    isExactPublicHallSlug,
    materializePublicHallPost,
    type PublicHallPost,
} from '@/lib/halls/publicHallPosts';

async function loadPublicHall(slug: string): Promise<PublicHallPost | null> {
    const exactHall = EXACT_PUBLIC_HALLS.find((hall) => hall.slug === slug);
    if (!exactHall) {
        return loadContentPostServer('halls', slug) as Promise<PublicHallPost | null>;
    }

    let source: PublicHallPost | null = null;
    for (const sourceSlug of exactHall.sourceSlugs) {
        source = await loadContentPostServer('halls', sourceSlug) as PublicHallPost | null;
        if (source) break;
    }

    return materializePublicHallPost(slug, source);
}

const getHall = cache(loadPublicHall);

export function hallBookingHref(title: string, slug: string): string {
    return buildBookingHref({
        source: 'hall',
        hallKey: bookingHallKeyForName(title),
        bookingType: isExactPublicHallSlug(slug) ? 'banquet' : undefined,
    });
}

export function createHallMetadata(post: PublicHallPost, slug: string): Metadata {
    const description = post.excerpt || `Зал «${post.title}» ресторана «Кучер и Конга» в Дмитрове.`;
    return {
        title: `${post.title} — банкетный зал · Кучер и Конга`,
        description,
        alternates: { canonical: `/halls/${slug}` },
        openGraph: {
            title: `${post.title} — Кучер и Конга`,
            description,
            url: `/halls/${slug}`,
            type: 'website',
            images: [post.image_url || '/konga_bron.webp'],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${post.title} — Кучер и Конга`,
            description,
            images: [post.image_url || '/konga_bron.webp'],
        },
    };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getHall(slug);
    return post
        ? createHallMetadata(post, slug)
        : { title: 'Зал не найден — Кучер и Конга', robots: { index: false, follow: false } };
}

// ISR: пост рендерится на сервере — браузер посетителя не ходит в Supabase (замедлен в РФ).
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function HallPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getHall(slug);

    if (!post) {
        return <ForestPostNotFound backHref="/halls" backLabel="Ко всем залам" title="Зал не найден" />;
    }

    return (
        <>
            <ForestPostView
                post={post}
                backHref="/halls"
                backLabel="Ко всем залам"
                kicker={{ label: 'Зал', icon: <MapPin className="h-4 w-4" /> }}
            >
                <Link
                    href={hallBookingHref(post.title, slug)}
                    className="inline-flex rounded-lg bg-terracotta px-6 py-3 font-semibold text-[#FBF3EA]"
                >
                    Забронировать этот зал
                </Link>
            </ForestPostView>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildHallJsonLd(post, slug)) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: serializeJsonLd(
                        buildBreadcrumbJsonLd([
                            { name: 'Главная', path: '/' },
                            { name: 'Залы и банкеты', path: '/halls' },
                            { name: post.title, path: `/halls/${slug}` },
                        ]),
                    ),
                }}
            />
        </>
    );
}
