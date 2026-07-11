import { createClient } from '@supabase/supabase-js';
import { FALLBACK_HALLS, mergeHalls, type Hall } from './halls-data';

// Серверная загрузка залов для страницы брони (ISR): CRM (реальные ID) +
// локальный контент (фото/описания). Браузер пользователя в Supabase не ходит.
export async function loadHallsServer(): Promise<Hall[]> {
  try {
    let crmHalls: any[] = [];
    const crmUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const crmKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;
    if (crmUrl && crmKey) {
      const crm = createClient(crmUrl, crmKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await crm.from('halls').select('id, name, capacity');
      if (error) console.error('loadHallsServer CRM:', error.message);
      else crmHalls = data || [];
    }

    let localContent: any[] = [];
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await sb.from('content_posts').select('*').eq('category', 'halls');
      if (error) console.error('loadHallsServer content:', error.message);
      else localContent = data || [];
    }

    return mergeHalls(crmHalls, localContent);
  } catch (e) {
    console.error('loadHallsServer:', e);
    return FALLBACK_HALLS;
  }
}
