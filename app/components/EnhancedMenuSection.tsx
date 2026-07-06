'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Plus } from 'lucide-react';
import { menuTypes, getActiveMenuType, setActiveMenuType } from '../data/menuTypes';
import { getFoodImage } from '../data/foodImages';
import FoodDetailModal from './FoodDetailModal';
import { Database } from '@/types/database.types';
import MenuSkeleton from './MenuSkeleton';

// Supabase row types
type MenuTypeRow = Database['public']['Tables']['menu_types']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type DishRow = Database['public']['Tables']['dishes']['Row'];

// Static data imports removed as we now fetch from Supabase
import BusinessLunchBuilder from './BusinessLunchBuilder';
import BusinessLunchConstructor from './BusinessLunchConstructor';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getMenuData } from '@/app/actions/getMenu';
import useAdminCheck from '@/lib/hooks/useAdminCheck';
import MenuItem from './MenuItem';
import { MenuItem as MenuItemType, CartItem, MenuCategory } from '@/types/index';
import BanquetMenuModal from './BanquetMenuModal';
import MenuImageGallery from './MenuImageGallery';

type EnhancedMenuSectionProps = {
    onAddToCart: (item: CartItem) => void;
    cartItems?: CartItem[];
    ssrMenuDataByType?: Record<string, { categories: MenuCategory[] }>;
    enableAdminEditing?: boolean;
};

type MenuTypeInfo = {
    id: string;
    name: string;
    description?: string;
    slug?: string;
    isDeliveryAvailable?: boolean;
};

