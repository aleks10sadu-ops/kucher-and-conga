import { Briefcase } from 'lucide-react';
import { loadContentPostServer } from '@/lib/content/loadContentPosts.server';
import VacancyApplyForm from '../../components/VacancyApplyForm';
import ForestPostView, { ForestPostNotFound } from '../../components/forest/ForestPostView';

// ISR: пост рендерится на сервере — браузер посетителя не ходит в Supabase (замедлен в РФ).
export const dynamic = 'force-static';
export const revalidate = 300;

export default async function VacancyPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await loadContentPostServer('vacancies', slug);

    if (!post) {
        return <ForestPostNotFound backHref="/vacancies" backLabel="Ко всем вакансиям" title="Вакансия не найдена" />;
    }

    return (
        <ForestPostView
            post={post}
            backHref="/vacancies"
            backLabel="Ко всем вакансиям"
            kicker={{ label: 'Вакансия', icon: <Briefcase className="h-4 w-4" /> }}
        >
            <div id="apply">
                <VacancyApplyForm vacancyTitle={post.title} />
            </div>
        </ForestPostView>
    );
}
