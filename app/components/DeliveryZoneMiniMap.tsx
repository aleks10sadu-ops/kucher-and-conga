'use client';

// Мини-карта зон доставки для чекаута: полигоны зон, метка ресторана,
// метка выбранного адреса. Гость может кликнуть по карте — точка
// геокодируется обратно в адрес и передаётся наверх вместе с зоной.
// Оформление — в дизайн-системе сайта «Перевёрнутый лес».

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { deliveryZones, checkDeliveryZoneForCoords, type DeliveryZone } from '../data/deliveryZones';

declare global {
    interface Window {
        ymaps: any;
    }
}

const YMAPS_SRC = 'https://api-maps.yandex.ru/2.1/?apikey=058ef9d4-8dac-4162-a855-b1e7cf0878ef&lang=ru_RU&load=package.full';

// Координаты ресторана (Промышленная улица, 20Б)
const RESTAURANT_COORDS = [56.390656, 37.527282];

// Цвета дизайн-системы (tailwind.config.js): метки на карте в фирменных тонах.
const BRAND_TERRACOTTA = '#AC4823';
const BRAND_BRASS = '#C29455';

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
            // Скрипт уже вставлен (например, другой картой) — ждём готовности API.
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
            { preset: 'islands#dotIcon', iconColor: BRAND_BRASS },
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
                    { preset: 'islands#foodIcon', iconColor: BRAND_TERRACOTTA },
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
            <div className="rounded-xl border border-white/10 bg-forest-ink/60 p-4 text-sm text-cream/60">
                <p className="font-semibold text-cream/80">Карта зон доставки не загрузилась</p>
                <p className="mt-1 text-xs">Зону и стоимость доставки определим по адресу при подтверждении заказа.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-forest-ink/60">
            {/* Шапка блока — как у остальных секций формы */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brass" />
                    <span className="text-sm font-semibold text-cream">Зоны доставки</span>
                </div>
                <span className="text-[11px] text-cream/45">Нажмите точку на карте — адрес подставится сам</span>
            </div>

            {/* Карта: тёплый фильтр под палитру сайта, поверх — рамка-виньетка */}
            <div className="relative">
                <div
                    ref={mapRef}
                    className="h-64 w-full"
                    style={{ filter: 'sepia(0.22) saturate(0.82) brightness(0.92) contrast(1.04)' }}
                />
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_28px_rgba(15,20,17,0.55)]" />
                {state === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-forest-ink/80">
                        <div className="text-center text-cream/70">
                            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-brass/30 border-t-brass" />
                            <p className="text-xs">Загружаем карту…</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Легенда зон — фирменные «чипы» */}
            <div className="flex flex-wrap gap-1.5 px-4 py-3">
                {deliveryZones.map((zone) => (
                    <span
                        key={zone.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-cream/75"
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} />
                        {zone.price === 0 ? 'Бесплатно' : `${zone.price} ₽`}
                        <span className="text-cream/45">· от {zone.minOrder.toLocaleString('ru-RU')} ₽</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
