// Минимальный заказ на доставку зависит от зоны:
// — Бесплатная зона (или зона ещё не определена): от 1000 ₽ ИЛИ от 2 бизнес-ланчей.
// — Платные зоны: от суммы zone.minOrder (2000 ₽ для зоны 300₽, 3000 ₽ для остальных),
//   исключение с бизнес-ланчами там не действует.
// Используется в корзине (кнопка «Доставка»), в чекауте и на сервере в /api/orders.

export const MIN_ORDER_TOTAL = 1000;
export const MIN_BUSINESS_LUNCH_COUNT = 2;

export type MinOrderItem = {
    id: string | number;
    qty: number;
    price: number;
    isBusinessLunch?: boolean;
};

// Зона может прийти из app/data/deliveryZones (клиент и сервер);
// здесь нужен только минимум полей, чтобы не тянуть полигоны в тесты.
export type MinOrderZone = {
    name: string;
    price: number;
    minOrder: number;
};

export type MinOrderValidation = {
    isValid: boolean;
    businessLunchCount: number;
    subtotal: number;
    message: string | null;
};

// Флаг isBusinessLunch теряется при сериализации заказа на сервер,
// поэтому дублируем проверку по стабильным префиксам id из конструкторов ланчей.
export function isBusinessLunchItem(item: MinOrderItem): boolean {
    if (item.isBusinessLunch === true) return true;
    const id = String(item.id);
    return id.startsWith('bl-') || id.startsWith('business_lunch_');
}

export function validateMinOrder(
    items: MinOrderItem[],
    subtotal?: number,
    zone?: MinOrderZone | null,
): MinOrderValidation {
    const total = subtotal ?? items.reduce((s, i) => s + i.qty * i.price, 0);
    const businessLunchCount = items
        .filter(isBusinessLunchItem)
        .reduce((s, i) => s + i.qty, 0);

    const paidZone = !!zone && zone.price > 0;
    const required = zone ? zone.minOrder : MIN_ORDER_TOTAL;
    // Исключение «от 2 бизнес-ланчей» действует только в бесплатной зоне
    // (и пока зона не определена — финальную проверку делает сервер).
    const lunchException = !paidZone && businessLunchCount >= MIN_BUSINESS_LUNCH_COUNT;

    const isValid = total >= required || lunchException;

    const message = isValid
        ? null
        : paidZone
            ? `В зоне «${zone!.name}» минимальный заказ на доставку — ${required.toLocaleString('ru-RU')} ₽ (без учёта стоимости доставки).`
            : `Минимальный заказ на доставку — ${MIN_ORDER_TOTAL.toLocaleString('ru-RU')} ₽ или от ${MIN_BUSINESS_LUNCH_COUNT} бизнес-ланчей.`;

    return {
        isValid,
        businessLunchCount,
        subtotal: total,
        message,
    };
}
