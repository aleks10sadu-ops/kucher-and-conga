'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

interface AdminCardProps {
    title: string;
    description: string;
    href: string;
}

function AdminCard({ title, description, href }: AdminCardProps) {
    return (
        <Link
            href={href}
            className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-amber-400/40 hover:scale-[1.02] transition-all"
        >
            <h2 className="text-lg font-semibold mb-1">{title}</h2>
            <p className="text-sm text-neutral-300">{description}</p>
        </Link>
    );
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const run = async () => {
            const supabase = createSupabaseBrowserClient();
            if (!supabase) {
                setLoading(false);
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/admin/login');
                return;
            }

            setUserEmail(user.email || '');

            const { data: adminRecord } = await supabase
                .from('admins')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (!adminRecord) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            setIsAdmin(true);
            setLoading(false);
        };

        run();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;
        await supabase.auth.signOut();
        router.replace('/admin/login');
    };

    if (loading) {
        return <div className="text-center mt-10">Загрузка...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="max-w-xl mx-auto mt-16 text-center">
                <h1 className="text-2xl font-bold mb-3">Нет доступа</h1>
                <p className="text-neutral-300 mb-4">
                    Ваш аккаунт не найден в таблице администраторов.
                </p>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all"
                >
                    Выйти
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Админ-панель</h1>
                    <p className="text-sm text-neutral-400">Вы вошли как {userEmail}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-sm hover:bg-white/20 transition-all"
                >
                    Выйти
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminCard
                    title="Блюда"
                    description="Управление блюдами, ценами и активностью."
                    href="/admin/dishes"
                />
                <AdminCard
                    title="Категории"
                    description="Структура меню и сортировка категорий."
                    href="/admin/categories"
                />
                <AdminCard
                    title="Страницы"
                    description="Контент страниц (о нас, контакты и др.)."
                    href="/admin/pages"
                />
            </div>
        </div>
    );
}
