import { iikoPost } from './client';
import { getIikoConfig } from './config';

interface TokenResponse {
  token: string;
}

const TTL_MS = 55 * 60 * 1000;
let cached: { token: string; expiresAt: number } | null = null;

export async function getToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.token;
  }
  const { apiLogin } = getIikoConfig();
  const data = await iikoPost<TokenResponse>('/api/1/access_token', { apiLogin });
  cached = { token: data.token, expiresAt: now + TTL_MS };
  return data.token;
}

export function __resetTokenCache(): void {
  cached = null;
}
