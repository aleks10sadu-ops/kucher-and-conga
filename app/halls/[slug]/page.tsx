import { MapPin } from 'lucide-react';
import { loadContentPostServer } from '@/lib/content/loadContentPosts.server';
import ForestPostView, { ForestPostNotFound } from '../../components/forest/ForestPostView';

// ISR: пост рендерится на сервере — браузер посетителя не ходит в Supabase (замедлен в РФ).
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function HallPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await loadContentPostServer('halls', slug);

    if (!post) {
        return <ForestPostNotFound backHref="/halls" backLabel="Ко всем залам" title="Зал не найден" />;
    }

    return (
        <ForestPostView
            post={post}
            backHref="/halls"
            backLabel="Ко всем залам"
            kicker={{ label: 'Зал', icon: <MapPin className="h-4 w-4" /> }}
        />
    );
}
