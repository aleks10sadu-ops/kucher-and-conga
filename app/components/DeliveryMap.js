'use client';

import React, { useState, useEffect, useRef } from 'react';

// Зоны доставки для Дмитрова и Дмитровского района
const deliveryZones = [
  {
    id: 1,
    name: 'Бесплатная доставка',
    price: 0,
    color: '#4CAF50',
    opacity: 0.3,
    streets: ['ул. Промышленная', 'ул. Загорская', 'ул. Московская', 'ул. Профессиональная'],
    // Центр Дмитрова - район от центра до 2 км
    coordinates: [[
      [56.332, 37.512],
      [56.332, 37.538],
      [56.348, 37.538],
      [56.348, 37.512]
    ]]
  },
  {
    id: 2,
    name: 'Зона 200₽',
    price: 200,
    color: '#2196F3',
    opacity: 0.25,
    streets: ['ул. Внуковская', 'ул. Кропоткинская', 'ул. Кооперативная', 'ул. Туполева', 'п. Деденево'],
    // Зона от 2 до 4 км от центра
    coordinates: [[
      [56.318, 37.498],
      [56.318, 37.552],
      [56.362, 37.552],
      [56.362, 37.498]
    ]]
  },
  {
    id: 3,
    name: 'Зона 300₽',
    price: 300,
    color: '#FF9800',
    opacity: 0.25,
    streets: ['ул. Ключевая', 'ул. Лобненская', 'ул. 1-я Московская', 'д. Ольявидово', 'д. Подосинки'],
    // Зона от 4 до 6 км от центра
    coordinates: [[
      [56.304, 37.484],
      [56.304, 37.566],
      [56.376, 37.566],
      [56.376, 37.484]
    ]]
  },
  {
    id: 4,
    name: 'Зона 400₽',
    price: 400,
    color: '#FF5722',
    opacity: 0.25,
    streets: ['ул. Солнечная', 'ул. Юбилейная', 'д. Габово', 'д. Турбово', 'с. Орудьево'],
    // Зона от 6 до 8 км от центра
    coordinates: [[
      [56.290, 37.470],
      [56.290, 37.580],
      [56.390, 37.580],
      [56.390, 37.470]
    ]]
  },
  {
    id: 5,
    name: 'Зона 500₽',
    price: 500,
    color: '#9C27B0',
    opacity: 0.25,
    streets: ['ул. Центральная (Яхрома)', 'д. Богослово', 'д. Курово', 'д. Жуково', 'с. Рогачево'],
    // Зона от 8 до 12 км от центра
    coordinates: [[
      [56.276, 37.456],
      [56.276, 37.594],
      [56.404, 37.594],
      [56.404, 37.456]
    ]]
  }
];

