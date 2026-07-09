import type { Metadata } from 'next';
import React, { cache } from 'react';
import { fetchPostBySlug, plainDescription } from '@/lib/content/serverContentPosts';
import { SITE, SITE_URL } from '../../components/forest/site';

const getPost = cache((slug: string) => fetchPostBySlug('events', slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: 'Событие — Кучер & Conga' };
    const desc = plainDescription(post, 160) || `Событие «${post.title}» в ресторане «Кучер & Conga», Дмитров.`;
    return {
        title: `${post.title} — событие · Кучер & Conga`,
        description: desc,
        alternates: { canonical: `/events/${slug}` },
        openGraph: {
            title: post.title,
            description: desc,
            url: `/events/${slug}`,
            type: 'article',
            images: [post.image_url || '/atmosphere_3.webp'],
        },
    };
}

export default async function EventSlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);
    // Дата события из поля event_date (задаётся в админке); если не указана — дата публикации.
    const startDate = post?.event_date || post?.published_at || post?.created_at;
    return (
        <>
            {children}
            {post && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Event',
                            name: post.title,
                            description: plainDescription(post),
                            startDate,
                            eventStatus: 'https://schema.org/EventScheduled',
                            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                            location: {
                                '@type': 'Place',
                                name: SITE.name,
                                address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressRegion: 'Московская область', postalCode: '141801', addressCountry: 'RU' },
                            },
                            image: post.image_url ? [post.image_url] : undefined,
                            organizer: { '@type': 'Organization', name: SITE.name, url: SITE_URL },
                            url: `${SITE_URL}/events/${slug}`,
                        }).replace(/</g, '\\u003c'),
                    }}
                />
            )}
        </>
    );
}
