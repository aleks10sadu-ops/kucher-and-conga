'use server'

import { createSupabaseRouteClient } from '@/lib/supabase/server';

export async function getMenuData() {
    try {
        const supabase = await createSupabaseRouteClient();
        const { data, error } = await supabase.rpc('get_active_menu');

        if (error) {
            console.error('RPC Error:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Server Action getMenuData error:', error);
        throw error;
    }
}
