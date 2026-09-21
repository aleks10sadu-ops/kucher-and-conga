import React from 'react';

export const FEATURED_GUEST_REVIEWS = [
    {
        author: 'Евгений З.',
        date: '3 мая',
        rating: 5,
        profileUrl: 'https://yandex.ru/maps/user/27fet7ercu6qnbh9hwryyq17rw',
        summary: 'Нашли место для вкусного ужина вдвоём. Особенно отметили работу кухни и непринуждённую обстановку.',
    },
    {
        author: 'Анна',
        date: '10 августа',
        rating: 5,
        profileUrl: 'https://yandex.ru/maps/user/bq1jqxvbkc6410taqxuuz3yab8',
        summary: 'Ценит наши бизнес-ланчи: каждый день новый сет, свежая выпечка и удачное сочетание цены и качества.',
    },
    {
        author: 'Оксана Краснова',
        date: '20 июля',
        rating: 5,
        profileUrl: 'https://yandex.ru/maps/user/5r8v4qqfqu74y8nnaja7fef0mc',
        summary: 'Понравились лесная территория, летняя веранда с детской площадкой и возможность спокойно отдохнуть всей семьёй.',
    },
] as const;

const COLORS = {
    cream: '#F4F7F2',
    creamSoft: 'rgba(244,247,242,0.72)',
    brass: '#C29455',
    terracotta: '#AC4823',
    forest: '#101A14',
};

function Stars({ rating }: { rating: number }) {
    return (
        <span role="img" aria-label={`${rating} из 5`} style={{ display: 'inline-flex', gap: 3, color: COLORS.brass, fontSize: 15, letterSpacing: '0.04em' }}>
            <span aria-hidden>{'★'.repeat(rating)}</span>
        </span>
    );
}

export default function GuestReviews({ allReviewsHref }: { allReviewsHref: string }) {
    return (
        <div
            role="region"
            aria-label="Пятизвёздочные отзывы гостей"
            style={{
                marginTop: 26,
                overflow: 'hidden',
                borderRadius: 18,
                border: '1px solid rgba(194,148,85,0.28)',
                background: 'rgba(10,18,13,0.82)',
                boxShadow: '0 22px 54px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 22px 20px', borderBottom: '1px solid rgba(244,247,242,0.1)' }}>
                <strong className="rf-serif" style={{ color: COLORS.cream, fontSize: 'clamp(2.8rem, 7vw, 4rem)', lineHeight: 0.9, fontWeight: 900 }}>5,0</strong>
                <div style={{ minWidth: 0 }}>
                    <Stars rating={5} />
                    <div style={{ marginTop: 6, color: COLORS.creamSoft, fontSize: 13, lineHeight: 1.4 }}>Рейтинг гостей на Яндекс Картах</div>
                </div>
            </div>

            <div style={{ padding: '0 22px' }}>
                {FEATURED_GUEST_REVIEWS.map((review, index) => (
                    <article key={review.profileUrl} style={{ padding: '20px 0 21px', borderBottom: index < FEATURED_GUEST_REVIEWS.length - 1 ? '1px solid rgba(244,247,242,0.09)' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                                <span aria-hidden style={{ display: 'grid', placeItems: 'center', flex: '0 0 36px', width: 36, height: 36, borderRadius: '50%', background: index === 0 ? COLORS.terracotta : 'rgba(194,148,85,0.18)', color: COLORS.cream, fontWeight: 700, fontSize: 14 }}>
                                    {review.author.slice(0, 1)}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                    <a href={review.profileUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.cream, fontSize: 15, fontWeight: 650 }}>{review.author}</a>
                                    <div style={{ marginTop: 3, color: 'rgba(244,247,242,0.46)', fontSize: 12 }}>{review.date}</div>
                                </div>
                            </div>
                            <Stars rating={review.rating} />
                        </div>
                        <p style={{ margin: '14px 0 0', color: 'rgba(244,247,242,0.86)', fontSize: 15, lineHeight: 1.62 }}>{review.summary}</p>
                    </article>
                ))}
            </div>

            <a
                href={allReviewsHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    minHeight: 54,
                    padding: '12px 22px',
                    borderTop: '1px solid rgba(194,148,85,0.22)',
                    background: 'rgba(194,148,85,0.08)',
                    color: COLORS.brass,
                    fontSize: 14,
                    fontWeight: 650,
                }}
            >
                Все отзывы на Яндекс Картах
                <span aria-hidden style={{ fontSize: 20 }}>→</span>
            </a>
        </div>
    );
}
