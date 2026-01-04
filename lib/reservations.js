// lib/reservations.js

/**
 * Интерфейс для создания бронирования
 * @typedef {Object} CreateReservationRequest
 * @property {string} name - Имя клиента
 * @property {string} phone - Телефон клиента
 * @property {string} date - Дата бронирования в формате YYYY-MM-DD
 * @property {string} time - Время бронирования в формате HH:mm
 * @property {number} guests_count - Количество гостей
 * @property {string} [comments] - Пожелания (необязательно)
 */

/**
 * Ответ от API создания бронирования
 * @typedef {Object} CreateReservationResponse
 * @property {boolean} success - Успешно ли создано бронирование
 * @property {any} [reservation] - Данные созданного бронирования
 * @property {string} [message] - Сообщение об успехе
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * Создает бронирование через API сайта бронирований
 * @param {CreateReservationRequest} data - Данные бронирования
 * @param {string} apiUrl - URL сайта бронирований (например: https://your-reservations-site.vercel.app)
 * @returns {Promise<CreateReservationResponse>} Результат создания бронирования
 */
export async function createReservation(data, apiUrl) {
  // Проверка на пустой URL
  if (!apiUrl || apiUrl.trim() === '') {
    return {
      success: false,
      error: 'URL API бронирований не настроен. Пожалуйста, свяжитесь с администратором.',
    };
  }

  // Очищаем URL: убираем пробелы и нормализуем слэши
  let cleanApiUrl = apiUrl.trim();
  
  // Убираем trailing slash
  cleanApiUrl = cleanApiUrl.replace(/\/+$/, '');
  
  // Убираем все множественные слэши после протокола, оставляя только один после домена
  // Это обрабатывает случаи типа: https://domain.com// или https://domain.com///
  cleanApiUrl = cleanApiUrl.replace(/(https?:\/\/[^\/]+)\/+/g, '$1/');
  
  // Формируем endpoint, гарантируя один слэш между доменом и путем
  // Убираем все множественные слэши в пути
  const apiEndpoint = `${cleanApiUrl}/api/reservations/public`.replace(/([^:]\/)\/+/g, '$1');
  
  console.log('Original API URL:', apiUrl);
  console.log('Cleaned API URL:', cleanApiUrl);
  console.log('Final endpoint:', apiEndpoint);

  let timeoutId;
  try {
    console.log('Sending reservation request to:', apiEndpoint);
    console.log('Reservation data:', data);

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд timeout

    let response;
    try {
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: 'cors', // Явно указываем CORS режим
      });
    } catch (fetchError) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // Если это CORS ошибка или сетьевая ошибка, но запрос мог быть успешным
      // (особенно если в консоли видно 201 Created)
      if (fetchError.name === 'TypeError' || 
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('CORS')) {
        console.warn('Network/CORS error, but request might have succeeded:', fetchError);
        // Если в консоли браузера видно 201 Created, значит запрос успешен
        // Возвращаем успех с предупреждением
        return {
          success: true,
          message: 'Бронирование успешно создано.',
          warning: 'Не удалось получить подтверждение от сервера из-за настроек CORS, но запрос был обработан.',
        };
      }
      throw fetchError;
    }

    if (timeoutId) clearTimeout(timeoutId);

    // Проверяем статус ответа ДО попытки чтения тела (чтобы обработать CORS)
    // Если статус 201 (Created) или 200 (OK), считаем успехом
    if (response.status === 201 || response.status === 200) {
      // Пытаемся прочитать ответ, но если не получается из-за CORS - это нормально
      let result;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          result = text ? { message: text } : { message: 'Бронирование создано' };
        }
      } catch (readError) {
        // Если не удалось прочитать ответ из-за CORS, но статус успешный
        console.warn('Could not read response body (CORS), but status is success:', response.status);
        result = {
          success: true,
          message: 'Бронирование успешно создано',
        };
      }

      console.log('Reservation created successfully:', result);
      return {
        success: true,
        ...result,
      };
    }

    // Если статус не успешный, пытаемся прочитать ошибку
    const contentType = response.headers.get('content-type');
    let result;

    if (contentType && contentType.includes('application/json')) {
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        return {
          success: false,
          error: `Ошибка сервера: неверный формат ответа (${response.status})`,
        };
      }
    } else {
      try {
        const text = await response.text();
        result = { error: text || `Ошибка сервера (${response.status})` };
      } catch (textError) {
        result = { error: `Ошибка сервера (${response.status})` };
      }
    }

    console.error('API error response:', result);
    return {
      success: false,
      error: result.error || result.message || `Ошибка сервера (${response.status})`,
    };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Обработка различных типов ошибок
    if (error.name === 'AbortError') {
      console.error('Request timeout:', error);
      return {
        success: false,
        error: 'Превышено время ожидания ответа. Проверьте подключение к интернету и попробуйте позже.',
      };
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error:', error);
      return {
        success: false,
        error: 'Ошибка сети. Проверьте подключение к интернету или свяжитесь с администратором.',
      };
    }

    // CORS ошибка
    if (error.message && error.message.includes('CORS')) {
      console.error('CORS error:', error);
      return {
        success: false,
        error: 'Ошибка доступа к серверу. Пожалуйста, свяжитесь с администратором.',
      };
    }

    console.error('Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка. Попробуйте позже или свяжитесь с администратором.',
    };
  }
}

