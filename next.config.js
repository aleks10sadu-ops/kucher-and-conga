/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './lib/media/imageLoader.js',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'mmyfglktqvojwpycreko.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.selstorage.ru',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    qualities: [60, 70, 75, 80, 85, 90],
    // Увеличенное время кеширования изображений (1 неделя)
    minimumCacheTTL: 604800,
    // Настройки для оптимизации
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
  },
  // Оптимизация производительности
  compress: true,
  poweredByHeader: false,
  // Сохраняем поисковый трафик после переноса со старой структуры сайта.
  async redirects() {
    return [
      { source: '/about', destination: '/', permanent: true },
      { source: '/contacts', destination: '/#find', permanent: true },
      { source: '/foto', destination: '/#atmosphere', permanent: true },
      { source: '/akcii-restorana', destination: '/promotions', permanent: true },
      { source: '/dostavka', destination: '/delivery', permanent: true },
      { source: '/delivery/shashlyk', destination: '/menu?category=shashlyk#delivery', permanent: true },
      { source: '/delivery/khinkali', destination: '/menu?category=khinkali#delivery', permanent: true },
      { source: '/menu/shashlyk', destination: '/menu?category=shashlyk#delivery', permanent: true },
      { source: '/menu/khinkali', destination: '/menu?category=khinkali#delivery', permanent: true },
      { source: '/shashlyk-dmitrov', destination: '/menu?category=shashlyk#delivery', permanent: true },
      { source: '/khinkali-dmitrov', destination: '/menu?category=khinkali#delivery', permanent: true },
      { source: '/osnovnoe-menyu', destination: '/menu#main', permanent: true },
      { source: '/detskoe-menyu', destination: '/menu#main', permanent: true },
      { source: '/barnoe-menyu', destination: '/menu#bar', permanent: true },
      { source: '/vinnaya-karta', destination: '/menu#wine', permanent: true },
      { source: '/biznes-lanch', destination: '/business-lunch', permanent: true },
      { source: '/banketnoe-menyu', destination: '/menu#banquet', permanent: true },
      { source: '/services', destination: '/halls', permanent: true },
      { source: '/besedki', destination: '/halls/besedki-kucher', permanent: true },
      { source: '/izumrudnyj-zal', destination: '/halls/izumrudnyj-zal', permanent: true },
      { source: '/rubinovyj-zal', destination: '/halls/rubinovyj-zal', permanent: true },
      { source: '/shokoladnyj-zal', destination: '/halls/shokoladnyj-zal', permanent: true },
      { source: '/halls/banketnye-zaly-rubin', destination: '/halls/rubinovyj-zal', permanent: true },
      { source: '/halls/banketnye-zaly', destination: '/halls', permanent: true },
      { source: '/letnyaya-veranda', destination: '/halls/letnyaya-veranda', permanent: true },
      { source: '/detskaya-ploshchadka', destination: '/halls', permanent: true },
      { source: '/detskaya-komnata', destination: '/halls', permanent: true },
      { source: '/kalyannaya', destination: '/halls/barnyy-zal', permanent: true },
      { source: '/novosti', destination: '/events', permanent: true },
      { source: '/novosti/:path*', destination: '/events', permanent: true },
      { source: '/novogodnyaya-noch-i-korporativy', destination: '/events', permanent: true },
      { source: '/nashi-vakansii', destination: '/vacancies', permanent: true },
      { source: '/politika-konfidecialnosti', destination: '/privacy', permanent: true },
      { source: '/pravila-nahozhdeniya-gostej-v-restorane', destination: '/rules', permanent: true },
    ];
  },
  // Оптимизация для внешних ресурсов и кеширования
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          // Защита от кликджекинга
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Предотвращение MIME-sniffing атак
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Защита от XSS атак
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Политика реферера
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Изоляция источников (COOP)
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          // Политика встраивания (COEP) - мягкая для совместимости с внешними ресурсами
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          },
          // Permissions Policy (бывший Feature-Policy)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          },
          // Строгий HSTS (только для production с HTTPS)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
          // Content Security Policy
          // В dev режиме более мягкая политика для hot reload, но с доменом бронирований
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://yandex.ru https://api-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.yandex.ru https://yastatic.net https://*.yastatic.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "child-src blob: https://mc.yandex.ru https://mc.webvisor.com https://mc.webvisor.org",
              "frame-src 'self' blob: https://yandex.ru https://*.yandex.ru https://*.yandex.kz https://mc.webvisor.com https://mc.webvisor.org https://vercel.live https://*.vercel.live",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru https://*.yandex.ru wss://mc.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://mc.webvisor.com https://mc.webvisor.org wss://mc.webvisor.com wss://mc.webvisor.org https://k-c-reservations.vercel.app https://*.vercel.app https://vercel.live https://*.vercel.live https://va.vercel-scripts.com wss://*.pusher.com https://*.pusher.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self' https://metrika.yandex.ru https://metrica.yandex.ru",
              "upgrade-insecure-requests"
            ].join('; ')
          }] : [{
            // Dev режим: более мягкая CSP для разработки, но с доменом бронирований
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* wss://localhost:* https://yandex.ru https://api-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.yandex.ru https://yastatic.net https://*.yastatic.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "child-src blob: https://mc.yandex.ru https://mc.webvisor.com https://mc.webvisor.org",
              "frame-src 'self' blob: https://yandex.ru https://*.yandex.ru https://*.yandex.kz https://mc.webvisor.com https://mc.webvisor.org",
              "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru https://*.yandex.ru wss://mc.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://mc.webvisor.com https://mc.webvisor.org wss://mc.webvisor.com wss://mc.webvisor.org https://k-c-reservations.vercel.app https://*.vercel.app https://vercel.live https://*.vercel.live https://va.vercel-scripts.com wss://*.pusher.com https://*.pusher.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }]),
        ],
      },
      // Иммутабельный кеш статики — ТОЛЬКО в проде (там имена содержат контент-хеш).
      // В dev это ломало обновление чанков и CSS: браузер держал старую версию под
      // стабильным URL, из-за чего правки не подхватывались без переименования файлов.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2|ttf|eot)',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
            {
              source: '/_next/static/:path*',
              headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
            },
          ]
        : []),
    ];
  },
  // Настройка для современных браузеров (ES6+)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Указываем корень проекта для устранения предупреждения о множественных lockfiles
  outputFileTracingRoot: path.join(__dirname),
  // Явный корень для Turbopack: без него dev-сервер из git worktree не стартует
  // (Turbopack выводит корень по родительскому lockfile и теряет пакет next)
  turbopack: {
    root: __dirname,
  },
  // Настройки для обработки ошибок загрузки чанков
  onDemandEntries: {
    // Период времени в мс, в течение которого страница остается в памяти
    maxInactiveAge: 25 * 1000,
    // Количество страниц, которые должны быть сохранены одновременно
    pagesBufferLength: 2,
  },
  // Отключаем строгую проверку типов для production сборки (может помочь с chunk ошибками)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Настройки для улучшения стабильности сборки
  experimental: {
    // Улучшенная обработка ошибок
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
