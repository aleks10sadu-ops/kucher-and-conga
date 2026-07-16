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

describe('validateMinOrder с зоной доставки', () => {
    const freeZone = { name: 'Бесплатная доставка', price: 0, minOrder: 1000 };
    const zone300 = { name: 'Зона 300₽', price: 300, minOrder: 2000 };
    const zone600 = { name: 'Зона 600₽', price: 600, minOrder: 3000 };

    it('в бесплатной зоне действует правило 1000 ₽ или 2 ланча', () => {
        expect(validateMinOrder([dish(1000)], undefined, freeZone).isValid).toBe(true);
        expect(validateMinOrder([lunch(450, 2)], undefined, freeZone).isValid).toBe(true);
        expect(validateMinOrder([dish(900)], undefined, freeZone).isValid).toBe(false);
    });

    it('в зоне 300₽ минимум 2000 ₽', () => {
        expect(validateMinOrder([dish(2000)], undefined, zone300).isValid).toBe(true);
        const v = validateMinOrder([dish(1500)], undefined, zone300);
        expect(v.isValid).toBe(false);
        expect(v.message).toContain('Зона 300₽');
        expect(v.message).toContain((2000).toLocaleString('ru-RU'));
    });

    it('в платной зоне 2 бизнес-ланча НЕ отменяют минимум по сумме', () => {
        expect(validateMinOrder([lunch(450, 2)], undefined, zone300).isValid).toBe(false);
    });

    it('в дальних зонах минимум 3000 ₽', () => {
        expect(validateMinOrder([dish(2999)], undefined, zone600).isValid).toBe(false);
        expect(validateMinOrder([dish(3000)], undefined, zone600).isValid).toBe(true);
    });

    it('без зоны действует базовое правило (как раньше)', () => {
        expect(validateMinOrder([dish(1000)], undefined, null).isValid).toBe(true);
        expect(validateMinOrder([lunch(450, 2)], undefined, null).isValid).toBe(true);
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
