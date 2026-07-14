import { describe, it, expect } from 'vitest';
import { validateMinOrder, isBusinessLunchItem } from './minOrder';

const dish = (price: number, qty = 1) => ({ id: `iiko-${price}-${qty}`, price, qty });
const lunch = (price: number, qty = 1, id = `bl-set-${price}`) => ({ id, price, qty });

describe('validateMinOrder', () => {
    it('блокирует заказ дешевле 1000 ₽ без бизнес-ланчей', () => {
        const v = validateMinOrder([dish(400), dish(300)]);
        expect(v.isValid).toBe(false);
        expect(v.message).toContain('Минимальный заказ на доставку');
    });

    it('пропускает заказ от 1000 ₽', () => {
        expect(validateMinOrder([dish(500, 2)]).isValid).toBe(true);
        expect(validateMinOrder([dish(1000)]).isValid).toBe(true);
    });

    it('пропускает 2+ бизнес-ланча даже дешевле 1000 ₽', () => {
        expect(validateMinOrder([lunch(450, 2)]).isValid).toBe(true);
        expect(validateMinOrder([lunch(450), lunch(390, 1, 'bl-set-other')]).isValid).toBe(true);
    });

    it('блокирует 1 бизнес-ланч при сумме меньше 1000 ₽', () => {
        const v = validateMinOrder([lunch(450), dish(300)]);
        expect(v.isValid).toBe(false);
        expect(v.businessLunchCount).toBe(1);
    });

    it('уважает переданный subtotal, если он есть', () => {
        expect(validateMinOrder([dish(400)], 1200).isValid).toBe(true);
    });
});

describe('isBusinessLunchItem', () => {
    it('распознаёт ланч по флагу и по префиксам id (конструктор и билдер)', () => {
        expect(isBusinessLunchItem({ id: 'x', price: 1, qty: 1, isBusinessLunch: true })).toBe(true);
        expect(isBusinessLunchItem({ id: 'bl-123-abc', price: 1, qty: 1 })).toBe(true);
        expect(isBusinessLunchItem({ id: 'business_lunch_42', price: 1, qty: 1 })).toBe(true);
        expect(isBusinessLunchItem({ id: 'iiko-guid', price: 1, qty: 1 })).toBe(false);
    });
});
