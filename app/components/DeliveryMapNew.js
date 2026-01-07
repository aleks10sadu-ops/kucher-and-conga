'use client';

import React, { useState, useEffect, useRef } from 'react';

// Зоны доставки для Дмитрова и Дмитровского района
// Расположены от центра (бесплатной) к окраинам (дорогой доставки)
const deliveryZones = [
  {
    id: 1,
    name: 'Бесплатная доставка',
    price: 0,
    color: '#4CAF50',
    opacity: 0.3,
    // Центр Дмитрова - маленький район в центре города
    coordinates: [[
      [56.448083, 37.525316],
      [56.403938, 37.488497],
      [56.389160, 37.503898],
      [56.322309, 37.498645],
      [56.330247, 37.544675],
      [56.365411, 37.581519],
      [56.373084, 37.579845],
      [56.385925, 37.568143],
      [56.404277, 37.572474],
      [56.408275, 37.531050],
      [56.447954, 37.525318],
      [56.448083, 37.525316] // Замыкающая точка
    ]]
  },
  {
    id: 2,
    name: 'Зона 200₽',
    price: 200,
    color: '#2196F3',
    opacity: 0.25,
    // Ближняя зона вокруг центра
    coordinates: [[
      [56.458630, 37.515494],
      [56.446931, 37.477176],
      [56.374354, 37.405090],
      [56.299450, 37.469689],
      [56.285367, 37.466610],
      [56.281103, 37.475877],
      [56.277785, 37.478084],
      [56.276093, 37.506538],
      [56.266275, 37.584660],
      [56.380167, 37.632883],
      [56.410302, 37.593016],
      [56.418217, 37.561948],
      [56.458601, 37.515380],
      [56.458630, 37.515494] // Замыкающая точка
    ]]
  },
  {
    id: 3,
    name: 'Зона 300₽',
    price: 300,
    color: '#FF9800',
    opacity: 0.25,
    // Средняя зона
    coordinates: [[
      [56.550812, 37.635052],
      [56.488691, 37.421440],
      [56.389231, 37.272855],
      [56.229917, 37.491985],
      [56.282713, 37.793475],
      [56.417161, 37.642658],
      [56.489450, 37.681509],
      [56.550928, 37.635116],
      [56.550812, 37.635052] // Замыкающая точка
    ]]
  },
  {
    id: 4,
    name: 'Зона 400₽',
    price: 400,
    color: '#FF5722',
    opacity: 0.25,
    // Дальняя зона
    coordinates: [[
      [56.581765, 37.384760],
      [56.480682, 37.355947],
      [56.480682, 37.355947],
      [56.480682, 37.355947],
      [56.411939, 37.234555],
      [56.311687, 37.252218],
      [56.177398, 37.499376],
      [56.304108, 37.955656],
      [56.584128, 37.654163],
      [56.581765, 37.384760] // Замыкающая точка
    ]]
  },
  {
    id: 5,
    name: 'Зона 500₽',
    price: 500,
    color: '#9C27B0',
    opacity: 0.25,
    // Самая дальняя зона - окраины Дмитрова и Дмитровского района
    coordinates: [[
      [56.781361, 37.513940],
      [56.362147, 37.033288],
      [56.090705, 37.530669],
      [56.310414, 38.048400],
      [56.781361, 37.513940] // Замыкающая точка
    ]]
  }
];

