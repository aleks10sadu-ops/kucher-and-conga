import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Загрузка постов раздела (вакансии/события/залы) из content_posts.
// Один ретрай гасит транзиентные сетевые сбои (иначе в dev всплывает пустой «{}»).
export async function loadContentPosts(category: string): Promise<{ data: any[]; error: any }> {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) return { data: [], error: null };

    let data: any[] | null = null;
    let error: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        ({ data, error } = await supabase
            .from('content_posts')
            .select('*')
            .eq('category', category)
            .eq('is_published', true)
            .order('published_at', { ascending: false })
            .order('created_at', { ascending: false }));
        if (!error) break;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
    return { data: data || [], error };
}
