// Browser Supabase client (public anon key only)
// Uses singleton pattern to avoid recreating client on every call
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

let cachedClient: SupabaseClient<Database> | null = null;
let isConfigured: boolean | null = null;

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
    // Return cached client if available
    if (cachedClient !== null) {
        return cachedClient;
    }

    // Return null immediately if we've already determined config is missing
    if (isConfigured === false) {
        return null;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('Supabase browser client is not configured: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        }
        isConfigured = false;
        return null;
    }

    isConfigured = true;
    cachedClient = createBrowserClient<Database>(url, anonKey);
    return cachedClient;
}
