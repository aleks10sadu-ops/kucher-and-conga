// Минимальный заказ на доставку: сумма от 1000 ₽ ИЛИ от 2 бизнес-ланчей.
// Используется в корзине (кнопка «Доставка»), в чекауте и на сервере в /api/orders.

export const MIN_ORDER_TOTAL = 1000;
export const MIN_BUSINESS_LUNCH_COUNT = 2;

export type MinOrderItem = {
    id: string | number;
    qty: number;
    price: number;
    isBusinessLunch?: boolean;
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

export function validateMinOrder(items: MinOrderItem[], subtotal?: number): MinOrderValidation {
    const total = subtotal ?? items.reduce((s, i) => s + i.qty * i.price, 0);
    const businessLunchCount = items
        .filter(isBusinessLunchItem)
        .reduce((s, i) => s + i.qty, 0);

    const isValid = total >= MIN_ORDER_TOTAL || businessLunchCount >= MIN_BUSINESS_LUNCH_COUNT;

    return {
        isValid,
        businessLunchCount,
        subtotal: total,
        message: isValid
            ? null
            : `Минимальный заказ на доставку — ${MIN_ORDER_TOTAL.toLocaleString('ru-RU')} ₽ или от ${MIN_BUSINESS_LUNCH_COUNT} бизнес-ланчей.`,
    };
}