export default function EnhancedMenuSection({
    onAddToCart,
    cartItems = [],
    ssrMenuDataByType,
    // Включать ли админ-режим редактирования (например, на /menu)
    enableAdminEditing = false,
}: EnhancedMenuSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | number>('all');
    const [selectedMenuType, setSelectedMenuType] = useState<string>('main');
    const [showFilters, setShowFilters] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItemType | any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isBanquetModalOpen, setIsBanquetModalOpen] = useState(false);
    const [menuExpanded, setMenuExpanded] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [clientMenuData, setClientMenuData] = useState<Record<string, { categories: MenuCategory[] }> | null>(null);
    const [clientMenuLoading, setClientMenuLoading] = useState(false);
    const [supabaseMenuTypes, setSupabaseMenuTypes] = useState<MenuTypeInfo[]>([]); // Типы меню из Supabase
    const [allCategories, setAllCategories] = useState<{ id: string | number; name: string }[]>([]); // Все категории для выбора при добавлении блюда
    const [allMenuDataByType, setAllMenuDataByType] = useState<Record<string, { categories: MenuCategory[] }>>({}); // Все данные меню по типам для глобального поиска

    // Используем хук для проверки админа
    const { isAdmin, loading: adminLoading } = useAdminCheck(enableAdminEditing);

    // Сохраняем ssrMenuDataByType для глобального поиска
    useEffect(() => {
        if (ssrMenuDataByType) {
            setAllMenuDataByType(ssrMenuDataByType);
        }
    }, [ssrMenuDataByType]);

    // Realtime subscriptions for dishes/categories removed — menu data now comes from
    // iiko (not Supabase dishes/categories tables) so these subscriptions are disconnected.

    // Загрузка типов меню из Supabase
    useEffect(() => {
        const loadMenuTypes = async () => {
            try {
                const supabase = createSupabaseBrowserClient();
                if (!supabase) return;

                const { data: menuTypesData, error } = await supabase
                    .from('menu_types')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (!error && menuTypesData) {
                    setSupabaseMenuTypes(menuTypesData);
                }
            } catch (err) {
                console.error('Error loading menu types:', err);
            }
        };

        loadMenuTypes();

        // Realtime синхронизация для типов меню
        const supabase = createSupabaseBrowserClient();
        if (!supabase) return;

        const menuTypesChannel = supabase
            .channel('menu-types-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'menu_types',
                },
                () => {
                    loadMenuTypes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(menuTypesChannel);
        };
    }, []);

    // Загрузка всех категорий для выбора при добавлении блюда (admin only, one-time)
    useEffect(() => {
        const loadAllCategories = async () => {
            try {
                const supabase = createSupabaseBrowserClient();
                if (!supabase) return;

                const { data: categoriesData, error } = await supabase
                    .from('categories')
                    .select('id, name, menu_type_id')
                    .order('name', { ascending: true });

                if (!error && categoriesData) {
                    setAllCategories(categoriesData);
                }
            } catch (err) {
                console.error('Error loading all categories:', err);
            }
        };

        loadAllCategories();
        // Realtime subscription for categories-changes removed — iiko is now the source of truth.
    }, []);

    // Загрузка данных через Server Action (Proxy) для обхода блокировок и ускорения
    useEffect(() => {
        if (ssrMenuDataByType) return;

        const loadMenuData = async () => {
            setClientMenuLoading(true);
            try {
                // Использование Server Action позволяет запросу идти от сервера к Supabase,
                // что обходит блокировки провайдеров (РФ) и ускоряет загрузку.
                const data = await getMenuData();

                if (data) {
                    setClientMenuData(data as any);
                    setAllMenuDataByType(data as any);
                }
            } catch (err) {
                console.error('Error loading menu data:', err);
            } finally {
                setClientMenuLoading(false);
            }
        };

        loadMenuData();
    }, [ssrMenuDataByType]);

    // Fixed ordered menu type definitions — always show in this order, filtered to keys with data.
    // 'banquet' is always included (opens modal, has no iiko data).
    const MENU_TYPE_DEFS: { id: string; name: string }[] = [
        { id: 'main', name: 'Кухня' },
        { id: 'business', name: 'Бизнес-ланч' },
        { id: 'bar', name: 'Бар' },
        { id: 'wine', name: 'Винная карта' },
        { id: 'banquet', name: 'Банкетное меню' },
    ];
    const loadedMenuData: Record<string, { categories: MenuCategory[] }> =
        (ssrMenuDataByType && Object.keys(ssrMenuDataByType).length > 0)
            ? ssrMenuDataByType
            : (clientMenuData || {});
    // banquet — модалка, bar/wine — локальные галереи страниц меню: показываем всегда, без данных iiko.
    const availableMenuTypes: MenuTypeInfo[] = MENU_TYPE_DEFS
        .filter((d) => ['banquet', 'bar', 'wine'].includes(d.id) || (loadedMenuData[d.id]?.categories?.length ?? 0) > 0)
        .map((d) => ({ id: d.id, name: d.name, isDeliveryAvailable: true }));

    // Функция для поиска блюд во всех типах меню
    const searchAllMenuTypes = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase();
        const results: any[] = [];

        // Получаем все доступные данные меню (приоритет: allMenuDataByType > ssrMenuDataByType > clientMenuData)
        const allData = allMenuDataByType && Object.keys(allMenuDataByType).length > 0
            ? allMenuDataByType
            : ssrMenuDataByType || clientMenuData || {};

        if (Object.keys(allData).length === 0 && clientMenuLoading) {
            return [];
        }

        const dataToSearch = Object.keys(allData).length > 0
            ? allData
            : {};

        // Ищем во всех типах меню
        Object.entries(dataToSearch).forEach(([menuTypeSlug, menuData]) => {
            // @ts-ignore
            if (!menuData || !menuData.categories) return;

            const menuTypeName = availableMenuTypes.find(mt => mt.id === menuTypeSlug)?.name || menuTypeSlug;

            // @ts-ignore
            menuData.categories.forEach(category => {
                // @ts-ignore
                category.items.forEach(item => {
                    const anyItem = item as any;
                    const matches =
                        item.name?.toLowerCase().includes(query) ||
                        anyItem.description?.toLowerCase().includes(query) ||
                        // @ts-ignore
                        (anyItem.ingredients && anyItem.ingredients.some((ing: any) => ing.toLowerCase().includes(query)));

                    if (matches) {
                        results.push({
                            ...item,
                            _searchMeta: {
                                menuTypeSlug,
                                menuTypeName,
                                categoryName: category.name,
                                categoryId: category.id,
                                isFromOtherMenuType: menuTypeSlug !== selectedMenuType,
                            }
                        });
                    }
                });
            });
        });

        return results;
    }, [searchQuery, allMenuDataByType, ssrMenuDataByType, clientMenuData, selectedMenuType, availableMenuTypes]);

    // Функция для получения данных меню по типу
    const getMenuDataByType = (menuType: string) => {
        // 1) Если пришли данные с сервера (Supabase) — используем их
        if (ssrMenuDataByType && ssrMenuDataByType[menuType]) {
            return ssrMenuDataByType[menuType];
        }

        // 2) Если загружены данные на клиенте — используем их
        if (clientMenuData && clientMenuData[menuType]) {
            return clientMenuData[menuType];
        }

        // 3) Иначе используем локальные статики как fallback
        switch (menuType) {
            default:
                // If data is loading, return null to show skeleton.
                // If not loading and no data, return empty object or null.
                return null;
        }
    };

    // Функция для поиска по меню (универсальная)
    const searchMenuItemsUniversal = (query: string, categories: any[]) => {
        if (!query.trim()) return categories;
        const lowerQuery = query.toLowerCase();
        return categories.map(category => ({
            ...category,
            items: category.items.filter((item: any) =>
                item.name.toLowerCase().includes(lowerQuery) ||
                (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
                (item.ingredients && item.ingredients.some((ing: string) => ing.toLowerCase().includes(lowerQuery)))
            )
        })).filter(category => category.items.length > 0);
    };

    // Фильтрация меню
    // Фильтрация меню
    const filteredMenu: any[] = useMemo(() => {
        const currentMenuData = getMenuDataByType(selectedMenuType);

        if (!currentMenuData) return [];

        let categories = currentMenuData.categories || [];

        // Поиск по тексту
        if (searchQuery.trim()) {
            categories = searchMenuItemsUniversal(searchQuery, categories);

            // Если есть результаты глобального поиска, добавляем блюда из других типов меню
            if (searchAllMenuTypes.length > 0) {
                // Группируем результаты глобального поиска по категориям
                const otherMenuTypeItems = searchAllMenuTypes.filter(item =>
                    item._searchMeta?.isFromOtherMenuType
                );

                if (otherMenuTypeItems.length > 0) {
                    // Группируем блюда из других типов меню по их категориям
                    const groupedByCategory: Record<string, any> = {};
                    otherMenuTypeItems.forEach(item => {
                        const categoryKey = `${item._searchMeta.menuTypeSlug}_${item._searchMeta.categoryId}`;
                        if (!groupedByCategory[categoryKey]) {
                            groupedByCategory[categoryKey] = {
                                id: categoryKey,
                                name: item._searchMeta.categoryName,
                                items: [],
                                _isSearchResult: true,
                            };
                        }
                        groupedByCategory[categoryKey].items.push(item);
                    });

                    // Добавляем категории с блюдами из других типов меню в начало списка
                    categories = [...Object.values(groupedByCategory), ...categories];
                }
            }
        }

        // Фильтр по категории (не применяем к результатам поиска из других типов меню)
        if (selectedCategory !== 'all') {
            categories = categories.filter((cat: any) =>
                cat.id === selectedCategory || cat._isSearchResult
            );
        }

        return categories as any[];
    }, [searchQuery, selectedCategory, selectedMenuType, searchAllMenuTypes]);


    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
    };

    const handleMenuTypeChange = (typeId: string) => {
        if (typeId === 'banquet') {
            setIsBanquetModalOpen(true);
            return;
        }
        setSelectedMenuType(typeId);
        setActiveMenuType(typeId);
        setSelectedCategory('all');
        setSearchQuery('');
    };

    // Получаем текущие данные меню для отображения категорий в фильтре
    const currentMenuDataForFilter = useMemo(() => {
        return getMenuDataByType(selectedMenuType);
    }, [selectedMenuType]);

    // Получаем все названия блюд для автодополнения
    const allDishNames = useMemo(() => {
        const currentMenuData = getMenuDataByType(selectedMenuType);
        // @ts-ignore
        const categories: any[] = currentMenuData?.categories || [];
        const names: string[] = [];
        categories.forEach(category => {
            // @ts-ignore
            category.items.forEach(item => {
                if (item.name && !names.includes(item.name)) {
                    names.push(item.name);
                }
            });
        });
        return names.sort();
    }, [selectedMenuType]);

    // Получаем предложения для автодополнения
    const suggestions = useMemo(() => {
        if (searchQuery.length < 2) return [];
        const query = searchQuery.toLowerCase();
        return allDishNames
            .filter(name => name.toLowerCase().startsWith(query))
            .slice(0, 10); // Ограничиваем до 10 предложений
    }, [searchQuery, allDishNames]);

    const handleItemClick = (item: MenuItemType) => {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsDetailModalOpen(false);
        setSelectedItem(null);
    };

    const selectedMenuTypeData = (availableMenuTypes.find(type => type.id === selectedMenuType) ||
        // @ts-ignore
        menuTypes.find(type => type.id === selectedMenuType)) as MenuTypeInfo | undefined;

    return (
        <section id="menu" className="py-8 sm:py-12 md:py-16 border-t border-white/10">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center gap-3 mb-6 md:mb-8">
                    <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider">
                        Меню ресторана
                    </h2>
                    {enableAdminEditing && !adminLoading && isAdmin && (
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    // Открываем модальное окно для добавления блюда
                                    setSelectedItem({
                                        id: 'new',
                                        name: '',
                                        description: '',
                                        price: 0,
                                        weight: '',
                                        image_url: '',
                                        categoryId: allCategories.length > 0 ? allCategories[0]?.id : (currentMenuDataForFilter?.categories?.[0]?.id || ''),
                                    } as MenuItemType);
                                    setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500 text-white border border-green-500 hover:bg-green-600 text-xs font-medium transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Добавить блюдо</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Открываем модальное окно для управления типами меню и категориями
                                    setSelectedItem({ id: 'manage-menu-types', type: 'menu-types' } as any);
                                    setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500 text-white border border-blue-500 hover:bg-blue-600 text-xs font-medium transition-all"
                            >
                                <span>Управление типами меню и категориями</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditMode(!editMode)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${editMode
                                    ? 'bg-amber-400 text-black border-amber-400'
                                    : 'bg-white/5 text-neutral-200 border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <span>Режим редактирования</span>
                                <span className={`w-2 h-2 rounded-full ${editMode ? 'bg-green-700' : 'bg-neutral-500'}`} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Выбор типа меню — скрыт когда доступен только один тип */}
                <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
                    {availableMenuTypes.length > 1 && (
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                            {availableMenuTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => handleMenuTypeChange(type.id)}
                                    className={`px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 ${selectedMenuType === type.id
                                        ? 'bg-amber-400 text-black shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                        : 'bg-white/5 text-white hover:bg-white/10 hover:border-amber-400/30 border border-white/10 hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {type.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedMenuTypeData && (
                        <div className="text-center text-neutral-400 text-sm mt-3">
                            <p>{selectedMenuTypeData.description}</p>
                        </div>
                    )}

                    {selectedMenuTypeData && selectedMenuTypeData.isDeliveryAvailable === false && (
                        <div className="mt-4 mx-auto max-w-2xl bg-amber-400/10 border border-amber-400/20 rounded-lg p-4 text-center">
                            <p className="text-amber-300 font-medium">
                                ℹ️ Блюда из этого меню доступны только при заказе в ресторане
                            </p>
                        </div>
                    )}
                </div>

                {/* Поиск и фильтры (скрыты для бизнес-ланча и галерей бара/вина) */}
                {!['business', 'bar', 'wine'].includes(selectedMenuType) && (
                    <div className="max-w-6xl mx-auto mb-8">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Поиск */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Поиск по блюдам..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowSuggestions(e.target.value.length >= 2);
                                    }}
                                    onFocus={() => {
                                        if (searchQuery.length >= 2) {
                                            setShowSuggestions(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Небольшая задержка, чтобы клик по предложению успел сработать
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-lg outline-none transition-all duration-200 text-white placeholder-neutral-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setShowSuggestions(false);
                                        }}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Автодополнение */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                        {suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setSearchQuery(suggestion);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition text-white"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Фильтр по категории */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200 min-w-[200px]"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span className="flex-1 text-left">
                                        {selectedCategory === 'all' ? 'Все категории' : currentMenuDataForFilter?.categories?.find((c: any) => c.id === selectedCategory)?.name}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showCategoryDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => {
                                                setSelectedCategory('all');
                                                setShowCategoryDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition ${selectedCategory === 'all' ? 'bg-amber-400/20 text-amber-400' : 'text-white'
                                                }`}
                                        >
                                            Все категории
                                        </button>
                                        {/* @ts-ignore */}
                                        {currentMenuDataForFilter?.categories?.map((category: any) => (
                                            <button
                                                key={category.id}
                                                onClick={() => {
                                                    setSelectedCategory(category.id);
                                                    setShowCategoryDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 hover:bg-white/5 transition ${selectedCategory === category.id ? 'bg-amber-400/20 text-amber-400' : 'text-white'
                                                    }`}
                                            >
                                                {category.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Очистить фильтры */}
                        {(searchQuery || selectedCategory !== 'all') && (
                            <div className="mt-4 text-center">
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm transition"
                                >
                                    <X className="w-3 h-3" />
                                    Очистить фильтры
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Результаты поиска */}
                {!['business', 'bar', 'wine'].includes(selectedMenuType) && searchQuery && (
                    <div className="text-center mb-6">
                        <p className="text-neutral-300">
                            Найдено {filteredMenu.reduce((total: number, cat: any) => total + cat.items.length, 0)} блюд
                            {/* @ts-ignore */}
                            {selectedCategory !== 'all' && ` в категории "${currentMenuDataForFilter?.categories?.find((c: any) => c.id === selectedCategory)?.name}"`}
                        </p>
                    </div>
                )}

                {/* Меню по категориям, галереи бара/вина или конструктор бизнес-ланча */}
                {selectedMenuType === 'bar' ? (
                    <MenuImageGallery
                        images={[1, 2, 3, 4, 5, 6, 7].map((n) => `/menu-pages/bar-${n}.webp`)}
                        alt="Барная карта"
                    />
                ) : selectedMenuType === 'wine' ? (
                    <MenuImageGallery
                        images={[1, 2].map((n) => `/menu-pages/wine-${n}.webp`)}
                        alt="Винная карта"
                    />
                ) : selectedMenuType === 'business' ? (
                    <BusinessLunchConstructor
                        sets={(loadedMenuData.business?.categories || []).flatMap((c) => c.items)}
                        onAddToCart={onAddToCart}
                    />
                ) : (
                    <div className="space-y-16">
                        {clientMenuLoading && filteredMenu.length === 0 ? (
                            <MenuSkeleton />
                        ) : filteredMenu.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🍽️</div>
                                <p className="text-neutral-400 text-lg mb-2">Блюда не найдены</p>
                                <p className="text-neutral-500 text-sm">Попробуйте изменить поисковый запрос или выберите другую категорию</p>
                            </div>
                        ) : (() => {
                            // Собираем все блюда из всех категорий
                            const allItems = filteredMenu.flatMap((category: any) =>
                                category.items.map((item: any) => ({ ...item, categoryName: category.name, categoryId: category.id }))
                            );
                            const displayedItems = menuExpanded ? allItems : allItems.slice(0, 6);
                            const hasMore = allItems.length > 6;

                            // Группируем по категориям для отображения
                            const itemsByCategory = displayedItems.reduce((acc: any, item: any) => {
                                if (!acc[item.categoryId]) {
                                    acc[item.categoryId] = {
                                        category: filteredMenu.find((c: any) => c.id === item.categoryId),
                                        items: []
                                    };
                                }
                                acc[item.categoryId].items.push(item);
                                return acc;
                            }, {});

                            // Подсчитываем глобальный индекс для приоритетной загрузки первых 6 изображений
                            let globalItemIndex = 0;

                            return (
                                <>
                                    {Object.values(itemsByCategory).map(({ category, items: categoryItems }: any) => (
                                        <div key={category.id} className="scroll-mt-24">
                                            <div className="flex items-center justify-between mb-6 sm:mb-8">
                                                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold">
                                                    {category.name}
                                                </h3>
                                                <span className="text-xs sm:text-sm text-neutral-400 bg-white/5 px-2 sm:px-3 py-1 rounded-full">
                                                    {categoryItems.length} {menuExpanded ? `из ${category.items.length}` : ''} блюд
                                                </span>
                                            </div>

                                            {category.note && (
                                                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                                                    <p className="text-amber-300 text-xs sm:text-sm">
                                                        ℹ️ {category.note}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-6">
                                                {categoryItems.map((item: any) => {
                                                    const isPriority = globalItemIndex < 6;
                                                    globalItemIndex++;
                                                    return (
                                                        <MenuItem
                                                            key={item.id}
                                                            item={item}
                                                            onAddToCart={onAddToCart}
                                                            onItemClick={handleItemClick}
                                                            cartItems={cartItems}
                                                            isAdmin={enableAdminEditing && isAdmin}
                                                            editMode={editMode}
                                                            allCategories={currentMenuDataForFilter?.categories || []} // Assuming default structure compatibility
                                                            priority={isPriority}
                                                            isDeliveryAvailable={selectedMenuTypeData?.isDeliveryAvailable ?? true}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {!menuExpanded && hasMore && (
                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => setMenuExpanded(true)}
                                                className="px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
                                            >
                                                Показать все {allItems.length} блюд
                                            </button>
                                        </div>
                                    )}
                                    {menuExpanded && hasMore && (
                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => setMenuExpanded(false)}
                                                className="px-6 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-200"
                                            >
                                                Свернуть
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Food Detail Modal */}
            {/* Модальное окно с деталями блюда */}
            <FoodDetailModal
                item={selectedItem}
                isOpen={isDetailModalOpen}
                onClose={handleCloseModal}
                onAddToCart={onAddToCart}
                cartItems={cartItems}
                isAdmin={enableAdminEditing && isAdmin}
                categories={allCategories.length > 0 ? allCategories : (currentMenuDataForFilter?.categories || []).map((c: any) => ({ id: c.id, name: c.name }))}
                onUpdate={(updatedDish) => {
                    // Обновляем данные на клиенте (в идеале нужно обновлять стейт)
                    console.log('Dish updated:', updatedDish);
                    // window.location.reload(); // Пока просто перезагружаем
                }}
                onDelete={(deletedId) => {
                    console.log('Dish deleted:', deletedId);
                    // window.location.reload();
                }}
            />

            {/* Модальное окно банкетного меню */}
            <BanquetMenuModal
                isOpen={isBanquetModalOpen}
                onClose={() => setIsBanquetModalOpen(false)}
            />
        </section>
    );
}

