import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { toSiteImageUrl } from '@/lib/media/siteImageUrl';
import { russianPublicPost } from './russianPublicText';

// Серверная загрузка контента (вакансии/события/залы) для ISR-страниц.
// Браузеры российских пользователей не могут ходить в *.supabase.co напрямую
// (замедление AWS) — поэтому данные запекаются в HTML на сервере, как и меню.
// Без cookies (в отличие от createSupabaseRouteClient) — иначе страница станет динамической.
function createStaticClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function loadContentPostsServer(category: string): Promise<any[]> {
  const supabase = createStaticClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error(`loadContentPostsServer(${category}):`, error.message);
    return [];
  }
  return (data || []).map((post) => ({
    ...russianPublicPost(post),
    image_url: toSiteImageUrl(post.image_url),
  }));
}

export async function loadContentPostServer(category: string, slug: string): Promise<any | null> {
  const supabase = createStaticClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('category', category)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) {
    console.error(`loadContentPostServer(${category}/${slug}):`, error.message);
    return null;
  }
  return data ? { ...russianPublicPost(data), image_url: toSiteImageUrl(data.image_url) } : null;
}
