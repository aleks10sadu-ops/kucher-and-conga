'use client';

// Мини-карта зон доставки для чекаута: полигоны зон, метка ресторана,
// метка выбранного адреса. Гость может кликнуть по карте — точка
// геокодируется обратно в адрес и передаётся наверх вместе с зоной.

import React, { useEffect, useRef, useState } from 'react';
import { deliveryZones, checkDeliveryZoneForCoords, type DeliveryZone } from '../data/deliveryZones';

declare global {
    interface Window {
        ymaps: any;
    }
}

const YMAPS_SRC = 'https://api-maps.yandex.ru/2.1/?apikey=058ef9d4-8dac-4162-a855-b1e7cf0878ef&lang=ru_RU&load=package.full';

// Координаты ресторана (Промышленная улица, 20Б)
const RESTAURANT_COORDS = [56.390656, 37.527282];

// Загрузка Yandex Maps API один раз на страницу.
function loadYmaps(): Promise<any> {
    return new Promise((resolve, reject) => {
        const w = window as Window;
        if (w.ymaps?.Map) {
            resolve(w.ymaps);
            return;
        }
        const onReady = () => w.ymaps.ready(() => resolve(w.ymaps));
        const existing = document.querySelector<HTMLScriptElement>('script[src*="api-maps.yandex.ru"]');
        if (existing) {
            // Скрипт уже вставлен (например, чекаутом) — ждём готовности API.
            const poll = setInterval(() => {
                if (w.ymaps?.ready) {
                    clearInterval(poll);
                    onReady();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(poll);
                if (!w.ymaps?.ready) reject(new Error('ymaps load timeout'));
            }, 15_000);
            return;
        }
        const s = document.createElement('script');
        s.src = YMAPS_SRC;
        s.async = true;
        s.onload = onReady;
        s.onerror = () => reject(new Error('ymaps load failed'));
        document.body.appendChild(s);
    });
}

type Props = {
    /** Координаты выбранного адреса [lat, lng] — метка на карте следует за ними. */
    coords: number[] | null;
    /** Гость кликнул по карте: адрес из обратного геокодинга, координаты и зона. */
    onPick: (address: string, coords: number[], zone: DeliveryZone | null) => void;
};

export default function DeliveryZoneMiniMap({ coords, onPick }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const placemarkRef = useRef<any>(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;
    const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

    // Ставит/переставляет метку гостя на карте.
    const setGuestPlacemark = (ym: any, map: any, point: number[]) => {
        if (placemarkRef.current) {
            placemarkRef.current.geometry.setCoordinates(point);
            return;
        }
        const pm = new ym.Placemark(
            point,
            { hintContent: 'Адрес доставки' },
            { preset: 'islands#brownDotIcon' },
        );
        map.geoObjects.add(pm);
        placemarkRef.current = pm;
    };

    useEffect(() => {
        let cancelled = false;
        loadYmaps()
            .then((ym) => {
                if (cancelled || !mapRef.current) return;
                mapRef.current.innerHTML = '';
                const map = new ym.Map(mapRef.current, {
                    center: RESTAURANT_COORDS,
                    zoom: 11,
                    controls: ['zoomControl'],
                });
                mapInstanceRef.current = map;

                // Полигоны зон — от внешних к внутренним, чтобы кольца читались.
                [...deliveryZones].reverse().forEach((zone) => {
                    const polygon = new ym.Polygon(
                        zone.coordinates,
                        {
                            hintContent: `${zone.name}: ${zone.price === 0 ? 'бесплатно' : zone.price + ' ₽'} · заказ от ${zone.minOrder.toLocaleString('ru-RU')} ₽`,
                        },
                        {
                            fillColor: zone.color,
                            fillOpacity: zone.opacity ?? 0.15,
                            strokeColor: zone.color,
                            strokeWidth: 2,
                            strokeOpacity: 0.8,
                            interactive: false,
                        },
                    );
                    map.geoObjects.add(polygon);
                });

                const restaurant = new ym.Placemark(
                    RESTAURANT_COORDS,
                    { hintContent: 'Kucher&Conga — Промышленная, 20Б' },
                    { preset: 'islands#redFoodIcon' },
                );
                map.geoObjects.add(restaurant);

                // Клик по карте: метка + обратный геокодинг → адрес и зона наверх.
                map.events.add('click', async (e: any) => {
                    const point: number[] = e.get('coords');
                    setGuestPlacemark(ym, map, point);
                    const zone = checkDeliveryZoneForCoords(point);
                    let address = '';
                    try {
                        const res = await ym.geocode(point, { results: 1 });
                        const obj = res?.geoObjects?.get(0);
                        if (obj?.getAddressLine) address = obj.getAddressLine();
                    } catch {
                        // адрес не определился — передаём только координаты и зону
                    }
                    onPickRef.current(address, point, zone);
                });

                if (coords) {
                    setGuestPlacemark(ym, map, coords);
                    map.setCenter(coords, 13);
                }
                setState('ready');
            })
            .catch(() => {
                if (!cancelled) setState('error');
            });
        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.destroy(); } catch { /* карта уже снята */ }
                mapInstanceRef.current = null;
                placemarkRef.current = null;
            }
        };
        // Карта создаётся один раз; coords дальше обрабатывает эффект ниже.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Адрес нашли через поле ввода → двигаем метку и центрируем карту.
    useEffect(() => {
        const map = mapInstanceRef.current;
        const ym = (window as Window).ymaps;
        if (!map || !ym || !coords) return;
        setGuestPlacemark(ym, map, coords);
        map.setCenter(coords, 14, { duration: 300 });
    }, [coords]);

    if (state === 'error') {
        return (
            <p className="text-xs text-cream/45">
                Карта зон доставки не загрузилась — зону определим по адресу при подтверждении заказа.
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-white/10">
            <div ref={mapRef} className="h-56 w-full bg-forest-ink/60" />
            <div className="flex flex-wrap gap-x-3 gap-y-1 bg-forest-ink/60 px-3 py-2">
                {deliveryZones.map((zone) => (
                    <span key={zone.id} className="flex items-center gap-1.5 text-[11px] text-cream/70">
                        <span className="h-2.5 w-2.5 rounded-sm border border-white/20" style={{ backgroundColor: zone.color }} />
                        {zone.price === 0 ? 'Бесплатно' : `${zone.price} ₽`} · от {zone.minOrder.toLocaleString('ru-RU')} ₽
                    </span>
                ))}
            </div>
            <p className="bg-forest-ink/60 px-3 pb-2 text-[11px] text-cream/45">
                Нажмите на карту, чтобы выбрать точку доставки вручную.
            </p>
        </div>
    );
}
