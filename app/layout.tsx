import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Vollkorn, Golos_Text } from 'next/font/google';
import React from 'react';
import { SITE, SITE_URL } from './components/forest/site';
import { buildRestaurantGraph, serializeJsonLd } from '@/lib/seo/structuredData';
import YandexGoalTracker from './components/analytics/YandexGoalTracker';
import { YANDEX_METRIKA_COUNTER_ID } from '@/lib/analytics/yandexMetrika';

// Шрифты дизайн-системы «Перевёрнутый лес» — грузятся один раз в корне и доступны
// всем страницам как CSS-переменные (--font-display / --font-body).
const vollkorn = Vollkorn({
    subsets: ['cyrillic', 'latin'],
    weight: ['600', '700', '900'],
    style: ['normal', 'italic'],
    variable: '--font-display',
    display: 'swap',
});
const golos = Golos_Text({
    subsets: ['cyrillic', 'latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-body',
    display: 'swap',
});

export const YANDEX_METRIKA_SCRIPT = `
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_COUNTER_ID}', 'ym');

    ym(${YANDEX_METRIKA_COUNTER_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});

    (function(m, counterId) {
        var previousUrl = m.location.href;
        var trackPageView = function() {
            var currentUrl = m.location.href;
            if (currentUrl === previousUrl) return;
            m.ym(counterId, 'hit', currentUrl, {referer: previousUrl, title: m.document.title});
            previousUrl = currentUrl;
        };
        var wrapHistoryMethod = function(method) {
            var original = m.history[method];
            m.history[method] = function() {
                var result = original.apply(this, arguments);
                trackPageView();
                return result;
            };
        };
        wrapHistoryMethod('pushState');
        wrapHistoryMethod('replaceState');
        m.addEventListener('popstate', trackPageView);
    })(window, ${YANDEX_METRIKA_COUNTER_ID});
`;

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE.name,
    title: {
        default: 'Кучер & Conga — ресторан в Дмитрове',
        template: '%s',
    },
    description: 'Авторская кухня, зал Conga с подвешенным лесом, банкеты и доставка в Дмитрове.',
    alternates: {
        languages: { 'ru-RU': '/' },
    },
    openGraph: {
        type: 'website',
        locale: 'ru_RU',
        url: '/',
        siteName: SITE.name,
        title: 'Кучер & Conga — ресторан в Дмитрове',
        description: 'Авторская кухня, зал Conga с подвешенным лесом, банкеты и доставка в Дмитрове.',
        images: [{ url: '/hero-image.webp', alt: 'Зал ресторана Кучер & Conga в Дмитрове' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Кучер & Conga — ресторан в Дмитрове',
        description: 'Авторская кухня, банкеты и доставка в Дмитрове.',
        images: ['/hero-image.webp'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    icons: {
        icon: [
            { url: '/favicon-v4.ico', type: 'image/x-icon', sizes: '256x256' },
            { url: '/favicon-48x48-v4.png', type: 'image/png', sizes: '48x48' },
            { url: '/kucher-conga-favicon-v4.svg', type: 'image/svg+xml', sizes: 'any' },
        ],
        shortcut: '/favicon-v4.ico',
        apple: [{ url: '/apple-touch-icon-v4.png', type: 'image/png', sizes: '180x180' }],
    },
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="ru" className={`${vollkorn.variable} ${golos.variable}`}>
            <head>
                {/* Обработка ошибок загрузки чанков */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              if (typeof window !== 'undefined') {
                const storageKey = 'chunk_reload_attempts';
                // Reset attempts if it's been more than 60 seconds since last reload to avoid getting stuck forever later
                const lastReload = parseInt(sessionStorage.getItem(storageKey + '_time') || '0', 10);
                if (Date.now() - lastReload > 60000) {
                   sessionStorage.setItem(storageKey, '0');
                }
                
                let reloadAttempts = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
                const maxReloadAttempts = 3;
                
                // Обработка ошибок загрузки ресурсов
                window.addEventListener('error', function(e) {
                  const target = e.target;
                  const filename = e.filename;
                  
                  // Игнорируем CSP ошибки и ошибки от внешних сервисов
                  const isCSPError = e.message && (
                    e.message.includes('Content Security Policy') ||
                    e.message.includes('CSP') ||
                    (target && target.src && (
                      target.src.includes('vercel.live') ||
                      target.src.includes('_next-live')
                    ))
                  );
                  
                  // Игнорируем React hydration ошибки (#418)
                  const isReactHydrationError = e.message && (
                    e.message.includes('Minified React error #418') ||
                    e.message.includes('React error #418') ||
                    (filename && filename.includes('react.dev/errors/418'))
                  );
                  
                  if (isCSPError || isReactHydrationError) {
                    console.warn('Ignoring CSP or React hydration error:', e.message || target?.src);
                    return false;
                  }
                  
                  const isChunkError = target && (
                    (target.tagName === 'SCRIPT' && target.src && target.src.includes('/_next/static/chunks/')) ||
                    (target.tagName === 'LINK' && target.href && target.href.includes('/_next/static/chunks/'))
                  );
                  
                  if (isChunkError && e.target.status === 404) {
                    console.warn('Chunk file 404 error detected:', e.target.src || e.target.href);
                    if (reloadAttempts < maxReloadAttempts) {
                      reloadAttempts++;
                      sessionStorage.setItem(storageKey, String(reloadAttempts));
                      sessionStorage.setItem(storageKey + '_time', String(Date.now()));
                      console.log('Attempting to reload page... (attempt ' + reloadAttempts + ')');
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    } else {
                      console.error('Max reload attempts reached. Please clear cache and reload manually.');
                    }
                    e.preventDefault();
                    return false;
                  }
                  
                  // Обработка ошибок загрузки через сообщения
                  if (e.message && (
                    e.message.includes('Failed to load chunk') ||
                    e.message.includes('Loading chunk') ||
                    e.message.includes('ChunkLoadError')
                  )) {
                    console.warn('Chunk loading error:', e.message);
                    if (reloadAttempts < maxReloadAttempts) {
                      reloadAttempts++;
                      sessionStorage.setItem(storageKey, String(reloadAttempts));
                      sessionStorage.setItem(storageKey + '_time', String(Date.now()));
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    }
                  }
                }, true);
                
                // Обработка ошибок через window.onerror
                const originalError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  // Игнорируем CSP ошибки
                  const isCSPError = msg && (
                    msg.includes('Content Security Policy') ||
                    msg.includes('CSP') ||
                    (url && (
                      url.includes('vercel.live') ||
                      url.includes('_next-live')
                    ))
                  );
                  
                  // Игнорируем React hydration ошибки (#418)
                  const isReactHydrationError = msg && (
                    msg.includes('Minified React error #418') ||
                    msg.includes('React error #418') ||
                    (url && url.includes('react.dev/errors/418'))
                  );
                  
                  if (isCSPError || isReactHydrationError) {
                    return false;
                  }
                  
                  const isChunkRelated = url && (
                    url.includes('/_next/static/chunks/') ||
                    url.includes('chunk') ||
                    (msg && (msg.includes('Failed to load chunk') || msg.includes('ChunkLoadError')))
                  );
                  
                  if (isChunkRelated) {
                    console.warn('Chunk error detected:', msg, url);
                    if (reloadAttempts < maxReloadAttempts) {
                      reloadAttempts++;
                      sessionStorage.setItem(storageKey, String(reloadAttempts));
                      sessionStorage.setItem(storageKey + '_time', String(Date.now()));
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                      return true;
                    }
                  }
                  
                  if (originalError) {
                    return originalError.apply(this, arguments);
                  }
                  return false;
                };
              }
            `,
                    }}
                />
            </head>
            <body className="antialiased bg-slate-50">
                <Script
                    id="yandex-metrika"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{ __html: YANDEX_METRIKA_SCRIPT }}
                />
                <noscript>
                    <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_COUNTER_ID}`}
                            width="1"
                            height="1"
                            style={{ position: 'absolute', left: '-9999px' }}
                            alt=""
                        />
                    </div>
                </noscript>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildRestaurantGraph()) }}
                />
                {children}
                <YandexGoalTracker />
                <SpeedInsights />
            </body>
        </html>
    );
}
