import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const apiKey = process.env.YANDEX_MAPS_API_KEY;

    console.log('YANDEX_MAPS_API_KEY configured:', !!apiKey, apiKey ? apiKey.substring(0, 10) + '...' : 'null');

    if (!apiKey || apiKey === 'ВАШ_API_КЛЮЧ_ЯНДЕКС') {
      console.error('YANDEX_MAPS_API_KEY not configured or using placeholder');
      return NextResponse.json(
        { error: 'Yandex Maps API key not configured. Please set YANDEX_MAPS_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Упрощенный запрос по примеру из документации
    const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodeURIComponent(query)}`;

    console.log('Fetching Yandex suggestions URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    // Также попробуем с дополнительными параметрами для Дмитрова
    // const bbox = '37.2,56.2~37.8,56.5'; // bounding box для Дмитрова
    // const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodeURIComponent(query)}&types=house&bbox=${bbox}&lang=ru_RU&results=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Kucher&Conga-Website/1.0'
      }
    });

    console.log('Yandex API response status:', response.status);
    console.log('Yandex API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Yandex API error body:', errorBody);
      console.error('Yandex API error:', response.status, response.statusText);

      return NextResponse.json(
        {
          error: 'Failed to fetch suggestions from Yandex',
          status: response.status,
          details: errorBody
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Yandex API response:', data);

    // Форматируем ответ
    const suggestions = data.results ? data.results.map(result => ({
      title: result.title.text,
      subtitle: result.subtitle?.text || '',
      coords: result.coords || null
    })) : [];

    return NextResponse.json({ results: suggestions });

  } catch (error) {
    console.error('Yandex suggest API error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