export default function DeliveryMap({ onZoneChange, onAddressChange }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryPrice, setDeliveryPrice] = useState(null);
  const [address, setAddress] = useState('');
  const [ymaps, setYmaps] = useState(null);
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);

  const mapState = {
    center: [56.340, 37.525], // Центр Дмитрова
    zoom: 12,
  };

  // Загрузка Yandex Maps API
  useEffect(() => {
    // Проверяем, загружен ли уже API
    if (window.ymaps && window.ymaps.Map) {
      setTimeout(() => {
        initMap();
      }, 100);
      return;
    }

    // Проверяем, не загружается ли уже скрипт
    if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
      const checkReady = () => {
        if (window.ymaps && window.ymaps.Map) {
          initMap();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }

    // Загружаем Yandex Maps API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=058ef9d4-8dac-4162-a855-b1e7cf0878ef&lang=ru_RU&load=package.full`;
    script.async = true;

    script.onload = () => {
      window.ymaps.ready(() => {
        setTimeout(() => {
          initMap();
        }, 100);
      });
    };

    script.onerror = (error) => {
      console.error('Failed to load Yandex Maps API:', error);
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Не удаляем скрипт при unmount, чтобы он мог быть переиспользован
    };
  }, []);

  // Инициализация карты
  const initMap = () => {
    if (!mapRef.current || !window.ymaps || !window.ymaps.Map) {
      console.error('Map container or Yandex Maps API not available');
      setIsLoading(false);
      return;
    }

    try {
      // Очищаем контейнер карты
      mapRef.current.innerHTML = '';

      const mapInstance = new window.ymaps.Map(mapRef.current, {
        center: mapState.center,
        zoom: mapState.zoom,
        controls: ['zoomControl', 'geolocationControl']
      });

      setYmaps(window.ymaps);
      setMap(mapInstance);
      setIsLoading(false);

      // Добавляем зоны доставки
      deliveryZones.forEach((zone) => {
        try {
          const polygon = new window.ymaps.Polygon(
            zone.coordinates,
            {
              hintContent: `${zone.name}: ${zone.price === 0 ? 'Бесплатно' : zone.price + '₽'}`,
              balloonContent: `
                <div style="font-family: Arial, sans-serif; padding: 10px;">
                  <h4 style="margin: 0 0 8px 0; color: #333;">${zone.name}</h4>
                  <p style="margin: 0; color: #666;">
                    Стоимость доставки: <strong>${zone.price === 0 ? 'Бесплатно' : zone.price + ' ₽'}</strong>
                  </p>
                </div>
              `
            },
            {
              fillColor: zone.color,
              fillOpacity: zone.opacity,
              strokeColor: zone.color,
              strokeWidth: 2,
              strokeOpacity: 0.8,
            }
          );
          mapInstance.geoObjects.add(polygon);
        } catch (zoneError) {
          console.error('Error adding zone:', zone.id, zoneError);
        }
      });

      // Обработчик клика по карте
      mapInstance.events.add('click', (e) => {
        const coords = e.get('coords');
        setUserLocation(coords);
        checkDeliveryZone(coords);
      });

      console.log('Map initialized successfully');

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsLoading(false);
    }
  };

  // Проверка попадания точки в полигон
  const isPointInPolygon = (point, polygon) => {
    if (!ymaps) return false;

    try {
      const polygonGeometry = new ymaps.geometry.Polygon([polygon]);
      return polygonGeometry.contains(point);
    } catch (error) {
      console.error('Error checking point in polygon:', error);
      return false;
    }
  };

  // Определение зоны доставки
  const checkDeliveryZone = (coords) => {
    for (let i = deliveryZones.length - 1; i >= 0; i--) {
      const zone = deliveryZones[i];
      if (isPointInPolygon(coords, zone.coordinates[0])) {
        setSelectedZone(zone);
        setDeliveryPrice(zone.price);
        onZoneChange && onZoneChange(zone);

        // Добавляем метку пользователя
        if (map) {
          // Удаляем предыдущую метку
          map.geoObjects.each((geoObject) => {
            if (geoObject.options && geoObject.options.get('preset') === 'islands#redDotIcon') {
              map.geoObjects.remove(geoObject);
            }
          });

          // Добавляем новую метку
          const placemark = new ymaps.Placemark(
            coords,
            {
              iconCaption: zone.price !== null
                ? `${zone.price === 0 ? 'Бесплатно' : zone.price + '₽'}`
                : 'Не доставляем',
              balloonContent: zone.price !== null
                ? `<div style="font-family: Arial, sans-serif; padding: 10px;">
                    <p style="margin: 0; color: #333;">
                      <strong>Зона:</strong> ${zone.name}<br>
                      <strong>Доставка:</strong> ${zone.price === 0 ? 'Бесплатно' : zone.price + ' ₽'}
                    </p>
                  </div>`
                : `<div style="font-family: Arial, sans-serif; padding: 10px;">
                    <p style="margin: 0; color: #e74c3c;">
                      <strong>Доставка не осуществляется</strong>
                    </p>
                  </div>`
            },
            {
              preset: 'islands#redDotIcon',
              iconColor: zone.color,
            }
          );
          map.geoObjects.add(placemark);
        }

        return zone;
      }
    }
    setSelectedZone(null);
    setDeliveryPrice(null);
    onZoneChange && onZoneChange(null);

    // Добавляем метку "не доставляем"
    if (map) {
      map.geoObjects.each((geoObject) => {
        if (geoObject.options && geoObject.options.get('preset') === 'islands#redDotIcon') {
          map.geoObjects.remove(geoObject);
        }
      });

      const placemark = new ymaps.Placemark(
        coords,
        {
          iconCaption: 'Не доставляем',
          balloonContent: `<div style="font-family: Arial, sans-serif; padding: 10px;">
            <p style="margin: 0; color: #e74c3c;">
              <strong>Доставка не осуществляется</strong>
            </p>
          </div>`
        },
        {
          preset: 'islands#redDotIcon',
          iconColor: '#e74c3c',
        }
      );
      map.geoObjects.add(placemark);
    }

    return null;
  };

  // Геокодинг адреса
  const handleAddressSearch = async () => {
    if (!ymaps || !address.trim()) return;

    try {
      const result = await ymaps.geocode(address.trim(), {
        results: 1,
        boundedBy: [[56.2, 37.3], [56.5, 37.7]], // Ограничение по Дмитрову и области
        strictBounds: false
      });

      const firstGeoObject = result.geoObjects.get(0);

      if (firstGeoObject) {
        const coords = firstGeoObject.geometry.getCoordinates();
        setUserLocation(coords);
        checkDeliveryZone(coords);
        onAddressChange && onAddressChange(address.trim(), coords);
      } else {
        alert('Адрес не найден. Попробуйте указать более точный адрес в Дмитрове или Дмитровском районе.');
      }
    } catch (error) {
      console.error('Ошибка геокодинга:', error);
      alert('Произошла ошибка при поиске адреса. Попробуйте еще раз.');
    }
  };

  // Обработчик изменения адреса
  const handleAddressChange = (newAddress) => {
    setAddress(newAddress);
    if (onAddressChange) {
      onAddressChange(newAddress, userLocation);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 rounded-lg overflow-hidden">
      {/* Шапка с поиском */}
      <div className="bg-neutral-800 p-4 border-b border-neutral-700">
        <h3 className="text-lg font-bold text-white mb-3">
          Зоны доставки - Дмитров
        </h3>

        {/* Поиск адреса */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
            placeholder="Введите адрес в Дмитрове..."
            className="flex-1 px-4 py-2 border border-neutral-600 rounded-lg bg-neutral-700 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleAddressSearch}
            className="px-6 py-2 bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors font-semibold"
          >
            Найти
          </button>
        </div>

        {/* Результат определения зоны */}
        {deliveryPrice !== null && (
          <div className={`p-3 rounded-lg border ${deliveryPrice === 0 ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-blue-900/20 border-blue-500/50 text-blue-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Зона доставки:</span>
              <span className="text-lg font-bold">{selectedZone?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-75">Стоимость доставки:</span>
              <span className="text-xl font-bold text-amber-400">
                {deliveryPrice === 0 ? 'Бесплатно' : `${deliveryPrice}₽`}
              </span>
            </div>
            {selectedZone?.streets && (
              <div className="mt-2 text-xs opacity-75">
                <span>Улицы: {selectedZone.streets.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {deliveryPrice === null && userLocation && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/50 text-red-300">
            <span className="font-semibold">
              ❌ Доставка по данному адресу не осуществляется
            </span>
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-neutral-300">Легенда:</span>
          {deliveryZones.map((zone) => (
            <div key={zone.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border border-neutral-500"
                style={{ backgroundColor: zone.color, opacity: 0.8 }}
              />
              <span className="text-sm text-neutral-300">
                {zone.name} ({zone.price === 0 ? 'бесплатно' : `${zone.price}₽`})
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          💡 Кликните на карту или введите адрес для проверки стоимости доставки
        </p>
      </div>

      {/* Карта */}
      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="w-full h-full min-h-[400px]"
          style={{ backgroundColor: '#f0f0f0' }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 bg-opacity-75 rounded-lg">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
              <p>Загрузка карты...</p>
            </div>
          </div>
        )}
      </div>

      {/* Подсказка */}
      <div className="bg-neutral-800 px-4 py-2 text-xs text-neutral-500 border-t border-neutral-700">
        <strong>Примеры адресов:</strong> ул. Промышленная, ул. Загорская, ул. Московская, ул. Профессиональная, ул. Внуковская
      </div>
    </div>
  );
}