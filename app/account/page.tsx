'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { User } from '@supabase/supabase-js';

export default function AccountPage() {
    const router = useRouter();
    // Casting to any to avoid recurring Supabase type issues
    const [supabase] = useState(() => createSupabaseBrowserClient() as any);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!supabase) {
                setLoading(false);
                return;
            }
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                setUser(null);
                setIsAdmin(false);
                setLoading(false);
                return;
            }
            setUser(user);

            const { data: adminRecord } = await supabase
                .from('admins')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            setIsAdmin(!!adminRecord);
            setLoading(false);
        };

        load();
    }, [supabase]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;
        setAuthError('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setAuthError(error.message || 'Ошибка входа');
            return;
        }

        // перезагружаем состояние
        const {
            data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
            const { data: adminRecord } = await supabase
                .from('admins')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            setIsAdmin(!!adminRecord);
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setEmail('');
        setPassword('');
    };

    if (loading) {
        return (
            <div className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
                <div>Загрузка...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="bg-neutral-950 text-white min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 shadow-xl">
                    <h1 className="text-2xl font-bold mb-4 text-center">Личный кабинет</h1>
                    <p className="text-sm text-neutral-400 mb-6 text-center">
                        Войдите по email и паролю. Для админов будут доступны дополнительные
                        разделы.
                    </p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-amber-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Пароль</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-amber-400"
                            />
                        </div>
                        {authError && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                                {authError}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full px-4 py-2 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            Войти
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-950 text-white min-h-screen">
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Личный кабинет</h1>
                        <p className="text-neutral-300">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            На главную
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-all duration-200"
                        >
                            Выйти
                        </button>
                    </div>
                </div>

                {/* Информация о пользователе */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
                    {isAdmin ? (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-sm font-semibold border border-amber-400/30">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    Администратор
                                </span>
                            </div>
                            <h2 className="text-lg font-semibold mb-2 text-amber-200">
                                Режим администратора активен
                            </h2>
                            <p className="text-sm text-neutral-300">
                                Все функции редактирования доступны прямо на главной странице.
                                Перейдите на главную страницу, чтобы редактировать блюда, категории,
                                бизнес-ланчи и другие элементы сайта.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Обычный пользователь</h2>
                            <p className="text-sm text-neutral-300">
                                У этого аккаунта нет прав администратора. Обратитесь к владельцу сайта,
                                если вам нужен доступ к редактированию контента.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
