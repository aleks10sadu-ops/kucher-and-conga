'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type MenuType = {
    id: string | number;
    name: string;
    slug: string;
    description?: string | null;
    created_at?: string;
};

type Category = {
    id: string | number;
    name: string;
    note?: string | null;
    menu_type_id: string | number;
    sort_order?: number;
};

type MenuTypesAndCategoriesManagerProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function MenuTypesAndCategoriesManager({ isOpen, onClose }: MenuTypesAndCategoriesManagerProps) {
    const [menuTypes, setMenuTypes] = useState<MenuType[]>([]);
    const [categories, setCategories] = useState<Record<string | number, Category[]>>({}); // { menuTypeId: [categories] }
    const [loading, setLoading] = useState(true);
    const [editingMenuType, setEditingMenuType] = useState<MenuType | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [expandedMenuTypes, setExpandedMenuTypes] = useState<Record<string | number, boolean>>({});
    const [newMenuType, setNewMenuType] = useState<{ name: string; slug: string; description: string }>({ name: '', slug: '', description: '' });
    // @ts-ignore
    const [newCategory, setNewCategory] = useState<{ name: string; note: string; menu_type_id: string | number }>({ name: '', note: '', menu_type_id: '' });

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setLoading(false);
                return;
            }

            // Загружаем типы меню
            const { data: menuTypesData, error: menuTypesError } = await supabase
                .from('menu_types')
                .select('*')
                .order('created_at', { ascending: true });

            if (menuTypesError) {
                console.error('Error loading menu types:', menuTypesError);
                setLoading(false);
                return;
            }

            setMenuTypes(menuTypesData || []);

            // Загружаем категории для каждого типа меню
            const categoriesByMenuType: Record<string | number, Category[]> = {};
            for (const menuType of menuTypesData || []) {
                const { data: categoriesData, error: categoriesError } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('menu_type_id', menuType.id)
                    .order('sort_order', { ascending: true });

                if (!categoriesError && categoriesData) {
                    categoriesByMenuType[menuType.id] = categoriesData;
                }
            }

            setCategories(categoriesByMenuType);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMenuType = async (menuType: Partial<MenuType>) => {
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            if (!menuType.name?.trim() || !menuType.slug?.trim()) {
                alert('Название и slug обязательны');
                return;
            }

            if (menuType.id) {
                // Обновление
                const { error } = await supabase
                    .from('menu_types')
                    .update({
                        name: menuType.name,
                        slug: menuType.slug,
                        description: menuType.description || null,
                    })
                    .eq('id', menuType.id);

                if (error) {
                    alert('Ошибка сохранения: ' + error.message);
                    return;
                }
            } else {
                // Создание
                const { error } = await supabase
                    .from('menu_types')
                    .insert({
                        name: menuType.name,
                        slug: menuType.slug,
                        description: menuType.description || null,
                    });

                if (error) {
                    alert('Ошибка создания: ' + error.message);
                    return;
                }
            }

            setEditingMenuType(null);
            loadData();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleDeleteMenuType = async (menuTypeId: string | number) => {
        if (!window.confirm('Удалить этот тип меню? Все категории и блюда также будут удалены.')) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error } = await supabase
                .from('menu_types')
                .delete()
                .eq('id', menuTypeId);

            if (error) {
                alert('Ошибка удаления: ' + error.message);
                return;
            }

            loadData();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleSaveCategory = async (category: Partial<Category>) => {
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            if (!category.name?.trim() || !category.menu_type_id) {
                alert('Название и тип меню обязательны');
                return;
            }

            if (category.id && category.id !== 'new') { // Assuming 'new' logic is handled by id existence check or separate logic
                // Wait, the logic below handles ID existence. If id is null/undefined, it's create.
                // But in previous code logic: if (category.id) update else insert. 
                // But when creating new category, id might be null.
            }

            if (category.id) {
                // Обновление
                const { error } = await supabase
                    .from('categories')
                    .update({
                        name: category.name,
                        note: category.note || null,
                        sort_order: category.sort_order || 0,
                    })
                    .eq('id', category.id);

                if (error) {
                    alert('Ошибка сохранения: ' + error.message);
                    return;
                }
            } else {
                // Создание
                const { error } = await supabase
                    .from('categories')
                    .insert({
                        name: category.name,
                        note: category.note || null,
                        menu_type_id: category.menu_type_id,
                        sort_order: category.sort_order || 0,
                    });

                if (error) {
                    alert('Ошибка создания: ' + error.message);
                    return;
                }
            }

            setEditingCategory(null);
            loadData();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleDeleteCategory = async (categoryId: string | number) => {
        if (!window.confirm('Удалить эту категорию? Все блюда в ней также будут удалены.')) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryId);

            if (error) {
                alert('Ошибка удаления: ' + error.message);
                return;
            }

            loadData();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const toggleMenuType = (menuTypeId: string | number) => {
        setExpandedMenuTypes(prev => ({
            ...prev,
            [menuTypeId]: !prev[menuTypeId]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-neutral-900 border-b border-white/10 p-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Управление типами меню и категориями</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-12 text-neutral-400">Загрузка...</div>
                    ) : (
                        <>
                            {/* Добавление нового типа меню */}
                            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                <h3 className="text-lg font-bold mb-3">Добавить тип меню</h3>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={newMenuType.name}
                                        onChange={(e) => setNewMenuType({ ...newMenuType, name: e.target.value })}
                                        placeholder="Название (например, Основное меню)"
                                        className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                    />
                                    <input
                                        type="text"
                                        value={newMenuType.slug}
                                        onChange={(e) => setNewMenuType({ ...newMenuType, slug: e.target.value })}
                                        placeholder="Slug (например, main)"
                                        className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                    />
                                    <input
                                        type="text"
                                        value={newMenuType.description}
                                        onChange={(e) => setNewMenuType({ ...newMenuType, description: e.target.value })}
                                        placeholder="Описание (необязательно)"
                                        className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                    />
                                    <button
                                        onClick={() => {
                                            handleSaveMenuType(newMenuType);
                                            setNewMenuType({ name: '', slug: '', description: '' });
                                        }}
                                        className="w-full px-4 py-2 rounded bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                                    >
                                        <Plus className="w-4 h-4 inline mr-2" />
                                        Добавить тип меню
                                    </button>
                                </div>
                            </div>

                            {/* Список типов меню */}
                            {menuTypes.map((menuType) => (
                                <div key={menuType.id} className="border border-white/10 rounded-lg overflow-hidden">
                                    <div className="bg-white/5 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <button
                                                onClick={() => toggleMenuType(menuType.id)}
                                                className="p-1 hover:bg-white/10 rounded"
                                            >
                                                {expandedMenuTypes[menuType.id] ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </button>
                                            {editingMenuType?.id === menuType.id ? (
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={editingMenuType.name}
                                                        onChange={(e) => setEditingMenuType({ ...editingMenuType, name: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editingMenuType.slug}
                                                        onChange={(e) => setEditingMenuType({ ...editingMenuType, slug: e.target.value })}
                                                        className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                handleSaveMenuType(editingMenuType);
                                                            }}
                                                            className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-semibold"
                                                        >
                                                            <Save className="w-3 h-3 inline mr-1" />
                                                            Сохранить
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMenuType(null)}
                                                            className="px-3 py-1 rounded bg-white/10 text-white text-xs"
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1">
                                                        <div className="font-semibold">{menuType.name}</div>
                                                        <div className="text-xs text-neutral-400">slug: {menuType.slug}</div>
                                                        {menuType.description && (
                                                            <div className="text-sm text-neutral-300 mt-1">{menuType.description}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setEditingMenuType(menuType)}
                                                            className="p-1.5 rounded hover:bg-white/10 text-amber-400"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteMenuType(menuType.id)}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Категории этого типа меню */}
                                    {expandedMenuTypes[menuType.id] && (
                                        <div className="p-4 bg-black/20 space-y-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold">Категории</h4>
                                                <button
                                                    onClick={() => {
                                                        // @ts-ignore
                                                        setEditingCategory({ id: null, name: '', note: '', menu_type_id: menuType.id, sort_order: 0 });
                                                    }}
                                                    className="px-3 py-1 rounded bg-green-500 text-white text-xs font-semibold hover:bg-green-600"
                                                >
                                                    <Plus className="w-3 h-3 inline mr-1" />
                                                    Добавить категорию
                                                </button>
                                            </div>

                                            {(categories[menuType.id] || []).map((category) => (
                                                <div key={category.id} className="p-3 bg-black/40 rounded">
                                                    {editingCategory?.id === category.id ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editingCategory.name}
                                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                                placeholder="Название категории"
                                                                className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editingCategory.note || ''}
                                                                onChange={(e) => setEditingCategory({ ...editingCategory, note: e.target.value })}
                                                                placeholder="Примечание (необязательно)"
                                                                className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        handleSaveCategory(editingCategory);
                                                                    }}
                                                                    className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-semibold"
                                                                >
                                                                    <Save className="w-3 h-3 inline mr-1" />
                                                                    Сохранить
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingCategory(null)}
                                                                    className="px-3 py-1 rounded bg-white/10 text-white text-xs"
                                                                >
                                                                    Отмена
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">{category.name}</div>
                                                                {category.note && (
                                                                    <div className="text-xs text-neutral-400 mt-1">{category.note}</div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEditingCategory(category)}
                                                                    className="p-1.5 rounded hover:bg-white/10 text-amber-400"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCategory(category.id)}
                                                                    className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Форма добавления новой категории */}
                                            {/* @ts-ignore - id is missing on new category object here which is fine as we pass null for new */}
                                            {editingCategory && !editingCategory.id && editingCategory.menu_type_id === menuType.id && (
                                                <div className="p-3 bg-black/40 rounded border border-amber-400/50">
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={editingCategory.name}
                                                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                            placeholder="Название категории"
                                                            className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingCategory.note || ''}
                                                            onChange={(e) => setEditingCategory({ ...editingCategory, note: e.target.value })}
                                                            placeholder="Примечание (необязательно)"
                                                            className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    handleSaveCategory(editingCategory);
                                                                }}
                                                                className="px-3 py-1 rounded bg-amber-400 text-black text-xs font-semibold"
                                                            >
                                                                <Save className="w-3 h-3 inline mr-1" />
                                                                Сохранить
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCategory(null)}
                                                                className="px-3 py-1 rounded bg-white/10 text-white text-xs"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
