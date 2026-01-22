'use client';

import React from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, AlertCircle } from 'lucide-react';
import { CartItem } from '@/types/index';

type BusinessLunchValidation = {
    businessLunchCount: number;
    isValid: boolean;
    message?: string;
};

type CartDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    onAdd: (item: CartItem) => void;
    onDecrement: (id: string | number) => void;
    onRemove: (id: string | number) => void;
    count: number;
    total: number;
    onDeliveryClick: () => void;
    businessLunchValidation: BusinessLunchValidation;
    isMounted: boolean;
};

export default function CartDrawer({
    isOpen,
    onClose,
    items,
    onAdd,
    onDecrement,
    onRemove,
    count,
    total,
    onDeliveryClick,
    businessLunchValidation,
    isMounted
}: CartDrawerProps) {
    const canOrder = items.length > 0 &&
        (businessLunchValidation.businessLunchCount === 0 || businessLunchValidation.isValid);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50"
                    onClick={onClose}
                    aria-hidden
                />
            )}

            {/* Drawer */}
            <aside
                aria-label="Корзина"
                aria-hidden={isMounted ? (isOpen ? "false" : "true") : "true"}
                role="dialog"
                className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-l border-white/10 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                suppressHydrationWarning
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        <span className="font-semibold">Корзина</span>
                        {count > 0 && <span className="text-sm text-neutral-400">({count})</span>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 rounded hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items */}
                <div className="h-[calc(100%-230px)] overflow-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-neutral-400">
                            Ваша корзина пуста. Добавьте блюда из меню.
                        </div>
                    ) : (
                        items.map((item) => (
                            <CartItemComponent
                                key={item.id}
                                item={item}
                                onAdd={onAdd}
                                onDecrement={onDecrement}
                                onRemove={onRemove}
                            />
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4 space-y-3 bg-neutral-950">
                    <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Итого</span>
                        <span className="text-xl font-bold">{total.toLocaleString('ru-RU')} ₽</span>
                    </div>

                    {/* Предупреждение о бизнес-ланчах */}
                    {businessLunchValidation.businessLunchCount > 0 && !businessLunchValidation.isValid && (
                        <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-amber-300 text-sm font-semibold mb-1">
                                    Условия заказа бизнес-ланчей
                                </p>
                                <p className="text-amber-200/80 text-xs">
                                    {businessLunchValidation.message}
                                </p>
                                <p className="text-amber-200/60 text-xs mt-1">
                                    Бизнес-ланчей в заказе: {businessLunchValidation.businessLunchCount} |
                                    Сумма: {total.toLocaleString('ru-RU')} ₽
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            disabled={!canOrder}
                            onClick={onDeliveryClick}
                            className="w-full px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                        >
                            Доставка
                        </button>
                    </div>
                    <p className="text-[12px] text-neutral-400">
                        Оплата на месте/при получении. Администратор свяжется для подтверждения.
                    </p>
                </div>
            </aside>
        </>
    );
}

type CartItemComponentProps = {
    item: CartItem;
    onAdd: (item: CartItem) => void;
    onDecrement: (id: string | number) => void;
    onRemove: (id: string | number) => void;
};

/**
 * Элемент корзины
 */
function CartItemComponent({ item, onAdd, onDecrement, onRemove }: CartItemComponentProps) {
    return (
        <div className="flex gap-3 rounded-xl border border-white/10 p-3">
            {item.img && (
                <img
                    src={item.img}
                    alt={item.name}
                    className="h-16 w-16 object-cover rounded-lg"
                />
            )}
            <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-neutral-400">
                            {item.price.toLocaleString('ru-RU')} ₽
                        </div>
                    </div>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="p-1 rounded hover:bg-white/5"
                        aria-label="Удалить позицию"
                    >
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                    </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDecrement(item.id)}
                            className="p-2 rounded-full border border-white/20 hover:border-amber-400/50 hover:scale-110 active:scale-95 transition-all duration-200"
                            aria-label="Убавить"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <input
                            type="number"
                            min="1"
                            max="99"
                            value={item.qty}
                            onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                if (newQty > 0 && newQty <= 99) {
                                    onAdd({ ...item, qty: newQty });
                                }
                            }}
                            className="w-12 text-center bg-black/40 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-amber-400 text-sm"
                        />
                        <button
                            onClick={() => {
                                if (item.qty < 99) {
                                    onAdd({ ...item, qty: item.qty + 1 });
                                }
                            }}
                            disabled={item.qty >= 99}
                            className="p-2 rounded-full bg-amber-400 text-black hover:bg-amber-300 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Добавить"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="font-semibold">
                        {(item.qty * item.price).toLocaleString('ru-RU')} ₽
                    </div>
                </div>
            </div>
        </div>
    );
}
