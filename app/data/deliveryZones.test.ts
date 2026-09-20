import { describe, expect, it } from 'vitest';

import { isPointInPolygon } from '../../lib/utils/geo';
import { validateMinOrder } from '../../lib/delivery/minOrder';
import { checkDeliveryZoneForCoords, deliveryZones, findZoneByKeyword, findZoneByName } from './deliveryZones';

describe('актуальные зоны доставки от 03.09.2026', () => {
    it('применяет тариф СНТ Дружба 6 внутри зоны 300 ₽', () => {
        const point = [56.41, 37.47];
        const surroundingZone = findZoneByName('Зона 300₽')!;
        expect(isPointInPolygon(point, surroundingZone.coordinates[0])).toBe(true);
        expect(checkDeliveryZoneForCoords(point)).toMatchObject({
            id: 6,
            name: 'Зона 600 - СНТ Дружба 6',
            price: 600,
            minOrder: 3000,
        });
    });

    it('сохраняет тариф 300 ₽ рядом с границей СНТ', () => {
        expect(checkDeliveryZoneForCoords([56.41, 37.49])).toMatchObject({ id: 2, price: 300, minOrder: 2000 });
    });

    it('сохраняет подробный контур бесплатной зоны, действовавший до добавления СНТ', () => {
        const freeZone = findZoneByName('Бесплатная доставка')!;
        expect(freeZone.coordinates[0]).toHaveLength(73);
        expect(freeZone.coordinates[0][0]).toEqual([56.408108, 37.495565]);
        expect(freeZone.coordinates[0].at(-1)).toEqual(freeZone.coordinates[0][0]);
        expect(checkDeliveryZoneForCoords([56.39, 37.53])).toMatchObject({ id: 1, price: 0, minOrder: 1000 });
    });

    it.each([
        [56.42, 37.515],
        [56.38, 37.57],
        [56.408, 37.5],
    ])('сохраняет платный тариф за прежней границей бесплатной зоны: %j, %j', (latitude, longitude) => {
        // Упрощённый контур из старой копии редактора ошибочно включал эти адреса.
        expect(checkDeliveryZoneForCoords([latitude, longitude])).toMatchObject({ id: 2, price: 300 });
    });

    it.each([
        [[56.30, 37.54], 2, 300],
        [[56.49, 37.60], 3, 400],
        [[56.55, 37.40], 4, 500],
        [[56.70, 37.51], 5, 600],
    ])('определяет тариф для координат %j', (point, id, price) => {
        expect(checkDeliveryZoneForCoords(point as number[])).toMatchObject({ id, price });
    });

    it('оставляет адрес за пределами всех зон недоступным для доставки', () => {
        expect(checkDeliveryZoneForCoords([55.75, 37.62])).toBeNull();
    });

    it('разрешает новое имя зоны и старое имя 200 ₽ независимо от порядка', () => {
        expect(findZoneByName('Зона 600 - СНТ Дружба 6')?.id).toBe(6);
        expect(findZoneByName('Зона 200₽')).toMatchObject({ id: 2, price: 300 });
        expect(findZoneByName('несуществующая зона')).toBeNull();
    });

    it.each([
        ['СНТ Дружба 6, участок 12', 6],
        ['СНТ Дружба-6, Центральная улица', 6],
        ['Промышленная, 20Б', 1],
        ['Внуковская, 10', 2],
        ['Ключевая, 10', 3],
        ['Солнечная, 10', 4],
        ['Богослово, 10', 5],
    ])('определяет резервный тариф для адреса %s без зависимости от порядка зон', (address, id) => {
        expect(findZoneByKeyword(address)?.id).toBe(id);
    });

    it('не принимает другое СНТ или неизвестный адрес за Дружбу 6', () => {
        expect(findZoneByKeyword('СНТ Дружба 60')).toBeNull();
        expect(findZoneByKeyword('СНТ Дружба 16')).toBeNull();
        expect(findZoneByKeyword('Неизвестный адрес')).toBeNull();
    });

    it('требует заказ от 3000 ₽ в СНТ, включая заказы с двумя бизнес-ланчами', () => {
        const zone = checkDeliveryZoneForCoords([56.41, 37.47]);
        const items = [{ id: 'bl-test', qty: 2, price: 500, isBusinessLunch: true }];
        expect(validateMinOrder(items, 2000, zone).isValid).toBe(false);
        expect(validateMinOrder(items, 3000, zone).isValid).toBe(true);
    });

    it('загружает все шесть зон с замкнутыми координатами в порядке широта, долгота', () => {
        expect(deliveryZones).toHaveLength(6);
        expect(new Set(deliveryZones.map((zone) => zone.id)).size).toBe(6);
        for (const zone of deliveryZones) {
            expect(zone.coordinates[0].at(-1)).toEqual(zone.coordinates[0][0]);
            for (const [latitude, longitude] of zone.coordinates[0]) {
                expect(latitude).toBeGreaterThan(56);
                expect(longitude).toBeLessThan(39);
            }
        }
    });
});
