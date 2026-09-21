'use client';

import { useEffect, useRef, useState } from 'react';

type YandexMapsWindow = Window & {
    ymaps?: any;
};

const YANDEX_MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
    ?? '058ef9d4-8dac-4162-a855-b1e7cf0878ef';
const YANDEX_MAPS_API_SRC = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU&load=package.standard`;
const RESTAURANT_COORDS = [56.390656, 37.527282];

export const YANDEX_ROUTE_URL = 'https://yandex.ru/maps/?rtext=~56.390656%2C37.527282&rtt=auto';

let yandexMapsPromise: Promise<any> | null = null;

function loadYandexMaps(): Promise<any> {
    const yandexWindow = window as YandexMapsWindow;
    if (yandexWindow.ymaps?.Map) return Promise.resolve(yandexWindow.ymaps);
    if (yandexMapsPromise) return yandexMapsPromise;

    yandexMapsPromise = new Promise((resolve, reject) => {
        let finished = false;
        let readyRequested = false;
        let pollId = 0;
        let timeoutId = 0;

        const cleanup = () => {
            window.clearInterval(pollId);
            window.clearTimeout(timeoutId);
        };
        const fail = (message: string) => {
            if (finished) return;
            finished = true;
            cleanup();
            reject(new Error(message));
        };
        const resolveWhenReady = () => {
            if (finished || readyRequested || !yandexWindow.ymaps?.ready) return;
            readyRequested = true;
            yandexWindow.ymaps.ready(() => {
                if (finished) return;
                finished = true;
                cleanup();
                resolve(yandexWindow.ymaps);
            });
        };

        let script = document.querySelector<HTMLScriptElement>('script[src*="api-maps.yandex.ru"]');
        if (!script) {
            script = document.createElement('script');
            script.src = YANDEX_MAPS_API_SRC;
            script.async = true;
            script.dataset.kcRestaurantMap = 'true';
            document.body.appendChild(script);
        }

        script.addEventListener('load', resolveWhenReady, { once: true });
        script.addEventListener('error', () => {
            if (script?.dataset.kcRestaurantMap === 'true') script.remove();
            fail('blocked');
        }, { once: true });
        pollId = window.setInterval(resolveWhenReady, 100);
        timeoutId = window.setTimeout(() => {
            if (script?.dataset.kcRestaurantMap === 'true') script.remove();
            fail('timeout');
        }, 12_000);
        resolveWhenReady();
    }).catch((error) => {
        yandexMapsPromise = null;
        throw error;
    });

    return yandexMapsPromise;
}

export default function RestaurantLocationMap({ height = 360 }: { height?: number }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        if (!('IntersectionObserver' in window)) {
            setActive(true);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setActive(true);
                observer.disconnect();
            }
        }, { rootMargin: '360px 0px' });
        observer.observe(host);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        let map: any = null;
        setStatus('loading');

        loadYandexMaps()
            .then((ym) => {
                if (cancelled || !mapRef.current) return;
                mapRef.current.innerHTML = '';
                map = new ym.Map(mapRef.current, {
                    center: RESTAURANT_COORDS,
                    zoom: 15,
                    controls: ['zoomControl'],
                    behaviors: ['drag', 'dblClickZoom', 'multiTouch'],
                }, {
                    yandexMapDisablePoiInteractivity: true,
                });
                map.behaviors.disable('scrollZoom');

                const placemark = new ym.Placemark(
                    RESTAURANT_COORDS,
                    {
                        hintContent: 'Кучер & Conga',
                        balloonContentHeader: 'Ресторан «Кучер & Conga»',
                        balloonContentBody: 'Дмитров, Промышленная улица, 20Б',
                    },
                    { preset: 'islands#foodIcon', iconColor: '#AC4823' },
                );
                map.geoObjects.add(placemark);
                setStatus('ready');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
            if (map) {
                try { map.destroy(); } catch { /* карта уже уничтожена */ }
            }
        };
    }, [active, attempt]);

    return (
        <div
            ref={hostRef}
            role="region"
            aria-label="Интерактивная карта расположения ресторана Кучер и Конга"
            style={{ position: 'relative', height, overflow: 'hidden', background: '#121A15' }}
        >
            <div
                ref={mapRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: status === 'ready' ? 1 : 0,
                    transition: 'opacity .35s ease',
                    filter: 'saturate(.82) brightness(.78) contrast(1.08)',
                }}
            />

            {status !== 'ready' ? (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: 'rgba(244,247,242,0.72)' }}>
                    {status === 'error' ? (
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#F4F7F2' }}>Карта не загрузилась</div>
                            <div style={{ marginTop: 6, maxWidth: 360, fontSize: 13, lineHeight: 1.5 }}>Возможно, Яндекс.Карты заблокированы браузером. Адрес и ссылка на маршрут доступны ниже.</div>
                            <button
                                type="button"
                                onClick={() => setAttempt((current) => current + 1)}
                                style={{ marginTop: 14, borderRadius: 8, border: '1px solid rgba(194,148,85,.55)', padding: '9px 16px', background: 'rgba(194,148,85,.12)', color: '#D8B77D', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Повторить
                            </button>
                        </div>
                    ) : (
                        <span style={{ fontSize: 14 }}>Загружаем карту…</span>
                    )}
                </div>
            ) : (
                <div aria-hidden style={{ position: 'absolute', left: 14, bottom: 14, maxWidth: 'calc(100% - 28px)', borderRadius: 10, border: '1px solid rgba(255,255,255,.16)', padding: '9px 12px', background: 'rgba(18,26,21,.86)', boxShadow: '0 8px 24px rgba(0,0,0,.28)', color: '#F4F7F2', pointerEvents: 'none', backdropFilter: 'blur(8px)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Кучер & Conga</div>
                    <div style={{ marginTop: 2, fontSize: 11.5, color: 'rgba(244,247,242,.72)' }}>Промышленная улица, 20Б</div>
                </div>
            )}
        </div>
    );
}
