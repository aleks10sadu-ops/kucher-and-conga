import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedCrmClient: SupabaseClient | null = null;

export function createCrmBrowserClient(): SupabaseClient | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (cachedCrmClient) {
        return cachedCrmClient;
    }

    const crmUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const crmKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!crmUrl || !crmKey) {
        console.warn('CRM Supabase credentials are missing');
        return null;
    }

    cachedCrmClient = createClient(crmUrl, crmKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    return cachedCrmClient;
}
