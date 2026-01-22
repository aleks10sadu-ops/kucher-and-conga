'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

interface Category {
    id: string;
    name: string;
}

interface Dish {
    id: string;
    name: string;
    price: number | null;
    is_active: boolean;
    category_id: string;
    image_url: string | null;
    weight: string | null;
}

export default function AdminDishesPage() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            const supabase = createSupabaseBrowserClient();
            if (!supabase) {
                setError('Supabase не настроен');
                setLoading(false);
                return;
            }

            const [{ data: catData, error: catError }, { data: dishData, error: dishError }] =
                await Promise.all([
                    supabase
                        .from('categories')
                        .select('id, name')
                        .order('name', { ascending: true }),
                    supabase
                        .from('dishes')
                        .select('id, name, price, is_active, category_id, image_url, weight')
                        .order('name', { ascending: true }),
                ]);

            if (catError || dishError) {
                setError(catError?.message || dishError?.message || 'Ошибка загрузки');
                setLoading(false);
                return;
            }

            setCategories(catData || []);
            setDishes(dishData || []);
            setLoading(false);
        };

        load();
    }, []);

    const updateDishField = (id: string, field: keyof Dish, value: any) => {
        setDishes((prev) =>
            prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
        );
    };

    const handleSave = async (dish: Dish) => {
        setSavingId(dish.id);
        setError('');

        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) {
            setError('Supabase не настроен');
            setSavingId(null);
            return;
        }

        const { error: updateError } = await supabase
            .from('dishes')
            .update({
                name: dish.name,
                price: dish.price,
                is_active: dish.is_active,
                category_id: dish.category_id,
                image_url: dish.image_url,
                weight: dish.weight,
            })
            .eq('id', dish.id);

        if (updateError) {
            setError(updateError.message);
        }

        setSavingId(null);
    };

    const filteredDishes =
        selectedCategoryId === 'all'
            ? dishes
            : dishes.filter((d) => d.category_id === selectedCategoryId);

    if (loading) {
        return <div>Загрузка блюд...</div>;
    }

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">Блюда</h1>

            {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                    <option value="all">Все категории</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <button
                    onClick={async () => {
                        setCreating(true);
                        setError('');
                        const supabase = createSupabaseBrowserClient() as any;
                        if (!supabase) {
                            setError('Supabase не настроен');
                            setCreating(false);
                            return;
                        }
                        const defaultCategoryId =
                            selectedCategoryId !== 'all'
                                ? selectedCategoryId
                                : categories[0]?.id;
                        const { data, error: insertError } = await supabase
                            .from('dishes')
                            .insert({
                                name: 'Новое блюдо',
                                price: 0,
                                category_id: defaultCategoryId,
                                is_active: true,
                            })
                            .select('id, name, price, is_active, category_id, image_url, weight')
                            .limit(1);

                        if (insertError) {
                            setError(insertError.message);
                        } else if (data?.[0]) {
                            setDishes((prev) => [data[0], ...prev]);
                        }
                        setCreating(false);
                    }}
                    disabled={creating || categories.length === 0}
                    className="px-3 py-1.5 rounded-full bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 disabled:opacity-60"
                >
                    {creating ? 'Создание...' : 'Добавить блюдо'}
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-3 py-2 text-left">Название</th>
                            <th className="px-3 py-2 text-left">Цена</th>
                            <th className="px-3 py-2 text-left">Вес</th>
                            <th className="px-3 py-2 text-left">Изображение (URL)</th>
                            <th className="px-3 py-2 text-left">Категория</th>
                            <th className="px-3 py-2 text-center">Активно</th>
                            <th className="px-3 py-2 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDishes.map((dish) => (
                            <tr key={dish.id} className="border-t border-white/10">
                                <td className="px-3 py-2">
                                    <input
                                        value={dish.name || ''}
                                        onChange={(e) =>
                                            updateDishField(dish.id, 'name', e.target.value)
                                        }
                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        min={0}
                                        value={dish.price ?? ''}
                                        onChange={(e) =>
                                            updateDishField(
                                                dish.id,
                                                'price',
                                                e.target.value ? Number(e.target.value) : null,
                                            )
                                        }
                                        className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        value={dish.weight || ''}
                                        onChange={(e) =>
                                            updateDishField(dish.id, 'weight', e.target.value)
                                        }
                                        placeholder="например, 250 г"
                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        value={dish.image_url || ''}
                                        onChange={(e) =>
                                            updateDishField(dish.id, 'image_url', e.target.value)
                                        }
                                        placeholder="https://... или /local-path.webp"
                                        className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400 text-xs"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <select
                                        value={dish.category_id || ''}
                                        onChange={(e) =>
                                            updateDishField(dish.id, 'category_id', e.target.value)
                                        }
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 outline-none focus:border-amber-400"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <input
                                        type="checkbox"
                                        checked={dish.is_active}
                                        onChange={(e) =>
                                            updateDishField(dish.id, 'is_active', e.target.checked)
                                        }
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        onClick={() => handleSave(dish)}
                                        disabled={savingId === dish.id}
                                        className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 disabled:opacity-60"
                                    >
                                        {savingId === dish.id ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredDishes.length === 0 && (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-4 text-center text-neutral-400"
                                >
                                    Блюд не найдено
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
