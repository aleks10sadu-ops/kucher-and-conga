import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.YANDEX_MAPS_API_KEY;

    if (!apiKey || apiKey === 'ВАШ_API_КЛЮЧ_ЯНДЕКС') {
      return NextResponse.json({
        configured: false,
        message: 'YANDEX_MAPS_API_KEY не настроен или использует placeholder значение',
        current_value: apiKey || 'не установлен'
      });
    }

    // Тестовый запрос к API Яндекса (упрощенный, как в документации)
    const testQuery = 'Дмитров';
    const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodeURIComponent(testQuery)}`;

    console.log('Testing Yandex API key with URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Kucher&Conga-Website/1.0'
      }
    });

    console.log('Test response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        configured: true,
        message: 'YANDEX_MAPS_API_KEY настроен корректно',
        test_result: 'success',
        api_key_prefix: apiKey.substring(0, 10) + '...',
        suggestions_count: data.results ? data.results.length : 0
      });
    } else {
      const errorText = await response.text();
      console.error('Yandex API test failed:', response.status, errorText);

      return NextResponse.json({
        configured: true,
        message: 'YANDEX_MAPS_API_KEY настроен, но API вернул ошибку',
        test_result: 'failed',
        status: response.status,
        error: errorText
      }, { status: 200 }); // Возвращаем 200, чтобы показать результат теста
    }

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      {
        configured: false,
        message: 'Ошибка при тестировании API ключа',
        error: error.message
      },
      { status: 500 }
    );
  }
}
