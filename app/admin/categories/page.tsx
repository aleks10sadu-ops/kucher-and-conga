'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

interface MenuType {
    id: string | number;
    slug: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
    sort_order: number | null;
    menu_type_id: string | number;
}

export default function AdminCategoriesPage() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [menuTypes, setMenuTypes] = useState<MenuType[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            const supabase = createSupabaseBrowserClient();
            if (!supabase) {
                setError('Supabase не настроен');
                setLoading(false);
                return;
            }

            const [{ data: mtData, error: mtError }, { data: catData, error: catError }] =
                await Promise.all([
                    supabase
                        .from('menu_types')
                        .select('id, slug, name')
                        .order('name', { ascending: true }),
                    supabase
                        .from('categories')
                        .select('id, name, sort_order, menu_type_id')
                        .order('sort_order', { ascending: true }),
                ]);

            if (mtError || catError) {
                setError(mtError?.message || catError?.message || 'Ошибка загрузки');
                setLoading(false);
                return;
            }

            setMenuTypes(mtData || []);
            setCategories(catData || []);
            setLoading(false);
        };

        load();
    }, []);

    const updateCategoryField = (id: string, field: keyof Category, value: any) => {
        setCategories((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
        );
    };

    const handleSave = async (cat: Category) => {
        setSavingId(cat.id);
        setError('');

        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) {
            setError('Supabase не настроен');
            setSavingId(null);
            return;
        }

        const { error: updateError } = await supabase
            .from('categories')
            .update({
                name: cat.name,
                sort_order: cat.sort_order,
                menu_type_id: cat.menu_type_id,
            })
            .eq('id', cat.id);

        if (updateError) {
            setError(updateError.message);
        }

        setSavingId(null);
    };

    const handleAdd = async () => {
        setError('');
        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) {
            setError('Supabase не настроен');
            return;
        }

        const defaultMenuTypeId = menuTypes[0]?.id;
        const maxSort =
            categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1;

        const { data, error: insertError } = await supabase
            .from('categories')
            .insert({
                name: 'Новая категория',
                sort_order: maxSort,
                menu_type_id: defaultMenuTypeId,
            })
            .select('id, name, sort_order, menu_type_id')
            .limit(1);

        if (insertError) {
            setError(insertError.message);
            return;
        }

        if (data?.[0]) {
            setCategories((prev) => [...prev, data[0]]);
        }
    };

    if (loading) {
        return <div>Загрузка категорий...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Категории</h1>
                <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 rounded-full bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300"
                >
                    Добавить категорию
                </button>
            </div>

            {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-3 py-2 text-left">Название</th>
                            <th className="px-3 py-2 text-left">Тип меню</th>
                            <th className="px-3 py-2 text-center">Порядок</th>
                            <th className="px-3 py-2 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat.id} className="border-t border-white/10">
                                <td className="px-3 py-2">
                                    <input
                                        value={cat.name || ''}
                                        onChange={(e) =>
                                            updateCategoryField(cat.id, 'name', e.target.value)
                                        }
                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <select
                                        value={cat.menu_type_id || ''}
                                        onChange={(e) =>
                                            updateCategoryField(cat.id, 'menu_type_id', e.target.value)
                                        }
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    >
                                        {menuTypes.map((mt) => (
                                            <option key={mt.id} value={mt.id}>
                                                {mt.name} ({mt.slug})
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <input
                                        type="number"
                                        value={cat.sort_order ?? 0}
                                        onChange={(e) =>
                                            updateCategoryField(
                                                cat.id,
                                                'sort_order',
                                                Number(e.target.value || 0),
                                            )
                                        }
                                        className="w-20 bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400 text-center"
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => handleSave(cat)}
                                        disabled={savingId === cat.id}
                                        className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 disabled:opacity-60"
                                    >
                                        {savingId === cat.id ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-3 py-4 text-center text-neutral-400"
                                >
                                    Категорий нет
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
