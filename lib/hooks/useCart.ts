'use client';

import { useState, useCallback, useMemo } from 'react';
import { CartItem } from '@/types/index';

export function useCart() {
    const [items, setItems] = useState<CartItem[]>([]);

    const add = useCallback((product: CartItem) => {
        setItems(prev => {
            const idx = prev.findIndex(p => p.id === product.id);
            // Если количество 0 или меньше, удаляем элемент
            if (product.qty <= 0) {
                if (idx >= 0) {
                    return prev.filter(p => p.id !== product.id);
                }
                return prev;
            }
            // Ограничиваем максимальное количество до 99
            const maxQty = Math.min(product.qty, 99);
            if (idx >= 0) {
                // Элемент уже есть в корзине - устанавливаем новое количество (не добавляем!)
                const copy = [...prev];
                copy[idx] = { ...copy[idx], qty: maxQty };
                return copy;
            }
            // Новый элемент - добавляем с указанным количеством (не более 99)
            return [...prev, { ...product, qty: maxQty || 1 }];
        });
    }, []);

    const dec = useCallback((id: string | number) => {
        setItems(prev => {
            const idx = prev.findIndex(p => p.id === id);
            if (idx < 0) return prev;
            const cur = prev[idx];
            if (cur.qty <= 1) return prev.filter(p => p.id !== id);
            const copy = [...prev];
            copy[idx] = { ...cur, qty: cur.qty - 1 };
            return copy;
        });
    }, []);

    const remove = useCallback((id: string | number) => {
        setItems(prev => prev.filter(p => p.id !== id));
    }, []);

    const clear = useCallback(() => setItems([]), []);

    const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
    const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

    return { items, add, dec, remove, clear, count, total };
}
