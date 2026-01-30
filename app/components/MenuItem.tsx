'use client';

import React, { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MenuItem as MenuItemType, CartItem, MenuItemVariant } from '@/types/index';
import { Database } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';


// Иконка загрузки - пульсирующий круг с анимацией
const LoadingSpinner = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800/95">
        <div className="relative">
            {/* Внешний пульсирующий круг */}
            <div className="absolute inset-0 w-10 h-10 border-2 border-amber-400/20 rounded-full animate-ping" />
            {/* Вращающийся спиннер */}
            <div className="w-10 h-10 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
    </div>
);

// Плейсхолдер для блюд без изображения - минималистичный тёмный фон
const ImagePlaceholder = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-850 to-neutral-900 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-neutral-700/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
    </div>
);

// Оптимизация URL изображений Supabase - добавляем параметры трансформации
const optimizeSupabaseImageUrl = (url: string | null | undefined, width = 400) => {
    if (!url) return null;
    // Если это Supabase Storage URL, добавляем параметры трансформации
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        // Supabase Image Transformation: ?width=400&quality=75
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}width=${width}&quality=75`;
    }
    return url;
};

type MenuItemProps = {
    item: MenuItemType;
    onAddToCart: (item: CartItem) => void;
    onItemClick?: (item: MenuItemType) => void;
    cartItems?: CartItem[];
    isAdmin?: boolean;
    editMode?: boolean;
    allCategories?: { id: string | number; name: string }[];
    priority?: boolean;
    isDeliveryAvailable?: boolean;
};

/**
 * Компонент отдельного блюда в меню
 */
export default function MenuItem({
    item,
    onAddToCart,
    onItemClick,
    cartItems = [],
    isAdmin = false,
    editMode = false,
    allCategories = [],
    priority = false,
    isDeliveryAvailable = true,
}: MenuItemProps) {
    // Получаем количество из корзины напрямую (без локального состояния)
    const cartItem = cartItems.find(ci => ci.id === item.id);
    const quantity = cartItem?.qty || 0;

    // Получаем количество вариантов из корзины
    const getVariantQuantity = (variantId: string | number) => {
        const cartVariant = cartItems.find(ci => ci.id === variantId);
        return cartVariant?.qty || 0;
    };

    // Получаем изображение блюда (только из Supabase, игнорируем Unsplash)
    const rawImageUrl = item?.image || item?.image_url || null;
    // Фильтруем Unsplash URL - они не должны показываться
    const imageUrl = rawImageUrl && !rawImageUrl.includes('unsplash.com') ? rawImageUrl : null;
    const hasImage = !!imageUrl;

    // Состояние загрузки изображения
    const [imageLoading, setImageLoading] = useState(hasImage);
    const [imageError, setImageError] = useState(false);

    // Сброс состояния при изменении изображения
    useEffect(() => {
        if (imageUrl) {
            setImageLoading(true);
            setImageError(false);
        } else {
            setImageLoading(false);
            setImageError(false);
        }
    }, [imageUrl]);

    // Проверяем, что item существует и имеет необходимые свойства
    if (!item || !item.id || !item.name) {
        return null;
    }

    // Функция для получения изображения (для корзины)
    const getItemImage = () => imageUrl || undefined;

    const handleAdd = (variant: MenuItemVariant | null = null) => {
        if (variant) {
            // Добавляем вариант
            const variantId = `${item.id}_${variant.name}`;
            const cartVariant = cartItems.find(ci => ci.id === variantId);
            const currentQty = cartVariant?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: variantId,
                name: `${item.name} (${variant.name})`,
                price: variant.price || 0,
                weight: variant.weight || item.weight || '', // Ensure fallback
                description: item.description,
                img: getItemImage(),
                qty: newQuantity
            });
        } else {
            // Добавляем основное блюдо
            const cartItem = cartItems.find(ci => ci.id === item.id);
            const currentQty = cartItem?.qty || 0;

            if (currentQty >= 99) return;

            const newQuantity = currentQty + 1;

            onAddToCart({
                id: item.id,
                name: item.name,
                price: item.price || 0,
                weight: item.weight || '',
                description: item.description,
                img: getItemImage(),
                qty: newQuantity
            });
        }
    };

    const handleRemove = (variant: MenuItemVariant | null = null) => {
        if (variant) {
            // Убираем вариант
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
                    img: getItemImage(),
                    qty: newQuantity
                });
            }
        } else {
            // Убираем основное блюдо
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
                    img: getItemImage(),
                    qty: newQuantity
                });
            }
        }
    };

    // Admin local state (inline редактирование)
    const [adminName, setAdminName] = useState(item.name);
    const [adminPrice, setAdminPrice] = useState(item.price || 0);
    const [adminWeight, setAdminWeight] = useState<string | number>(item.weight || '');
    const [adminImageUrl, setAdminImageUrl] = useState(item.image || '');
    const [adminCategoryId, setAdminCategoryId] = useState<string | number>(item.categoryId || '');
    const [adminSaving, setAdminSaving] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [deleted, setDeleted] = useState(false);

    const canEdit = isAdmin && editMode && !!item.id;

    const handleAdminSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setAdminSaving(true);
            setAdminError('');
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {

                setAdminError('Supabase не настроен');
                setAdminSaving(false);
                return;
            }
            const { error } = await supabase
                .from('dishes')
                .update({
                    name: adminName,
                    price: adminPrice,
                    weight: adminWeight ? String(adminWeight) : null,
                    image_url: adminImageUrl,
                    category_id: adminCategoryId ? String(adminCategoryId) : null,
                } as any)
                .eq('id', item.id);
            if (error) {
                setAdminError(error.message);
            }
        } catch (err: any) {
            setAdminError(String(err?.message || err));
        } finally {
            setAdminSaving(false);
        }
    };

    const handleAdminDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Удалить это блюдо?')) return;
        try {
            const supabase = createSupabaseBrowserClient();
            if (!supabase) return;
            await supabase.from('dishes').delete().eq('id', item.id);
            setDeleted(true);
        } catch {
            // игнорируем, можно добавить ошибку
        }
    };

    if (deleted) return null;

    // Обработчик клика на карточку - открывает модальное окно для ВСЕХ пользователей
    const handleCardClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractiveElement =
            target.closest('button') !== null ||
            target.closest('input') !== null ||
            target.closest('select') !== null ||
            target.closest('textarea') !== null ||
            target.closest('[role="button"]') !== null;

        if (isInteractiveElement) return;

        if (onItemClick && typeof onItemClick === 'function') {
            onItemClick(item);
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="group overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-400/30 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] flex flex-col h-full cursor-pointer"
        >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-neutral-800">
                {/* Показываем плейсхолдер если нет изображения */}
                {!hasImage && <ImagePlaceholder />}

                {/* Показываем спиннер пока изображение загружается */}
                {hasImage && imageLoading && !imageError && <LoadingSpinner />}

                {/* Показываем плейсхолдер при ошибке загрузки */}
                {hasImage && imageError && <ImagePlaceholder />}

                {/* Само изображение - оптимизированное для быстрой загрузки */}
                {hasImage && (
                    <img
                        src={optimizeSupabaseImageUrl(imageUrl, 400) || ''}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${imageLoading || imageError ? 'opacity-0' : 'opacity-100'
                            }`}
                        loading={priority ? "eager" : "lazy"}
                        // @ts-ignore
                        fetchPriority={priority ? "high" : "auto"}
                        decoding={priority ? "sync" : "async"}
                        onLoad={() => setImageLoading(false)}
                        onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                        }}
                    />
                )}
            </div>

            <div className="p-2 sm:p-3 lg:p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-1.5 sm:gap-2 lg:gap-3 mb-1.5 sm:mb-2 lg:mb-3">
                    {canEdit ? (
                        <AdminEditFields
                            adminName={adminName}
                            setAdminName={setAdminName}
                            adminPrice={adminPrice}
                            setAdminPrice={setAdminPrice}
                            adminWeight={adminWeight}
                            setAdminWeight={setAdminWeight}
                        />
                    ) : (
                        <>
                            <h4 className="text-xs sm:text-sm lg:text-lg font-semibold leading-tight flex-1">{item.name}</h4>
                            <div className="text-right flex-shrink-0">
                                <div className="text-xs sm:text-sm lg:text-lg font-bold text-amber-400 whitespace-nowrap">
                                    {item.price ? item.price.toLocaleString('ru-RU') : '0'} ₽
                                </div>
                                {item.weight && (
                                    <div className="text-[9px] sm:text-[10px] lg:text-xs text-neutral-400">{item.weight}</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Description with fixed height */}
                <div className="flex-grow mb-1.5 sm:mb-2 lg:mb-4">
                    {item.description && !canEdit && (
                        <p className="text-neutral-300 text-[10px] sm:text-xs lg:text-sm leading-relaxed line-clamp-2 h-8 sm:h-10 lg:h-16 overflow-hidden">
                            {item.description}
                        </p>
                    )}
                </div>

                {/* Варианты для блюд с вариантами */}
                {item.variants && Array.isArray(item.variants) && item.variants.length > 0 && (
                    <VariantsList
                        item={item}
                        variants={item.variants}
                        getVariantQuantity={getVariantQuantity}
                        handleAdd={handleAdd}
                        handleRemove={handleRemove}
                        isDeliveryAvailable={isDeliveryAvailable}
                    />
                )}

                {/* Кнопки управления количеством - только для блюд без вариантов */}
                {(!item.variants || !Array.isArray(item.variants) || item.variants.length === 0) && !canEdit && (
                    <div className="mt-auto">
                        <QuantityControls
                            quantity={quantity}
                            onAdd={() => handleAdd()}
                            onRemove={() => handleRemove()}
                            isDeliveryAvailable={isDeliveryAvailable}
                        />
                    </div>
                )}

                {/* Admin inline controls */}
                {canEdit && (
                    <AdminControls
                        item={item}
                        adminImageUrl={adminImageUrl}
                        setAdminImageUrl={setAdminImageUrl}
                        adminCategoryId={adminCategoryId}
                        setAdminCategoryId={setAdminCategoryId}
                        allCategories={allCategories}
                        adminError={adminError}
                        adminSaving={adminSaving}
                        onSave={handleAdminSave}
                        onDelete={handleAdminDelete}
                    />
                )}
            </div>
        </div>
    );
}

// Вспомогательные компоненты types

type AdminEditFieldsProps = {
    adminName: string;
    setAdminName: (value: string) => void;
    adminPrice: number;
    setAdminPrice: (value: number) => void;
    adminWeight: string | number;
    setAdminWeight: (value: string | number) => void;
};

function AdminEditFields({ adminName, setAdminName, adminPrice, setAdminPrice, adminWeight, setAdminWeight }: AdminEditFieldsProps) {
    return (
        <div className="flex-1 space-y-1">
            <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded px-1.5 py-1 text-[10px] sm:text-xs lg:text-sm outline-none focus:border-amber-400"
            />
            <div className="flex items-center gap-2 text-[10px] sm:text-xs lg:text-sm">
                <input
                    type="number"
                    min={0}
                    value={adminPrice}
                    onChange={(e) => setAdminPrice(Number(e.target.value || 0))}
                    className="w-20 bg-black/40 border border-white/20 rounded px-1.5 py-1 outline-none focus:border-amber-400"
                />
                <span className="text-neutral-300">₽</span>
                <input
                    value={adminWeight}
                    onChange={(e) => setAdminWeight(e.target.value)}
                    placeholder="Вес"
                    className="flex-1 bg-black/40 border border-white/20 rounded px-1.5 py-1 outline-none focus:border-amber-400 text-[10px] sm:text-xs"
                />
            </div>
        </div>
    );
}

type VariantsListProps = {
    item: MenuItemType;
    variants: MenuItemVariant[];
    getVariantQuantity: (id: string | number) => number;
    handleAdd: (variant: MenuItemVariant) => void;
    handleRemove: (variant: MenuItemVariant) => void;
    isDeliveryAvailable?: boolean;
};

function VariantsList({ item, variants, getVariantQuantity, handleAdd, handleRemove, isDeliveryAvailable = true }: VariantsListProps) {
    return (
        <div className="mb-2 sm:mb-3 lg:mb-4">
            <div className="text-[10px] sm:text-xs lg:text-sm text-neutral-400 mb-1.5 sm:mb-2 lg:mb-3">Выберите вариант:</div>
            <div className="space-y-1 sm:space-y-2 max-h-24 sm:max-h-28 lg:max-h-32 overflow-y-auto">
                {variants.map((variant, index) => {
                    const variantId = `${item.id}_${variant.name}`;
                    const variantQuantity = getVariantQuantity(variantId);
                    return (
                        <div key={index} className="flex justify-between items-center p-1.5 sm:p-2 bg-white/5 rounded-lg">
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] sm:text-xs lg:text-sm font-medium text-white truncate">
                                    {variant.name || 'Вариант'}
                                </div>
                                <div className="text-[9px] sm:text-[10px] lg:text-xs text-neutral-400">
                                    {variant.weight || item.weight}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                <span className="text-[10px] sm:text-xs lg:text-sm text-amber-400 font-semibold">
                                    {variant.price ? variant.price.toLocaleString('ru-RU') : '0'} ₽
                                </span>
                                <QuantityControls
                                    quantity={variantQuantity}
                                    onAdd={(e) => {
                                        e?.stopPropagation?.();
                                        handleAdd(variant);
                                    }}
                                    onRemove={(e) => {
                                        e?.stopPropagation?.();
                                        handleRemove(variant);
                                    }}
                                    compact
                                    isDeliveryAvailable={isDeliveryAvailable}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type QuantityControlsProps = {
    quantity: number;
    onAdd: (e?: React.MouseEvent) => void;
    onRemove: (e?: React.MouseEvent) => void;
    compact?: boolean;
    isDeliveryAvailable?: boolean;
};

function QuantityControls({ quantity, onAdd, onRemove, compact = false, isDeliveryAvailable = true }: QuantityControlsProps) {
    const buttonSize = compact ? 'p-1' : 'p-1.5 sm:p-2';
    const iconSize = compact ? 'w-3 h-3' : 'w-3 h-3 sm:w-4 sm:h-4';
    const textSize = compact ? 'w-6 text-sm' : 'w-6 sm:w-8 text-sm sm:text-base';

    if (quantity === 0) {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd(e);
                }}
                className={`${compact ? 'px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-xs' : 'px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm'} rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 ${compact ? '' : 'shadow-md hover:shadow-lg'} whitespace-nowrap`}
            >
                Добавить
            </button>
        );
    }

    if (!isDeliveryAvailable) {
        return (
            <div className={`${compact ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm'} text-neutral-400 italic`}>
                Только в зале
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(e);
                }}
                className={`${buttonSize} rounded-full border border-white/20 hover:border-amber-400/50 hover:scale-110 active:scale-95 transition-all duration-200`}
                aria-label="Убавить"
            >
                <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
            </button>
            <span className={`${textSize} text-center font-semibold`}>{quantity}</span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd(e);
                }}
                disabled={quantity >= 99}
                className={`${buttonSize} rounded-full bg-amber-400 text-black hover:bg-amber-300 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                aria-label="Добавить"
            >
                <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </div>
    );
}

type AdminControlsProps = {
    item: MenuItemType;
    adminImageUrl: string | null;
    setAdminImageUrl: (url: string) => void;
    adminCategoryId: string | number;
    setAdminCategoryId: (id: string | number) => void;
    allCategories: { id: string | number; name: string }[];
    adminError: string;
    adminSaving: boolean;
    onSave: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
};

function AdminControls({ item, adminImageUrl, setAdminImageUrl, adminCategoryId, setAdminCategoryId, allCategories, adminError, adminSaving, onSave, onDelete }: AdminControlsProps) {
    return (
        <div className="mt-2 border-t border-white/10 pt-2 space-y-2">
            <div className="text-[10px] text-neutral-400">
                ID блюда: {String(item.id).slice(0, 8)}…
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400">URL изображения</label>
                <input
                    value={adminImageUrl || ''}
                    onChange={(e) => setAdminImageUrl(e.target.value)}
                    placeholder="https://... или /local-image.webp"
                    className="w-full bg-black/40 border border-white/20 rounded px-1.5 py-1 text-[10px] outline-none focus:border-amber-400"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400">Категория</label>
                <select
                    value={adminCategoryId}
                    onChange={(e) => setAdminCategoryId(e.target.value)}
                    className="bg-black/40 border border-white/20 rounded px-1.5 py-1 text-[10px] outline-none focus:border-amber-400"
                >
                    <option value="">Без категории</option>
                    {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>
            {adminError && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1.5 py-1">
                    {adminError}
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={adminSaving}
                    className="flex-1 px-2 py-1 rounded-full bg-amber-400 text-black text-[11px] font-semibold hover:bg-amber-300 disabled:opacity-60"
                >
                    {adminSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="px-2 py-1 rounded-full bg-red-500/20 text-red-300 text-[11px] hover:bg-red-500/30"
                >
                    Удалить
                </button>
            </div>
        </div>
    );
}
