'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CartItem } from '@/types/index';

// Корзина живёт в localStorage: переживает переходы между страницами
// (меню → бронь с предзаказом) и синхронизируется между вкладками —
// блюда, добавленные в меню в соседней вкладке, сразу видны в форме брони.
const STORAGE_KEY = 'kucher-cart-v1';
const SYNC_EVENT = 'kucher-cart-updated';

function readStoredCart(): CartItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function useCart() {
    const [items, setItems] = useState<CartItem[]>([]);
    // Именно state, а не ref: эффект сохранения при первом прогоне должен увидеть
    // false и пропустить запись (ref выставился бы синхронно в том же коммите —
    // и пустой initial-state затёр бы сохранённую корзину).
    const [hydrated, setHydrated] = useState(false);

    // Восстановление после mount (не в инициализаторе — иначе рассинхрон гидрации)
    // + подписка на изменения из других вкладок (storage) и этой же вкладки (SYNC_EVENT).
    useEffect(() => {
        setItems(readStoredCart());
        setHydrated(true);
        const sync = () => setItems(readStoredCart());
        const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) sync(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener(SYNC_EVENT, sync);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(SYNC_EVENT, sync);
        };
    }, []);

    // Сохранение изменений; если состояние совпадает с хранилищем (пришло извне) — не эхаем.
    useEffect(() => {
        if (!hydrated) return;
        try {
            const json = JSON.stringify(items);
            if (localStorage.getItem(STORAGE_KEY) === json) return;
            localStorage.setItem(STORAGE_KEY, json);
            window.dispatchEvent(new Event(SYNC_EVENT));
        } catch { /* private mode и т.п. — корзина работает в памяти */ }
    }, [items, hydrated]);

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
