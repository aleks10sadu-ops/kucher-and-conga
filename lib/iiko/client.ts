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

export async function iikoPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const { baseUrl } = getIikoConfig();
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new IikoError(`iiko ${path} -> ${res.status}`, res.status, text.slice(0, 500));
  }
  return JSON.parse(text) as T;
}
