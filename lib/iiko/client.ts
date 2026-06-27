import { getIikoConfig } from './config';

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
