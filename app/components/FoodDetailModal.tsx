'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Star, Clock, Scale, Edit2, Save, Trash2, Check } from 'lucide-react';
import { BLUR_DATA_URL } from '@/lib/ui/blurPlaceholder';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadDishImage, isSupabaseStorageUrl } from '@/lib/supabase/storage';
import MenuTypesAndCategoriesManager from './MenuTypesAndCategoriesManager';
import { MenuItem, CartItem, MenuItemVariant, ModifierGroup, ModifierOption } from '@/types/index';

type FoodDetailModalProps = {
    item: MenuItem | null | { id: string; type?: string;[key: string]: any };
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: CartItem) => void;
    cartItems?: CartItem[];
    isAdmin?: boolean;
    categories?: { id: string | number; name: string }[];
    onUpdate?: (item: any) => void;
    onDelete?: (id: string | number) => void;
};

/**
 * Модальное окно с детальной информацией о блюде.
 * Доступно для ВСЕХ пользователей (не только админов).
 * Админы получают дополнительные возможности редактирования.
 */
export default function FoodDetailModal({
    item,
    isOpen,
    onClose,
    onAddToCart,
    cartItems = [],
    isAdmin = false,
    categories = [],
    onUpdate,
    onDelete
}: FoodDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item?.name || '');
    const [editDescription, setEditDescription] = useState(item?.description || '');
    const [editPrice, setEditPrice] = useState(item?.price || 0);
    const [editWeight, setEditWeight] = useState(item?.weight || '');
    const [editImageUrl, setEditImageUrl] = useState(item?.image_url || item?.image || '');
    const [editCategoryId, setEditCategoryId] = useState(item?.category_id || item?.categoryId || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deleted, setDeleted] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Получаем правильное изображение (фильтруем Unsplash)
    // Вычисляем это здесь, так как оно используется в useState ниже
    const rawDisplayImage = editImageUrl || item?.image_url || item?.image || null;
    const displayImage = rawDisplayImage && !rawDisplayImage.includes('unsplash.com') ? rawDisplayImage : null;
    const hasDisplayImage = !!displayImage;

    // Состояние ошибки загрузки (blur-плейсхолдер next/image показывается сам)
    const [modalImageError, setModalImageError] = useState(false);

    useEffect(() => {
        setModalImageError(false);
    }, [displayImage]);

    useEffect(() => {
        if (item) {
            setEditName(item.name || '');
            setEditDescription(item.description || '');
            setEditPrice(item.price || 0);
            setEditWeight(item.weight || '');
            setEditImageUrl(item.image_url || item.image || '');
            setEditCategoryId(item.category_id || item.categoryId || '');
            // Если это новое блюдо, сразу открываем режим редактирования
            setIsEditing(item.id === 'new');
            setError('');
        }
    }, [item, isAdmin]);

    // --- Выбираемые модификаторы (гарнир/соус/мясо на выбор и т.п.) ---
    const modifierGroups: ModifierGroup[] = ((item as any)?.modifierGroups as ModifierGroup[]) || [];
    const hasModifiers = modifierGroups.length > 0;
    const [modSel, setModSel] = useState<Record<string, string[]>>({});

    // Предвыбор первой опции для обязательных одиночных групп при смене блюда
    useEffect(() => {
        const init: Record<string, string[]> = {};
        for (const g of (((item as any)?.modifierGroups as ModifierGroup[]) || [])) {
            if ((g.min ?? 0) > 0 && (g.max ?? 1) <= 1 && g.options[0]) {
                init[g.id] = [g.options[0].id];
            }
        }
        setModSel(init);
    }, [item]);

    const cleanOptName = (n: string) => String(n).replace(/^[-–—]\s*/, '');

    const toggleMod = (g: ModifierGroup, optId: string) => {
        setModSel((prev) => {
            const cur = prev[g.id] || [];
            const single = (g.max ?? 1) <= 1;
            if (single) return { ...prev, [g.id]: [optId] };
            if (cur.includes(optId)) return { ...prev, [g.id]: cur.filter((x) => x !== optId) };
            if (cur.length >= (g.max ?? 99)) return prev; // достигнут максимум
            return { ...prev, [g.id]: [...cur, optId] };
        });
    };

    const selectedModOptions: ModifierOption[] = modifierGroups.flatMap((g) =>
        (modSel[g.id] || []).map((oid) => g.options.find((o) => o.id === oid)).filter(Boolean) as ModifierOption[]
    );
    const modsExtraPrice = selectedModOptions.reduce((s, o) => s + (o.price || 0), 0);
    const modsLabel = selectedModOptions.map((o) => cleanOptName(o.name)).join(', ');
    const modsKey = modifierGroups.flatMap((g) => modSel[g.id] || []).join('-');

    // Структурные модификаторы для корзины/Telegram: { group, option }
    const selectedModifiers = modifierGroups.flatMap((g) =>
        (modSel[g.id] || [])
            .map((oid) => g.options.find((o) => o.id === oid))
            .filter(Boolean)
            .map((o) => ({
                group: cleanOptName(g.name),
                option: cleanOptName((o as any).name),
                groupId: String(g.id),
                optionId: String((o as any).id),
            }))
    );
    const requiredUnmet = modifierGroups.filter((g) => (g.min ?? 0) > 0 && (modSel[g.id]?.length ?? 0) < (g.min ?? 0));
    const modsValid = requiredUnmet.length === 0;

    // Если это управление типами меню и категориями
    if (item?.id === 'manage-menu-types' && item?.type === 'menu-types') {
        return <MenuTypesAndCategoriesManager isOpen={isOpen} onClose={onClose} />;
    }

    if (!isOpen || !item || deleted) return null;

    // Получаем количество из корзины напрямую
    const cartItem = cartItems.find(ci => ci.id === item.id);
    const quantity = cartItem?.qty || 0;

    // Получаем количество вариантов из корзины
    const getVariantQuantity = (variantId: string | number) => {
        const cartVariant = cartItems.find(ci => ci.id === variantId);
        return cartVariant?.qty || 0;
    };

    // Функция для проверки валидности UUID
    const isValidUUID = (str: any) => {
        if (!str || typeof str !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    };

    const handleSave = async () => {
        if (!item.id) return;
        setSaving(true);
        setError('');
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setError('Supabase не настроен');
                setSaving(false);
                return;
            }

            // Проверка валидности данных
            if (!editName.trim()) {
                setError('Название блюда обязательно');
                setSaving(false);
                return;
            }
            if (editPrice <= 0) {
                setError('Цена должна быть больше 0');
                setSaving(false);
                return;
            }
            if (!editCategoryId) {
                setError('Необходимо выбрать категорию');
                setSaving(false);
                return;
            }

            // Валидация UUID для category_id
            if (!isValidUUID(editCategoryId)) {
                setError('Неверный формат категории. Пожалуйста, выберите категорию из списка.');
                setSaving(false);
                return;
            }

            // Если это новое блюдо (id === 'new')
            if (item.id === 'new') {
                const { data: newDish, error: insertError } = await supabase
                    .from('dishes')
                    .insert({
                        name: editName,
                        description: editDescription,
                        price: editPrice,
                        weight: editWeight,
                        image_url: editImageUrl,
                        category_id: editCategoryId,
                        is_active: true,
                    })
                    .select()
                    .single();

                if (insertError) {
                    setError(insertError.message);
                    setSaving(false);
                    return;
                }

                setIsEditing(false);
                if (onUpdate) {
                    onUpdate(newDish);
                }
                // Перезагружаем страницу для обновления данных
                window.location.reload();
                return;
            }

            // Обновление существующего блюда
            // Валидация UUID для category_id (если указан)
            const categoryIdToUpdate = editCategoryId && isValidUUID(editCategoryId) ? editCategoryId : null;

            const { error: updateError } = await supabase
                .from('dishes')
                .update({
                    name: editName,
                    description: editDescription,
                    price: editPrice,
                    weight: editWeight,
                    image_url: editImageUrl,
                    category_id: categoryIdToUpdate,
                })
                .eq('id', item.id);

            if (updateError) {
                setError(updateError.message);
                setSaving(false);
                return;
            }

            setIsEditing(false);
            if (onUpdate) {
                onUpdate({
                    ...item,
                    name: editName,
                    description: editDescription,
                    price: editPrice,
                    weight: editWeight,
                    image_url: editImageUrl,
                    category_id: editCategoryId,
                });
            }
            // Перезагружаем страницу для обновления данных
            window.location.reload();
        } catch (err: any) {
            setError(String(err?.message || err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!item.id || !window.confirm('Удалить это блюдо?')) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error: deleteError } = await supabase
                .from('dishes')
                .delete()
                .eq('id', item.id);

            if (deleteError) {
                setError(deleteError.message);
                return;
            }

            setDeleted(true);
            if (onDelete) {
                onDelete(item.id);
            }
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 500);
        } catch (err: any) {
            setError(String(err?.message || err));
        }
    };



    const handleAdd = (variant: MenuItemVariant | null = null) => {
        if (variant) {
            const variantId = `${item.id}_${variant.name}`;
            const cartVariant = cartItems.find(ci => ci.id === variantId);
            const currentQty = cartVariant?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: variantId,
                name: `${item.name} (${variant.name})`,
                price: variant.price || 0,
                weight: variant.weight || item.weight || '',
                description: item.description,
                img: displayImage,
                qty: newQuantity
            });
        } else {
            // Если у блюда есть модификаторы — учитываем выбор в id/названии/цене
            if (hasModifiers && !modsValid) return;
            const cartId = hasModifiers && modsKey ? `${item.id}__${modsKey}` : item.id;
            const cartPrice = (item.price || 0) + (hasModifiers ? modsExtraPrice : 0);

            const cartItem = cartItems.find(ci => ci.id === cartId);
            const currentQty = cartItem?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: cartId,
                name: item.name, // базовое имя; идентичность держит cartId с modsKey
                price: cartPrice,
                weight: item.weight || '',
                description: item.description,
                img: displayImage,
                qty: newQuantity,
                productId: String(item.id),
                modifiers: hasModifiers ? selectedModifiers : undefined,
            });
        }
    };

    const handleRemove = (variant: MenuItemVariant | null = null) => {
        if (variant) {
            const variantId = `${item.id}_${variant.name}`;
            const cartVariant = cartItems.find(ci => ci.id === variantId);
            const currentQty = cartVariant?.qty || 0;

            if (currentQty > 0) {
                const newQuantity = currentQty - 1;

                onAddToCart({
                    id: variantId,
                    name: `${item.name} (${variant.name})`,
                    price: variant.price || 0,
                    weight: variant.weight || item.weight || '',
                    description: item.description,
                    img: displayImage,
                    qty: newQuantity
                });
            }
        } else {
            const cartItem = cartItems.find(ci => ci.id === item.id);
            const currentQty = cartItem?.qty || 0;

            if (currentQty > 0) {
                const newQuantity = currentQty - 1;

                onAddToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price || 0,
                    weight: item.weight || '',
                    description: item.description,
                    img: displayImage,
                    qty: newQuantity
                });
            }
        }
    };

    const displayName = isEditing ? editName : item.name;
    const displayDescription = isEditing ? editDescription : (item.description || 'Описание блюда будет добавлено в ближайшее время.');
    const displayPrice = isEditing ? editPrice : (item.price || 0);
    const displayWeight = isEditing ? editWeight : item.weight;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-950 rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3 flex-1">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-2xl font-bold outline-none focus:border-amber-400"
                                placeholder="Название блюда"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold">{item.name}</h2>
                        )}
                        {isAdmin && !isEditing && item.id !== 'new' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-full hover:bg-white/10 transition text-amber-400"
                                aria-label="Редактировать"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        )}
                        {isAdmin && item.id === 'new' && (
                            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">Новое блюдо</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && isEditing && (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editName.trim()}
                                    className="p-2 rounded-full bg-amber-400 text-black hover:bg-amber-300 transition disabled:opacity-50"
                                    aria-label="Сохранить"
                                >
                                    <Save className="w-5 h-5" />
                                </button>
                                {item.id !== 'new' && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
                                        aria-label="Удалить"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setError('');
                                        // Восстанавливаем значения
                                        setEditName(item.name || '');
                                        setEditDescription(item.description || '');
                                        setEditPrice(item.price || 0);
                                        setEditWeight(item.weight || '');
                                        setEditImageUrl(item.image_url || item.image || '');
                                        setEditCategoryId(item.category_id || item.categoryId || '');
                                    }}
                                    className="p-2 rounded-full hover:bg-white/10 transition"
                                    aria-label="Отмена"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        {!isEditing && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/10 transition"
                                aria-label="Закрыть"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    {error && (
                        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                        {/* Image */}
                        <div className="space-y-4">
                            <div className="aspect-square rounded-xl overflow-hidden bg-neutral-800 relative">
                                {/* Плейсхолдер если нет изображения */}
                                {!hasDisplayImage && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                        <div className="text-center p-8">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-700 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-neutral-500">Изображение отсутствует</span>
                                        </div>
                                    </div>
                                )}

                                {/* Плейсхолдер при ошибке */}
                                {hasDisplayImage && modalImageError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                        <div className="text-center p-8">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-700 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm text-neutral-500">Ошибка загрузки</span>
                                        </div>
                                    </div>
                                )}

                                {/* Само изображение — оптимизируется Next.js (ресайз + WebP/AVIF + edge-кэш),
                                    с мгновенным blur-плейсхолдером пока грузится */}
                                {hasDisplayImage && !modalImageError && (
                                    <Image
                                        src={displayImage}
                                        alt={displayName}
                                        fill
                                        quality={80}
                                        sizes="(max-width: 1024px) 90vw, 800px"
                                        placeholder="blur"
                                        blurDataURL={BLUR_DATA_URL}
                                        className="object-cover"
                                        onError={() => setModalImageError(true)}
                                    />
                                )}
                            </div>
                            {isEditing && (
                                <div className="space-y-2">
                                    <label className="block text-sm text-neutral-300">Изображение блюда</label>

                                    {/* Загрузка файла */}
                                    <div className="space-y-2">
                                        <label className="block cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    // Проверяем размер файла (макс 5MB)
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        setError('Размер файла не должен превышать 5MB');
                                                        return;
                                                    }

                                                    setUploadingImage(true);
                                                    setError('');

                                                    try {
                                                        // Создаем preview
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setImagePreview(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);

                                                        // Загружаем в Supabase Storage
                                                        const dishId = item.id && item.id !== 'new' ? String(item.id) : 'temp';
                                                        const uploadedUrl = await uploadDishImage(file, dishId);
                                                        setEditImageUrl(uploadedUrl);
                                                        setImagePreview(null); // Очищаем preview после загрузки
                                                    } catch (err: any) {
                                                        setError(`Ошибка загрузки изображения: ${err.message}`);
                                                        setImagePreview(null);
                                                    } finally {
                                                        setUploadingImage(false);
                                                    }
                                                }}
                                                className="hidden"
                                                disabled={uploadingImage}
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-sm text-neutral-300 hover:bg-black/60 transition text-center pointer-events-none">
                                                    {uploadingImage ? 'Загрузка...' : '📤 Загрузить изображение'}
                                                </div>
                                            </div>
                                        </label>

                                        {/* Preview загружаемого изображения */}
                                        {imagePreview && (
                                            <div className="mt-2 p-2 bg-white/5 rounded-lg">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-32 object-cover rounded"
                                                />
                                            </div>
                                        )}

                                        {/* Или ввести URL вручную */}
                                        <div className="text-xs text-neutral-400 text-center">или</div>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            placeholder="Введите URL изображения (https://... или /local-image.webp)"
                                            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-amber-400 text-sm"
                                        />
                                        {editImageUrl && (
                                            <div className="text-xs text-neutral-500">
                                                {isSupabaseStorageUrl(editImageUrl) ? '✓ Изображение в Supabase Storage' : 'Внешний URL'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Price and Weight */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-4">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(Number(e.target.value || 0))}
                                                className="w-32 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-2xl font-bold text-amber-400 outline-none focus:border-amber-400"
                                            />
                                            <span className="text-2xl font-bold text-amber-400">₽</span>
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold text-amber-400">
                                            {displayPrice.toLocaleString('ru-RU')} ₽
                                        </div>
                                    )}
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editWeight}
                                            onChange={(e) => setEditWeight(e.target.value)}
                                            placeholder="Вес"
                                            className="w-24 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-neutral-400 outline-none focus:border-amber-400 text-sm"
                                        />
                                    ) : (
                                        displayWeight && (
                                            <div className="flex items-center gap-1 text-neutral-400">
                                                <Scale className="w-4 h-4" />
                                                <span>{displayWeight}</span>
                                            </div>
                                        )
                                    )}
                                </div>
                                {!isEditing && (
                                    <div className="flex items-center gap-1 text-amber-400">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="text-sm font-medium">Рекомендуем</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-6">
                            {/* Description */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Описание</h3>
                                {isEditing ? (
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={4}
                                        className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-neutral-300 leading-relaxed outline-none focus:border-amber-400 resize-none"
                                        placeholder="Описание блюда"
                                    />
                                ) : (
                                    <p className="text-neutral-300 leading-relaxed">
                                        {displayDescription}
                                    </p>
                                )}
                            </div>

                            {/* КБЖУ — пищевая ценность (на 100 г) */}
                            {!isEditing && (item as any).nutrition && (() => {
                                const n = (item as any).nutrition;
                                const cells = [
                                    { label: 'Ккал', value: n.calories != null ? Math.round(n.calories) : null },
                                    { label: 'Белки', value: n.proteins },
                                    { label: 'Жиры', value: n.fats },
                                    { label: 'Углеводы', value: n.carbs },
                                ].filter((c) => c.value != null);
                                if (!cells.length) return null;
                                return (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">
                                            Пищевая ценность <span className="text-sm font-normal text-neutral-500">на 100 г</span>
                                        </h3>
                                        <div className="grid grid-cols-4 gap-2">
                                            {cells.map((c) => (
                                                <div key={c.label} className="bg-white/5 rounded-lg p-3 text-center">
                                                    <div className="text-base lg:text-lg font-bold text-amber-400">{c.value}</div>
                                                    <div className="text-[11px] lg:text-xs text-neutral-400 mt-0.5">{c.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Выбираемые модификаторы (гарнир/соус/мясо на выбор и т.п.) */}
                            {!isEditing && item.id !== 'new' && hasModifiers && (
                                <div className="space-y-5">
                                    {modifierGroups.map((g) => {
                                        const single = (g.max ?? 1) <= 1;
                                        const sel = modSel[g.id] || [];
                                        const required = (g.min ?? 0) > 0;
                                        return (
                                            <div key={g.id}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-base font-semibold">{cleanOptName(g.name)}</h3>
                                                    {required ? (
                                                        <span className="text-[11px] text-amber-400 bg-amber-400/10 rounded px-2 py-0.5">обязательно</span>
                                                    ) : (
                                                        <span className="text-[11px] text-neutral-500">не обязательно</span>
                                                    )}
                                                    {!single && <span className="text-[11px] text-neutral-500">можно до {g.max}</span>}
                                                </div>
                                                <div className="space-y-2">
                                                    {g.options.map((opt) => {
                                                        const checked = sel.includes(opt.id);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => toggleMod(g, opt.id)}
                                                                className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition ${checked ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                                            >
                                                                <span className="flex items-center gap-3">
                                                                    <span className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${single ? 'rounded-full' : 'rounded'} border ${checked ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/30'}`}>
                                                                        {checked && <Check className="w-3.5 h-3.5" />}
                                                                    </span>
                                                                    <span className="text-sm text-white">{cleanOptName(opt.name)}</span>
                                                                </span>
                                                                {opt.price > 0 && (
                                                                    <span className="text-amber-400 text-sm font-medium whitespace-nowrap">+{opt.price} ₽</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Добавить в корзину — для блюд с модификаторами */}
                            {hasModifiers && !isEditing && item.id !== 'new' && (
                                <div className="pt-4 border-t border-white/10">
                                    {!modsValid && (
                                        <p className="text-amber-300 text-sm mb-3">
                                            Выберите: {requiredUnmet.map((g) => cleanOptName(g.name)).join(', ')}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => handleAdd()}
                                        disabled={!modsValid}
                                        className="w-full px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Добавить в корзину — {((item.price || 0) + modsExtraPrice).toLocaleString('ru-RU')} ₽
                                    </button>
                                </div>
                            )}

                            {/* Category (only in edit mode) */}
                            {isEditing && categories.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Категория</h3>
                                    <select
                                        value={editCategoryId}
                                        onChange={(e) => setEditCategoryId(e.target.value)}
                                        className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-neutral-300 outline-none focus:border-amber-400"
                                    >
                                        <option value="">Без категории</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Variants */}
                            {item.variants && Array.isArray(item.variants) && item.variants.length > 0 && !isEditing && item.id !== 'new' && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Варианты</h3>
                                    <div className="space-y-3">
                                        {item.variants.map((variant, index) => {
                                            const variantId = `${item.id}_${variant.name}`;
                                            const variantQuantity = getVariantQuantity(variantId);
                                            return (
                                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-white">{variant.name}</div>
                                                        <div className="text-sm text-neutral-400">{variant.weight || item.weight}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-amber-400 font-semibold">
                                                            {variant.price ? variant.price.toLocaleString('ru-RU') : '0'} ₽
                                                        </span>
                                                        {variantQuantity === 0 ? (
                                                            <button
                                                                onClick={() => handleAdd(variant)}
                                                                className="px-4 py-2 text-sm rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                                                            >
                                                                Добавить
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleRemove(variant)}
                                                                    className="p-2 rounded-full border border-white/20 hover:border-white/60 transition"
                                                                    aria-label="Убавить"
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <span className="w-8 text-center font-semibold">{variantQuantity}</span>
                                                                <button
                                                                    onClick={() => handleAdd(variant)}
                                                                    disabled={variantQuantity >= 99}
                                                                    className="p-2 rounded-full bg-amber-400 text-black hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    aria-label="Добавить"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Add to Cart - only for items without variants/modifiers and not in edit mode, and not new items */}
                            {(!item.variants || !Array.isArray(item.variants) || item.variants.length === 0) && !hasModifiers && !isEditing && item.id !== 'new' && (
                                <div className="pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold">Добавить в корзину</span>
                                        {quantity === 0 ? (
                                            <button
                                                onClick={() => handleAdd()}
                                                className="px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition"
                                            >
                                                Добавить
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleRemove()}
                                                    className="p-3 rounded-full border border-white/20 hover:border-white/60 transition"
                                                    aria-label="Убавить"
                                                >
                                                    <Minus className="w-5 h-5" />
                                                </button>
                                                <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                                                <button
                                                    onClick={() => handleAdd()}
                                                    disabled={quantity >= 99}
                                                    className="p-3 rounded-full bg-amber-400 text-black hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label="Добавить"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Additional Info */}
                            {!isEditing && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <Clock className="w-4 h-4" />
                                        <span>Время приготовления: 15-25 мин</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                                        <Star className="w-4 h-4" />
                                        <span>Популярное блюдо</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
