'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Check, AlertCircle, Edit2, Save, X, Trash2 } from 'lucide-react';
import { businessLunchData, getTodayMenu, getDishesByType } from '../data/businessLunchData';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { BusinessLunchData, BusinessLunchDish, CartItem } from '@/types/index';

type BusinessLunchBuilderProps = {
    onAddToCart: (item: CartItem) => void;
    isAdmin?: boolean;
    enableAdminEditing?: boolean;
};

export default function BusinessLunchBuilder({
    onAddToCart,
    isAdmin = false,
    enableAdminEditing = false
}: BusinessLunchBuilderProps) {
    const [selectedSet, setSelectedSet] = useState<number | null>(null);
    const [selectedDishes, setSelectedDishes] = useState<Record<string, BusinessLunchDish>>({});
    const [selectedSide, setSelectedSide] = useState<string>('');
    const [selectedDrink, setSelectedDrink] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [editingDay, setEditingDay] = useState<string | null>(null);
    const [editingDish, setEditingDish] = useState<BusinessLunchDish | null>(null);
    // @ts-ignore - businessLunchData is from JS file
    const [businessLunchDataState, setBusinessLunchDataState] = useState<BusinessLunchData>(businessLunchData);
    const [loading, setLoading] = useState<boolean>(false);

    // Загрузка данных из Supabase
    useEffect(() => {
        if (!enableAdminEditing) return;

        const loadBusinessLunchData = async () => {
            setLoading(true);
            try {
                const supabase = createSupabaseBrowserClient() as any;
                if (!supabase) {
                    setLoading(false);
                    return;
                }

                // Загружаем сеты
                const { data: sets } = await supabase
                    .from('business_lunch_sets')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                // Загружаем блюда по дням
                const { data: dishes } = await supabase
                    .from('business_lunch_dishes')
                    .select('*')
                    .order('day_of_week', { ascending: true })
                    .order('sort_order', { ascending: true });

                // Загружаем опции (гарниры и напитки)
                const { data: options } = await supabase
                    .from('business_lunch_options')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                // Загружаем промо информацию
                const { data: promotion } = await supabase
                    .from('business_lunch_promotion')
                    .select('*')
                    .maybeSingle();

                if (sets && sets.length > 0) {
                    const updatedData = { ...businessLunchDataState };

                    // Обновляем сеты
                    updatedData.business_lunch_sets = sets.map((set: any) => ({
                        id: set.id,
                        name: set.name,
                        price: Number(set.price),
                        currency: set.currency || '₽',
                        courses: set.courses || [],
                    }));

                    // Обновляем блюда по дням
                    if (dishes && dishes.length > 0) {
                        const dishesByDay: Record<string, BusinessLunchDish[]> = {};
                        dishes.forEach((dish: any) => {
                            if (!dishesByDay[dish.day_of_week]) {
                                dishesByDay[dish.day_of_week] = [];
                            }
                            dishesByDay[dish.day_of_week].push({
                                id: dish.id,
                                category: dish.category || '',
                                name: dish.name,
                                ingredients: dish.ingredients || '',
                                type: dish.course_type,
                            });
                        });
                        updatedData.menu_by_day = dishesByDay;
                    }

                    // Обновляем опции
                    if (options && options.length > 0) {
                        const sides = options.filter((o: any) => o.option_type === 'sides').map((o: any) => o.name);
                        const drinks = options.filter((o: any) => o.option_type === 'drinks').map((o: any) => o.name);
                        if (sides.length > 0) updatedData.sides.options = sides;
                        if (drinks.length > 0) updatedData.drinks.options = drinks;
                    }

                    // Обновляем промо
                    if (promotion) {
                        updatedData.promotion = {
                            description: promotion.description || updatedData.promotion.description,
                            note: promotion.note || updatedData.promotion.note,
                            period: promotion.period || updatedData.promotion.period,
                        };
                    }

                    setBusinessLunchDataState(updatedData);
                }
            } catch (err) {
                console.error('Error loading business lunch data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadBusinessLunchData();
    }, [enableAdminEditing]);

    const todayMenu = useMemo(() => {
        // @ts-ignore
        const currentDay = getCurrentDay();
        return businessLunchDataState.menu_by_day[currentDay] || [];
    }, [businessLunchDataState]);

    // @ts-ignore
    const salads = useMemo(() => getDishesByType(todayMenu, 'САЛАТ'), [todayMenu]);
    // @ts-ignore
    const firstCourses = useMemo(() => getDishesByType(todayMenu, 'ПЕРВОЕ'), [todayMenu]);
    // @ts-ignore
    const secondCourses = useMemo(() => getDishesByType(todayMenu, 'ВТОРОЕ'), [todayMenu]);

    // Функция для получения текущего дня недели
    function getCurrentDay() {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    }

    const selectedSetData = useMemo(() => {
        return businessLunchDataState.business_lunch_sets.find(set => set.id === selectedSet);
    }, [selectedSet, businessLunchDataState]);

    // Проверка, все ли необходимые блюда выбраны
    const isComplete = useMemo(() => {
        if (!selectedSetData) return false;

        const requiredCourses = selectedSetData.courses;
        const hasAllCourses = requiredCourses.every(course => {
            if (course === 'САЛАТ') return selectedDishes['САЛАТ'];
            if (course === 'ПЕРВОЕ') return selectedDishes['ПЕРВОЕ'];
            if (course === 'ВТОРОЕ') return selectedDishes['ВТОРОЕ'];
            return false;
        });

        return hasAllCourses && selectedSide && selectedDrink;
    }, [selectedSetData, selectedDishes, selectedSide, selectedDrink]);

    const handleSetSelect = (setId: number) => {
        setSelectedSet(setId);
        setSelectedDishes({});
        setSelectedSide('');
        setSelectedDrink('');
    };

    const handleDishSelect = (courseType: string, dish: BusinessLunchDish) => {
        setSelectedDishes(prev => ({
            ...prev,
            [courseType]: dish
        }));
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        // Предотвращаем всплытие события, чтобы не закрывать конструктор
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!isComplete || !selectedSetData) return;

        const dishesList: string[] = [];
        const dishesIds: string[] = [];

        // Собираем список блюд и их ID для создания уникального идентификатора
        Object.keys(selectedDishes).sort().forEach(courseType => {
            const dish = selectedDishes[courseType];
            dishesList.push(dish.name);
            dishesIds.push(`${courseType}:${dish.name}`);
        });

        // Формируем название бизнес-ланча
        const businessLunchName = `${selectedSetData.name}: ${dishesList.join(', ')}, гарнир: ${selectedSide}, напиток: ${selectedDrink}`;

        // Формируем описание
        const description = `Бизнес-ланч:\n${dishesList.map(d => `• ${d}`).join('\n')}\nГарнир: ${selectedSide}\nНапиток: ${selectedDrink}`;

        // Создаем детерминированный ID на основе содержимого бизнес-ланча
        // Это позволит объединять одинаковые наборы в один элемент корзины
        const contentHash = `${selectedSet}_${dishesIds.join('|')}_${selectedSide}_${selectedDrink}`;
        // Создаем простой хеш из строки для использования в ID
        const hash = contentHash.split('').reduce((acc, char) => {
            const hash = ((acc << 5) - acc) + char.charCodeAt(0);
            return hash & hash;
        }, 0);
        const itemId = `business_lunch_${Math.abs(hash)}`;

        // Добавляем один элемент с указанным количеством
        // Логика корзины автоматически объединит элементы с одинаковым ID
        onAddToCart({
            id: itemId,
            name: businessLunchName,
            price: selectedSetData.price,
            weight: 'Бизнес-ланч',
            description: description,
            qty: quantity, // Добавляем указанное количество
            isBusinessLunch: true,
            setType: selectedSetData.name,
            dishes: selectedDishes,
            side: selectedSide,
            drink: selectedDrink
        });

        // НЕ сбрасываем опции конструктора, чтобы пользователь мог 
        // добавить несколько одинаковых наборов в корзину без повторного выбора
        // Все выбранные опции (блюда, гарнир, напиток, количество, набор) остаются без изменений
    };

    const currentDayName = useMemo(() => {
        const days: Record<string, string> = {
            monday: 'Понедельник',
            tuesday: 'Вторник',
            wednesday: 'Среда',
            thursday: 'Четверг',
            friday: 'Пятница',
            saturday: 'Суббота',
            sunday: 'Воскресенье'
        };
        // @ts-ignore
        const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long' });
        // @ts-ignore
        return today.charAt(0).toUpperCase() + today.slice(1);
    }, []);

    const dayNames: Record<string, string> = {
        monday: 'Понедельник',
        tuesday: 'Вторник',
        wednesday: 'Среда',
        thursday: 'Четверг',
        friday: 'Пятница',
        saturday: 'Суббота',
        sunday: 'Воскресенье'
    };

    // Функции для редактирования админами
    const handleSaveDish = async (day: string, dish: BusinessLunchDish | null, dishData: Partial<BusinessLunchDish>) => {
        if (!dishData.name?.trim() || !dishData.course_type) {
            alert('Название и тип блюда обязательны');
            return;
        }

        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            if (dish && dish.id) {
                // Обновление существующего блюда
                const { error } = await supabase
                    .from('business_lunch_dishes')
                    .update({
                        day_of_week: day,
                        category: dishData.category || null,
                        name: dishData.name,
                        ingredients: dishData.ingredients || null,
                        course_type: dishData.course_type,
                    })
                    .eq('id', dish.id);

                if (error) {
                    alert('Ошибка сохранения: ' + error.message);
                    return;
                }
            } else {
                // Создание нового блюда
                const { error } = await supabase
                    .from('business_lunch_dishes')
                    .insert({
                        day_of_week: day,
                        category: dishData.category || null,
                        name: dishData.name,
                        ingredients: dishData.ingredients || null,
                        course_type: dishData.course_type,
                    });

                if (error) {
                    alert('Ошибка создания: ' + error.message);
                    return;
                }
            }

            setEditingDish(null);
            setEditingDay(null);
            window.location.reload();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleDeleteDish = async (dishId: number | string) => {
        if (!window.confirm('Удалить это блюдо?')) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error } = await supabase
                .from('business_lunch_dishes')
                .delete()
                .eq('id', dishId);

            if (error) {
                alert('Ошибка удаления: ' + error.message);
                return;
            }

            window.location.reload();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Кнопка режима редактирования для админов */}
            {enableAdminEditing && isAdmin && (
                <div className="mb-6 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setEditMode((v) => !v)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${editMode
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-white/5 text-neutral-200 border-white/20 hover:bg-white/10'
                            }`}
                    >
                        <span>Режим редактирования бизнес-ланчей</span>
                        <span
                            className={`w-2 h-2 rounded-full ${editMode ? 'bg-green-700' : 'bg-neutral-500'
                                }`}
                        />
                    </button>
                </div>
            )}

            {/* Информация о бизнес-ланче */}
            <div className="mb-8 p-6 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Бизнес-ланч</h3>
                        <p className="text-neutral-300">{businessLunchDataState.promotion.description}</p>
                        <p className="text-amber-400 text-sm mt-1">⚠️ {businessLunchDataState.promotion.note}</p>
                        <p className="text-neutral-400 text-sm mt-1">Период: {businessLunchDataState.promotion.period}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-neutral-400 mb-2">Условия доставки:</p>
                        <p className="text-amber-400 font-semibold">{businessLunchDataState.delivery.minimum_order}</p>
                        <p className="text-neutral-300 text-sm mt-1">{businessLunchDataState.delivery.free_delivery}</p>
                    </div>
                </div>
            </div>

            {/* Режим редактирования: показываем все дни недели */}
            {editMode && isAdmin ? (
                <div className="mb-8 space-y-6">
                    {Object.entries(dayNames).map(([dayKey, dayName]) => {
                        const dayDishes = businessLunchDataState.menu_by_day[dayKey] || [];
                        // @ts-ignore
                        const daySalads = getDishesByType(dayDishes, 'САЛАТ');
                        // @ts-ignore
                        const dayFirstCourses = getDishesByType(dayDishes, 'ПЕРВОЕ');
                        // @ts-ignore
                        const daySecondCourses = getDishesByType(dayDishes, 'ВТОРОЕ');

                        return (
                            <div key={dayKey} className="p-6 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xl font-bold">{dayName}</h4>
                                    <button
                                        onClick={() => {
                                            setEditingDay(dayKey);
                                            setEditingDish({ name: '', category: '', ingredients: '', type: 'САЛАТ', course_type: 'САЛАТ' });
                                        }}
                                        className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition"
                                    >
                                        <Plus className="w-4 h-4 inline mr-1" />
                                        Добавить блюдо
                                    </button>
                                </div>

                                {/* Редактирование блюд по типам */}
                                {['САЛАТ', 'ПЕРВОЕ', 'ВТОРОЕ'].map((courseType) => {
                                    // @ts-ignore
                                    const dishes = getDishesByType(dayDishes, courseType);
                                    const courseLabel = courseType === 'САЛАТ' ? 'Салаты' : courseType === 'ПЕРВОЕ' ? 'Первые блюда' : 'Вторые блюда';

                                    return (
                                        <div key={courseType} className="mb-4">
                                            <h5 className="text-sm font-semibold text-neutral-400 mb-2">{courseLabel}</h5>
                                            <div className="space-y-2">
                                                {dishes.map((dish: BusinessLunchDish) => (
                                                    <div key={dish.id || dish.name} className="flex items-center gap-2 p-2 bg-black/40 rounded">
                                                        {editingDish?.id === dish.id && editingDay === dayKey ? (
                                                            <DishEditForm
                                                                dish={dish}
                                                                day={dayKey}
                                                                onSave={(dishData) => handleSaveDish(dayKey, dish, dishData)}
                                                                onCancel={() => {
                                                                    setEditingDish(null);
                                                                    setEditingDay(null);
                                                                }}
                                                                onDelete={() => dish.id && handleDeleteDish(dish.id)}
                                                            />
                                                        ) : (
                                                            <>
                                                                <div className="flex-1">
                                                                    <div className="font-medium">{dish.name}</div>
                                                                    {dish.ingredients && (
                                                                        <div className="text-xs text-neutral-400">{dish.ingredients}</div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingDay(dayKey);
                                                                        setEditingDish(dish);
                                                                    }}
                                                                    className="p-1.5 rounded hover:bg-white/10 text-amber-400"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {dish.id && (
                                                                    <button
                                                                        onClick={() => handleDeleteDish(dish.id!)}
                                                                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                {dishes.length === 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingDay(dayKey);
                                                            setEditingDish({ name: '', category: '', ingredients: '', type: courseType, course_type: courseType });
                                                        }}
                                                        className="w-full p-2 text-left text-sm text-neutral-400 hover:text-amber-400 border border-dashed border-white/20 rounded hover:border-amber-400/50"
                                                    >
                                                        + Добавить {courseLabel.toLowerCase()}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <>
                    {/* Меню на сегодня */}
                    <div className="mb-8 p-4 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                        <p className="text-amber-300 font-semibold">
                            Меню на сегодня ({currentDayName})
                        </p>
                    </div>
                </>
            )}

            {/* Выбор сета */}
            {!editMode && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">Выберите набор:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {businessLunchDataState.business_lunch_sets.map((set) => (
                            <button
                                key={set.id}
                                onClick={() => handleSetSelect(set.id)}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedSet === set.id
                                    ? 'border-amber-400 bg-amber-400/10'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="text-lg font-bold mb-2">{set.name}</div>
                                <div className="text-amber-400 text-xl font-bold mb-2">{set.price} {set.currency}</div>
                                <div className="text-sm text-neutral-400">
                                    {set.courses.join(' + ')}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedSetData && (
                <div className="space-y-6">
                    {/* Выбор блюд по курсам */}
                    {selectedSetData.courses.map((course) => {
                        let dishes: BusinessLunchDish[] = [];
                        let courseLabel = '';

                        if (course === 'САЛАТ') {
                            dishes = salads;
                            courseLabel = 'Салаты';
                        } else if (course === 'ПЕРВОЕ') {
                            dishes = firstCourses;
                            courseLabel = 'Первые блюда';
                        } else if (course === 'ВТОРОЕ') {
                            dishes = secondCourses;
                            courseLabel = 'Вторые блюда';
                        }

                        return (
                            <div key={course} className="p-6 bg-white/5 border border-white/10 rounded-xl">
                                <h4 className="text-lg font-bold mb-4">{courseLabel}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {dishes.map((dish, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleDishSelect(course, dish)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedDishes[course]?.name === dish.name
                                                ? 'border-amber-400 bg-amber-400/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <div className="font-semibold mb-1">{dish.name}</div>
                                                    <div className="text-sm text-neutral-400">{dish.ingredients}</div>
                                                </div>
                                                {selectedDishes[course]?.name === dish.name && (
                                                    <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Выбор гарнира */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                        <h4 className="text-lg font-bold mb-4">{businessLunchDataState.sides.description}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {businessLunchDataState.sides.options.map((side) => (
                                <button
                                    key={side}
                                    onClick={() => setSelectedSide(side)}
                                    className={`p-3 rounded-lg border-2 transition-all ${selectedSide === side
                                        ? 'border-amber-400 bg-amber-400/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {side}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Выбор напитка */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                        <h4 className="text-lg font-bold mb-4">{businessLunchDataState.drinks.description}</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {businessLunchDataState.drinks.options.map((drink) => (
                                <button
                                    key={drink}
                                    onClick={() => setSelectedDrink(drink)}
                                    className={`p-3 rounded-lg border-2 transition-all ${selectedDrink === drink
                                        ? 'border-amber-400 bg-amber-400/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {drink}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Количество и кнопка добавления */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="text-lg font-semibold">Количество:</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="p-2 rounded-full border border-white/20 hover:border-white/60 transition"
                                        disabled={quantity <= 1}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="p-2 rounded-full border border-white/20 hover:border-white/60 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-sm text-neutral-400">Итого:</div>
                                    <div className="text-2xl font-bold text-amber-400">
                                        {selectedSetData.price * quantity} {selectedSetData.currency}
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddToCart}
                                    disabled={!isComplete}
                                    className={`px-6 py-3 rounded-full font-semibold transition ${isComplete
                                        ? 'bg-amber-400 text-black hover:bg-amber-300'
                                        : 'bg-white/10 text-white/50 cursor-not-allowed'
                                        }`}
                                >
                                    {isComplete ? 'Добавить в корзину' : 'Выберите все позиции'}
                                </button>
                            </div>
                        </div>

                        {!isComplete && (
                            <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-center gap-2 text-amber-300">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm">Пожалуйста, выберите все необходимые позиции для завершения заказа</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedSetData && !editMode && (
                <div className="text-center py-12 text-neutral-400">
                    <p>Выберите набор бизнес-ланча, чтобы начать</p>
                </div>
            )}
        </div>
    );
}

// Компонент формы редактирования блюда
type DishEditFormProps = {
    dish: BusinessLunchDish;
    day: string;
    onSave: (dishData: Partial<BusinessLunchDish>) => void;
    onCancel: () => void;
    onDelete?: () => void;
};

function DishEditForm({ dish, day, onSave, onCancel, onDelete }: DishEditFormProps) {
    const [name, setName] = useState(dish.name || '');
    const [category, setCategory] = useState(dish.category || '');
    const [ingredients, setIngredients] = useState(dish.ingredients || '');
    const [courseType, setCourseType] = useState(dish.course_type || dish.type || 'САЛАТ');

    return (
        <div className="flex-1 space-y-2 p-2 bg-black/60 rounded">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название блюда"
                className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
            />
            <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Категория (необязательно)"
                className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
            />
            <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Ингредиенты (необязательно)"
                rows={2}
                className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400 resize-none"
            />
            <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded px-2 py-1 text-sm outline-none focus:border-amber-400"
            >
                <option value="САЛАТ">САЛАТ</option>
                <option value="ПЕРВОЕ">ПЕРВОЕ</option>
                <option value="ВТОРОЕ">ВТОРОЕ</option>
            </select>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onSave({ name, category, ingredients, course_type: courseType })}
                    className="flex-1 px-2 py-1 rounded bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300"
                >
                    <Save className="w-3 h-3 inline mr-1" />
                    Сохранить
                </button>
                <button
                    onClick={onCancel}
                    className="px-2 py-1 rounded bg-white/10 text-white text-xs hover:bg-white/20"
                >
                    <X className="w-3 h-3" />
                </button>
                {dish.id && onDelete && (
                    <button
                        onClick={onDelete}
                        className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs hover:bg-red-500/30"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