export default function DeliveryMap({ onZoneChange, onAddressChange }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [deliveryPrice, setDeliveryPrice] = useState(null);
  const [address, setAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [yandexApiConfigured, setYandexApiConfigured] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userPlacemarkRef = useRef(null);

  const mapState = {
    center: [56.340, 37.525],
    zoom: 12,
  };

  // Координаты ресторана
  const restaurantCoords = [56.390656, 37.527282];

  useEffect(() => {
    // Функция инициализации карты
    const initMap = () => {
      if (!mapRef.current || !window.ymaps || !window.ymaps.Map) {
        setError('Yandex Maps API не загружен. Проверьте подключение к интернету.');
        setIsLoading(false);
        return;
      }

      try {
        mapRef.current.innerHTML = '';

        const mapInstance = new window.ymaps.Map(mapRef.current, {
          center: mapState.center,
          zoom: mapState.zoom,
          controls: ['zoomControl', 'geolocationControl'],
          copyright: false
        });

        mapInstanceRef.current = mapInstance;

        // Скрываем элементы copyright через CSS
        const hideCopyrightElements = () => {
          if (mapRef.current) {
            const copyrightElements = mapRef.current.querySelectorAll('[class*="copyright"], [class*="gototech"], [class*="gotoymaps"]');
            copyrightElements.forEach(el => {
              if (el && el.style) {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
              }
            });
          }
        };

        // Прячем сразу и через таймаут
        hideCopyrightElements();
        setTimeout(hideCopyrightElements, 500);
        setTimeout(hideCopyrightElements, 1500);

        // Добавляем зоны доставки (от больших к меньшим для эффекта колец)
        [...deliveryZones].reverse().forEach((zone) => {
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
                fillOpacity: 0.1,
                strokeColor: zone.color,
                strokeWidth: 2,
                strokeOpacity: 0.8,
                interactive: false, // Отключаем интерактивность зон, чтобы они не перехватывали клики
              }
            );
            mapInstance.geoObjects.add(polygon);
          } catch (zoneError) {
            console.error('Error adding zone:', zone.id, zoneError);
          }
        });

        // Добавляем метку ресторана
        try {
          const restaurantPlacemark = new window.ymaps.Placemark(
            restaurantCoords,
            {
              hintContent: 'Kucher&Conga - наш ресторан',
              balloonContent: `
                <div style="font-family: Arial, sans-serif; padding: 10px; text-align: center;">
                  <div style="font-size: 24px; margin-bottom: 8px;">🍽️</div>
                  <h4 style="margin: 0 0 8px 0; color: #333;">Kucher&Conga</h4>
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    Наш ресторан<br>
                    Адрес: Промышленная улица, 20Б
                  </p>
                </div>
              `
            },
            {
              preset: 'islands#redDotIcon',
              iconColor: '#FF5722', // Оранжевый цвет для ресторана
              iconContent: '🍽️'
            }
          );
          mapInstance.geoObjects.add(restaurantPlacemark);
        } catch (restaurantError) {
          console.error('Error adding restaurant placemark:', restaurantError);
        }

        // Обработчик клика по карте
        mapInstance.events.add('click', async (e) => {
          try {
            const coords = e.get('coords');
            console.log('Map clicked at coordinates:', coords);

            // Получаем адрес по координатам
            let addressText = 'Адрес не определен';
            try {
              const geocodeResult = await window.ymaps.geocode(coords, {
                results: 1
              });

              if (geocodeResult && geocodeResult.geoObjects && geocodeResult.geoObjects.get(0)) {
                const geoObject = geocodeResult.geoObjects.get(0);
                addressText = geoObject.getAddressLine ? geoObject.getAddressLine() : `Координаты: ${coords.join(', ')}`;
              }
            } catch (geocodeError) {
              console.warn('Could not get address for coordinates:', geocodeError);
              addressText = `Координаты: ${coords.join(', ')}`;
            }

            // Удаляем предыдущий маркер пользователя
            if (userPlacemarkRef.current) {
              mapInstance.geoObjects.remove(userPlacemarkRef.current);
            }

            // Создаем новый маркер
            const placemark = new window.ymaps.Placemark(coords, {
              hintContent: 'Выбранный адрес',
              balloonContent: `${addressText}\nКоординаты: ${coords.join(', ')}`
            });

            mapInstance.geoObjects.add(placemark);
            userPlacemarkRef.current = placemark;

            setUserLocation(coords);
            setSelectedAddress(addressText);
            const extractedAddress = extractStreetAndHouseFromAddress(addressText);
            setSelectedStreet(extractedAddress);
            const zone = checkDeliveryZone(coords);

            // Центрируем карту на выбранных координатах с анимацией
            mapInstance.setCenter(coords, 16, {
              duration: 300,
              timingFunction: 'ease-in-out'
            });

            // Показываем уведомление пользователю
            const zoneName = zone ? zone.name : 'Зона не определена';
            const streetForAlert = extractStreetAndHouseFromAddress(addressText);
            alert(`Адрес выбран!\nАдрес: ${streetForAlert || 'Не определен'}\nЗона: ${zoneName}`);

            // Передаем адрес и координаты родительскому компоненту
            onAddressChange && onAddressChange(addressText, coords);

          } catch (clickError) {
            console.error('Error handling map click:', clickError);
            alert('Ошибка при выборе адреса на карте');
          }
        });

        // Автодополнение адресов отключено - Yandex Suggest API больше не доступен
        // Пользователь должен вводить полный адрес и нажимать "Найти" или Enter

        setIsLoading(false);
        console.log('Map initialized successfully');

      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Ошибка инициализации карты');
        setIsLoading(false);
      }
    };

    // Проверяем, загружен ли уже API
    if (window.ymaps && window.ymaps.Map) {
      initMap();
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

    // Проверяем, находимся ли мы в production среде (Vercel)
    const isProduction = typeof window !== 'undefined' &&
      (window.location.hostname.includes('vercel.app') ||
       window.location.hostname.includes('vercel.live') ||
       process.env.NODE_ENV === 'production');

    // Загружаем Yandex Maps API с дополнительными проверками
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=058ef9d4-8dac-4162-a855-b1e7cf0878ef&lang=ru_RU&load=package.full`;
    script.async = true;
    script.crossOrigin = 'anonymous'; // Добавляем для работы на Vercel

    // В production добавляем дополнительные заголовки для обхода CORS
    if (isProduction) {
      script.setAttribute('referrerPolicy', 'no-referrer-when-downgrade');
    }

    script.onload = () => {
      console.log('Yandex Maps script loaded successfully');

      // Проверяем готовность API с таймаутом
      let attempts = 0;
      const maxAttempts = 50; // 5 секунд максимум

      const checkReady = () => {
        attempts++;
        if (window.ymaps && window.ymaps.ready) {
          window.ymaps.ready(() => {
            console.log('Yandex Maps API ready');
            setTimeout(() => {
              initMap();
            }, 100);
          });
        } else if (attempts < maxAttempts) {
          setTimeout(checkReady, 100);
        } else {
          console.error('Yandex Maps API failed to initialize within timeout');
          setError('Превышено время ожидания загрузки карты');
          setIsLoading(false);
        }
      };

      checkReady();
    };

    let retryCount = 0;
    const maxRetries = 2;

    const loadScriptWithRetry = () => {
      retryCount++;
      console.log(`Loading Yandex Maps API, attempt ${retryCount}/${maxRetries + 1}`);

      script.onerror = (error) => {
        console.error(`Failed to load Yandex Maps API, attempt ${retryCount}:`, error);

        if (retryCount <= maxRetries) {
          console.log(`Retrying Yandex Maps API load in 2 seconds...`);
          setTimeout(() => {
            // Создаем новый скрипт для повторной попытки
            const retryScript = document.createElement('script');
            retryScript.src = script.src;
            retryScript.async = true;
            retryScript.crossOrigin = 'anonymous';
            if (isProduction) {
              retryScript.setAttribute('referrerPolicy', 'no-referrer-when-downgrade');
            }
            retryScript.onload = script.onload;
            retryScript.onerror = loadScriptWithRetry; // Рекурсивный вызов для retry
            document.head.appendChild(retryScript);
          }, 2000);
        } else {
          console.error('All retry attempts failed');
          setError('Карта временно недоступна. Используйте поиск по адресу для определения зоны доставки.');
          setIsLoading(false);
        }
      };

      document.head.appendChild(script);
    };

    loadScriptWithRetry();

  }, []);

  // Извлечение улицы из полного адреса
  // Извлечение улицы с домом из полного адреса
  const extractStreetAndHouseFromAddress = (address) => {
    if (!address) return '';

    // Разбираем адрес по частям
    const parts = address.split(', ');

    // Ищем часть с улицей и домом
    let streetPart = '';
    let housePart = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes('ул.') || part.includes('улица') || part.includes('проспект') || part.includes('переулок')) {
        streetPart = part.trim();
        // Проверяем следующий элемент на наличие дома
        if (i + 1 < parts.length && /^\d+[а-яА-Я]?/.test(parts[i + 1])) {
          housePart = parts[i + 1].trim();
        }
        break;
      }
    }

    // Если нашли улицу и дом, возвращаем их вместе
    if (streetPart && housePart) {
      return `${streetPart}, ${housePart}`;
    }

    // Если только улица, возвращаем её
    if (streetPart) {
      return streetPart;
    }

    // Если не нашли улицу, возвращаем первую подходящую часть
    const filteredParts = parts.filter(part =>
      !part.includes('Дмитров') &&
      !part.includes('Московская область') &&
      !part.includes('россия') &&
      !part.toLowerCase().includes('россия') &&
      !/^\d+$/.test(part) // не только цифры
    );

    return filteredParts.length > 0 ? filteredParts[0] : address;
  };

  // Проверка попадания точки в полигон (алгоритм point-in-polygon)
  const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length === 0) return false;

    const x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  };

  // Определение зоны доставки
  const checkDeliveryZone = (coords) => {
    console.log('Checking delivery zone for coordinates:', coords);

    // Проверяем зоны по порядку (центр имеет приоритет)
    for (let i = 0; i < deliveryZones.length; i++) {
      const zone = deliveryZones[i];
      try {
        if (isPointInPolygon(coords, zone.coordinates[0])) {
          console.log('Point found in zone:', zone.name, 'Price:', zone.price);
          setSelectedZone(zone);
          setDeliveryPrice(zone.price);
          onZoneChange && onZoneChange(zone);
          return zone;
        }
      } catch (error) {
        console.error('Error checking zone:', zone.id, error);
      }
    }

    console.log('Point not found in any zone');
    setSelectedZone(null);
    setDeliveryPrice(null);
    onZoneChange && onZoneChange(null);
    return null;
  };

  // Функция для обновления местоположения пользователя
  const updateUserLocation = (coords) => {
    console.log('Updating user location to:', coords);

    // Центрируем карту на координатах
    if (mapInstanceRef.current) {
      try {
        // Центрируем карту с анимацией
        mapInstanceRef.current.setCenter(coords, 16, {
          duration: 500,
          timingFunction: 'ease-in-out'
        });

        // Удаляем предыдущий маркер пользователя
        if (userPlacemarkRef.current) {
          mapInstanceRef.current.geoObjects.remove(userPlacemarkRef.current);
        }

        // Создаем новый маркер
        const placemark = new window.ymaps.Placemark(coords, {
          hintContent: 'Указанный адрес',
          balloonContent: `Адрес: ${address.trim()}\nКоординаты: ${coords.join(', ')}`
        });

        mapInstanceRef.current.geoObjects.add(placemark);
        userPlacemarkRef.current = placemark;
      } catch (mapError) {
        console.warn('Could not update map:', mapError);
      }
    }

    setUserLocation(coords);
    checkDeliveryZone(coords);
    onAddressChange && onAddressChange(address.trim(), coords);
  };

  // Геокодинг адреса
  const handleAddressSearch = async () => {
    console.log('handleAddressSearch called with address:', address);
    if (!address.trim()) {
      console.log('Address is empty, returning');
      return;
    }

    try {
      // Ищем адрес точно как ввел пользователь (без автоматического добавления Дмитрова)
      const searchAddress = address.trim();

      console.log('Searching for address:', searchAddress);

      const result = await window.ymaps.geocode(searchAddress, {
        results: 1, // Один результат
        boundedBy: [[56.0, 37.0], [57.0, 38.0]], // Широкие границы для поиска везде
        strictBounds: false
      });

      console.log('Geocoding result:', result);

      // Проверяем, что результат содержит geoObjects
      if (!result || !result.geoObjects || result.geoObjects.getLength() === 0) {
        console.log('Geocoding found no results, trying to geocode user input as-is');
        // Если не нашли адрес, пробуем геокодировать введенный текст напрямую
        try {
          const fallbackResult = await window.ymaps.geocode(searchAddress, {
            results: 1,
            boundedBy: [[50.0, 30.0], [60.0, 50.0]], // Очень широкие границы
            strictBounds: false
          });

          if (fallbackResult && fallbackResult.geoObjects && fallbackResult.geoObjects.getLength() > 0) {
            const fallbackGeoObject = fallbackResult.geoObjects.get(0);
            const fallbackCoords = fallbackGeoObject.geometry.getCoordinates();
            console.log('Fallback geocoding found coordinates:', fallbackCoords);
            updateUserLocation(fallbackCoords);
            alert(`Адрес найден (примерно)! Координаты: ${fallbackCoords.join(', ')}\nПроверьте точность на карте.`);
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback geocoding failed:', fallbackError);
        }

        alert('Не удалось найти адрес. Попробуйте уточнить адрес или проверьте правильность написания.');
        return;
      }

      const firstGeoObject = result.geoObjects.get(0);

      if (firstGeoObject) {
        try {
          const coords = firstGeoObject.geometry.getCoordinates();
          console.log('Found coordinates:', coords);

          updateUserLocation(coords);
          alert(`Адрес найден! Координаты: ${coords.join(', ')}`);

        } catch (coordsError) {
          console.error('Error getting coordinates:', coordsError);
          alert('Ошибка при получении координат адреса.');
        }
      }
    } catch (error) {
      console.error('Ошибка геокодинга:', error);
      alert('Произошла ошибка при поиске адреса. Попробуйте ввести адрес по-другому.');
    }
  };

  // Обработчик изменения адреса
  // Получение подсказок адресов напрямую от Яндекс API
  const fetchAddressSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const apiKey = 'da3b7265-1316-40c6-8750-a1f672f83957'; // Ваш API ключ

      // Ограничение по зоне доставки 500 рублей (самая большая зона)
      // bbox: min_lng,min_lat~max_lng,max_lat
      const bbox = '37.033288,56.090705~38.048400,56.781361';

      const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodeURIComponent(query)}&bbox=${bbox}&types=house&results=5`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Форматируем ответ Яндекса и берем первые 5 результатов
        const formattedSuggestions = data.results.slice(0, 5).map(result => ({
          title: result.title?.text || result.title,
          subtitle: result.subtitle?.text || result.subtitle || '',
          coords: null // Яндекс не возвращает координаты в suggest API
        }));

        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddressChange = (newAddress) => {
    setAddress(newAddress);

    // Очищаем предыдущий таймаут
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    // Устанавливаем новый таймаут для debouncing (300ms)
    const timeout = setTimeout(() => {
      fetchAddressSuggestions(newAddress);
    }, 300);

    setSuggestionTimeout(timeout);
  };

  // Обработчик клика вне поля для скрытия подсказок
  const handleClickOutside = (e) => {
    if (!e.target.closest('#address-input') && !e.target.closest('.suggestions-dropdown')) {
      setShowSuggestions(false);
    }
  };

  // Проверка статуса Yandex API при загрузке
  useEffect(() => {
    const checkYandexApi = async () => {
      try {
        const response = await fetch('/api/test-yandex-key');
        const data = await response.json();
        setYandexApiConfigured(data.configured);
        console.log('Yandex API status:', data);
      } catch (error) {
        console.error('Failed to check Yandex API status:', error);
        setYandexApiConfigured(false);
      }
    };

    checkYandexApi();
  }, []);

  // Добавляем обработчик клика при монтировании
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleAddressSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        } else {
          handleAddressSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setAddress(suggestion.title);
    setSelectedAddress(suggestion.title);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Если есть координаты, обновляем местоположение
    if (suggestion.coords) {
      const [lng, lat] = suggestion.coords;
      updateUserLocation([lat, lng]);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full flex flex-col bg-neutral-900 rounded-lg overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-red-900/20">
          <div className="text-center text-red-300 p-6">
            <p className="text-lg font-semibold mb-2">Ошибка загрузки карты</p>
            <p className="text-sm mb-4">{error}</p>
            <div className="bg-neutral-800 p-4 rounded-lg">
              <p className="text-sm text-neutral-300 mb-2">Альтернативный способ определения зоны доставки:</p>
              <p className="text-xs text-neutral-400">
                Введите адрес в поле поиска выше или позвоните нам для уточнения стоимости доставки.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-neutral-900 rounded-lg overflow-hidden">
      {/* Шапка с поиском */}
      <div className="bg-neutral-800 p-4 border-b border-neutral-700">
        <h3 className="text-lg font-bold text-white mb-3">
          Зоны доставки - Дмитров
        </h3>

        {/* Поиск адреса */}
        <div className="flex gap-2 mb-3">
          {yandexApiConfigured === false && (
            <div className="w-full mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200 text-sm">
              <div className="font-semibold mb-1">⚠️ Подсказки адресов отключены</div>
              <div className="text-xs">
                Для включения автодополнения адресов добавьте YANDEX_MAPS_API_KEY в переменные окружения.
                <br />
                <a
                  href="https://yandex.ru/dev/maps/geosearch/doc/concepts/suggest.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 underline hover:text-yellow-100"
                >
                  Получить API ключ →
                </a>
              </div>
            </div>
          )}
          <div className="flex-1 relative">
            <input
              id="address-input"
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              placeholder="Введите адрес в Дмитрове..."
              className="w-full px-4 py-2 border border-neutral-600 rounded-lg bg-neutral-700 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-800 border border-neutral-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`px-4 py-2 cursor-pointer border-b border-neutral-700 last:border-b-0 ${
                      index === selectedSuggestionIndex
                        ? 'bg-amber-600 text-white'
                        : 'hover:bg-neutral-700 text-white'
                    }`}
                  >
                    <div className="font-medium">{suggestion.title}</div>
                    {suggestion.subtitle && (
                      <div className="text-neutral-400 text-sm">{suggestion.subtitle}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAddressSearch}
            className="px-6 py-2 bg-amber-400 text-black rounded-lg hover:bg-amber-300 transition-colors font-semibold"
          >
            Найти
          </button>
        </div>


        {deliveryPrice === null && userLocation && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/50 text-red-300">
            <span className="font-semibold">
              Доставка по данному адресу не осуществляется
            </span>
          </div>
        )}

      </div>

      {/* Легенда */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-neutral-300">Зоны:</span>
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
          💡 Введите адрес в поле поиска выше для проверки стоимости доставки
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

    </div>
  );
}
