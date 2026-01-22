/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
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
    ],
    formats: ['image/webp', 'image/avif'],
    qualities: [70, 75, 80, 85, 90],
    // Увеличенное время кеширования изображений (1 неделя)
    minimumCacheTTL: 604800,
    // Настройки для оптимизации
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Оптимизация производительности
  compress: true,
  poweredByHeader: false,
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://yandex.ru https://api-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.yandex.ru https://yastatic.net https://*.yastatic.net",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "frame-src 'self' https://yandex.ru https://*.yandex.ru https://*.yandex.kz https://vercel.live https://*.vercel.live",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://k-c-reservations.vercel.app https://*.vercel.app https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
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
              "frame-src 'self' https://yandex.ru https://*.yandex.ru https://*.yandex.kz",
              "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.supabase.co wss://*.supabase.co https://api-maps.yandex.ru https://*.yandex.ru https://*.yandex.net https://yastatic.net https://*.yastatic.net https://k-c-reservations.vercel.app https://*.vercel.app https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }]),
        ],
      },
      // Кеширование для статических ресурсов
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Кеширование для статических чанков Next.js (с хешем в имени)
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Кеширование для статических файлов Next.js (CSS, JS с хешем)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Настройка для современных браузеров (ES6+)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Указываем корень проекта для устранения предупреждения о множественных lockfiles
  outputFileTracingRoot: path.join(__dirname),
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
