import type { Metadata } from 'next';
import React, { cache } from 'react';
import { fetchPostBySlug, plainDescription } from '@/lib/content/serverContentPosts';
import { SITE, SITE_URL } from '../../components/forest/site';

// react.cache дедуплицирует запрос между generateMetadata и рендером в одном запросе.
const getPost = cache((slug: string) => fetchPostBySlug('vacancies', slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: 'Вакансия — Кучер & Conga' };
    const desc = plainDescription(post, 160) || `Вакансия «${post.title}» в ресторане «Кучер & Conga», Дмитров.`;
    return {
        title: `${post.title} — вакансия · Кучер & Conga`,
        description: desc,
        alternates: { canonical: `/vacancies/${slug}` },
        openGraph: {
            title: post.title,
            description: desc,
            url: `/vacancies/${slug}`,
            type: 'article',
            images: [post.image_url || '/atmosphere_2.webp'],
        },
    };
}

export default async function VacancySlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPost(slug);
    return (
        <>
            {children}
            {post && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'JobPosting',
                            title: post.title,
                            description: post.content || post.excerpt || post.title,
                            datePosted: post.published_at || post.created_at,
                            employmentType: 'OTHER',
                            hiringOrganization: { '@type': 'Organization', name: SITE.name, sameAs: SITE_URL },
                            jobLocation: {
                                '@type': 'Place',
                                address: { '@type': 'PostalAddress', streetAddress: 'Промышленная улица, 20Б', addressLocality: 'Дмитров', addressRegion: 'Московская область', postalCode: '141801', addressCountry: 'RU' },
                            },
                            url: `${SITE_URL}/vacancies/${slug}`,
                            directApply: true,
                        }).replace(/</g, '\\u003c'),
                    }}
                />
            )}
        </>
    );
}
