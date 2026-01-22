'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../supabase/client';
import { User } from '@supabase/supabase-js';

type AdminCheckResult = {
    isAdmin: boolean;
    loading: boolean;
    user: User | null;
};

/**
 * Хук для проверки админских прав пользователя
 * @param {boolean} enabled - Включена ли проверка (по умолчанию true)
 * @returns {AdminCheckResult}
 */
export function useAdminCheck(enabled: boolean = true): AdminCheckResult {
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (!enabled) {
            setIsAdmin(false);
            setLoading(false);
            setUser(null);
            return;
        }

        const checkAdminStatus = async () => {
            try {
                const supabase = createSupabaseBrowserClient();
                if (!supabase) {
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                const { data: { user: currentUser } } = await supabase.auth.getUser();

                if (!currentUser) {
                    setIsAdmin(false);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                setUser(currentUser);

                const { data: adminRecord } = await supabase
                    .from('admins')
                    .select('role')
                    .eq('id', currentUser.id)
                    .maybeSingle();

                setIsAdmin(!!adminRecord);
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [enabled]);

    return { isAdmin, loading, user };
}

export default useAdminCheck;
