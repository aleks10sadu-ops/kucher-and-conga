import { NextResponse, NextRequest } from 'next/server';

interface YandexSuggestResult {
  title: { text: string } | string;
  subtitle?: { text: string } | string;
  coords?: any;
}

interface YandexSuggestResponse {
  results?: YandexSuggestResult[];
}

export async function GET(request: NextRequest) {
  console.log('=== YANDEX SUGGEST REQUEST STARTED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Full request URL:', request.url);
  console.log('Request method:', request.method);

  // Временная ошибка для проверки
  // return new Response('Test error', { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    console.log('Query parameter:', query, 'Length:', query ? query.length : 'null');

    if (!query || query.length < 3) {
      console.log('Query too short or empty, returning empty results');
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

    // Запрос без строгих ограничений сначала
    const encodedQuery = encodeURIComponent(query);
    const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodedQuery}&lang=ru_RU&results=5`;

    console.log('=== FETCHING YANDEX SUGGESTIONS ===');
    console.log('Original query:', query);
    console.log('Encoded query:', encodedQuery);
    console.log('Full URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    // Также попробуем с дополнительными параметрами для Дмитрова
    // const bbox = '37.2,56.2~37.8,56.5'; // bounding box для Дмитрова
    // const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=${apiKey}&text=${encodeURIComponent(query)}&types=house&bbox=${bbox}&lang=ru_RU&results=5`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Kucher&Conga-Website/1.0'
      }
    });

    console.log('Yandex API response status:', response.status);
    // console.log('Yandex API response headers:', Object.fromEntries(response.headers.entries()));

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

    const data = await response.json() as YandexSuggestResponse;
    console.log('Yandex API response data:', JSON.stringify(data, null, 2));
    console.log('Results count:', data.results ? data.results.length : 0);

    // Форматируем ответ
    const suggestions = data.results ? data.results.map(result => ({
      title: typeof result.title === 'object' ? result.title.text : result.title,
      subtitle: typeof result.subtitle === 'object' ? result.subtitle.text : (result.subtitle || ''),
      coords: result.coords || null
    })) : [];

    console.log('Formatted suggestions:', suggestions);
    return NextResponse.json({ results: suggestions });

  } catch (error: any) {
    console.error('Yandex suggest API error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
