import net from 'node:net';
import { getIikoConfig } from './config';

// Отключаем Happy Eyeballs (autoSelectFamily, включён по умолчанию в Node 20+):
// на некоторых маршрутах/VPN к РФ-хосту iiko параллельные connect-попытки undici
// зависают и fetch падает с UND_ERR_CONNECT_TIMEOUT, хотя прямое TLS-соединение
// проходит. Отключение возвращает последовательный connect и чинит обращения к iiko.
// Безопасно и на сервере Vercel (Linux) — там это поведение по умолчанию до Node 20.
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}

export class IikoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'IikoError';
  }
}

// Маршрут к РФ-хосту iiko (часто через VPN) периодически зависает на connect.
// Поэтому: жёсткий таймаут на попытку + несколько ретраев на СЕТЕВЫЕ сбои.
// HTTP-ответы с ошибкой (4xx/5xx) — это реальный ответ сервера, их не ретраим.
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

export async function iikoPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const { baseUrl } = getIikoConfig();
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(baseUrl + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const text = await res.text();
      if (!res.ok) {
        // Реальный ответ сервера — не ретраим, отдаём наверх.
        throw new IikoError(`iiko ${path} -> ${res.status}`, res.status, text.slice(0, 500));
      }
      return JSON.parse(text) as T;
    } catch (e) {
      if (e instanceof IikoError) throw e; // HTTP-ошибка — без ретраев
      lastError = e; // сетевой сбой / таймаут — пробуем ещё раз
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
  }

  throw lastError;
}
