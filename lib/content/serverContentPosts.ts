import { createClient } from '@supabase/supabase-js';

export interface ContentPost {
    slug: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    image_url: string | null;
    published_at: string | null;
    created_at: string;
    event_date?: string | null;
}

// Публичное чтение опубликованных постов на сервере (для sitemap и JSON-LD).
// Без кук/сессии; при любой ошибке возвращает пустой результат (graceful degrade).
function client() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchPublishedPosts(category: string): Promise<ContentPost[]> {
    const supabase = client();
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('content_posts')
            .select('*')
            .eq('category', category)
            .eq('is_published', true)
            .order('published_at', { ascending: false });
        if (error) return [];
        return (data as ContentPost[]) || [];
    } catch {
        return [];
    }
}

export async function fetchPostBySlug(category: string, slug: string): Promise<ContentPost | null> {
    const supabase = client();
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('content_posts')
            .select('*')
            .eq('category', category)
            .eq('slug', slug)
            .eq('is_published', true)
            .maybeSingle();
        if (error) return null;
        return (data as ContentPost) || null;
    } catch {
        return null;
    }
}

// Короткое текстовое описание для схем (без HTML).
export function plainDescription(post: ContentPost, max = 300): string {
    const raw = post.excerpt || post.content || '';
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}
