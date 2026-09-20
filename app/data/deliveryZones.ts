import { isPointInPolygon } from '../../lib/utils/geo';
import zonesGeoJson from './delivery-zones.json';

export type DeliveryZone = {
    id: number;
    name: string;
    price: number;
    /** Минимальная сумма заказа (по позициям, без стоимости доставки) для этой зоны. */
    minOrder: number;
    coordinates: number[][][];
    color?: string;
    opacity?: number;
};

// Пять прежних зон сайта сохранены; 03.09.2026 добавлена только СНТ Дружба 6.
// В старой копии редактора бесплатная зона была упрощена — её контур не используем.
// Меньшие зоны идут первыми.
// Этот порядок используется и при расчёте тарифа, и при отрисовке вложенных зон.
// GeoJSON хранит [долгота, широта], Яндекс-карты и расчёт — [широта, долгота].
export const deliveryZones: DeliveryZone[] = zonesGeoJson.features.map((feature) => ({
    ...feature.properties,
    coordinates: feature.geometry.coordinates.map((ring) =>
        ring.map(([longitude, latitude]) => [latitude, longitude]),
    ),
}));

export function checkDeliveryZoneForCoords(coords: number[]): DeliveryZone | null {
    return deliveryZones.find((zone) => isPointInPolygon(coords, zone.coordinates[0])) ?? null;
}

// Старые вкладки могут передать прежнее название ближней платной зоны.
export function findZoneByName(name?: string | null): DeliveryZone | null {
    if (!name) return null;
    const currentName = name === 'Зона 200₽' ? 'Зона 300₽' : name;
    return deliveryZones.find((zone) => zone.name === currentName) ?? null;
}

// Резервное определение тарифа, пока геокодер недоступен.
// Имена не зависят от порядка полигонов в новом экспорте.
export function findZoneByKeyword(address: string): DeliveryZone | null {
    const a = address.toLowerCase();
    if (/дружба[\s-]*6(?:$|[\s,.;"»])/.test(a)) return findZoneByName('Зона 600 - СНТ Дружба 6');
    if (/промышленная|загорская|московская/.test(a)) return findZoneByName('Бесплатная доставка');
    if (/внуковская|кропоткинская|туполева/.test(a)) return findZoneByName('Зона 300₽');
    if (/ключевая|лобненская|ольявидово/.test(a)) return findZoneByName('Зона 400₽');
    if (/солнечная|юбилейная|габово/.test(a)) return findZoneByName('Зона 500₽');
    if (/центральная|богослово|жуково/.test(a)) return findZoneByName('Зона 600₽');
    return null;
}
