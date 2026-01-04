// app/layout.js
export const metadata = {
  title: 'Кучер и Конга',
  description: 'Изысканная кухня: традиции, утончённый вкус и безупречная атмосфера.',
  icons: {
    icon: '/icon.svg',
  },
};

import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
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
                let reloadAttempts = 0;
                const maxReloadAttempts = 2;
                
                // Обработка ошибок загрузки ресурсов (404 для chunk файлов)
                window.addEventListener('error', function(e) {
                  const target = e.target;
                  
                  // Игнорируем CSP ошибки и ошибки от внешних сервисов (Vercel Live и т.д.)
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
                    (url && url.includes('react.dev/errors/418'))
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
                      console.log('Attempting to reload page... (attempt ' + reloadAttempts + ')');
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
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
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
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
                    console.warn('Ignoring CSP or React hydration error:', msg, url);
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
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
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
