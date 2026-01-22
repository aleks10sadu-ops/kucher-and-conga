import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Кучер и Конга',
    description: 'Изысканная кухня: традиции, утончённый вкус и безупречная атмосфера.',
    icons: {
        icon: '/icon.svg',
    },
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="ru">
            <head>
                {/* Preconnect для Supabase (основной источник изображений) */}
                <link rel="preconnect" href="https://mmyfglktqvojwpycreko.supabase.co" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://mmyfglktqvojwpycreko.supabase.co" />
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
                {children}
                <SpeedInsights />
            </body>
        </html>
    );
}
