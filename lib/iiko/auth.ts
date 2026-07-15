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
  const { apiLogin, appId, appSecret } = getIikoConfig();

  // Авторизация v2 (Developer Portal iiko): appId + clientSecret + apiKey.
  // apiKey — это существующий apiLogin, получать заново не нужно.
  // Старый /api/1/access_token (только apiLogin) iiko скоро отключит — используем v2,
  // как только в env заданы IIKO_APP_ID и IIKO_APP_SECRET; иначе откат на v1.
  const data =
    appId && appSecret
      ? await iikoPost<TokenResponse>('/api/v2/access_token', {
          apiKey: apiLogin,
          appId,
          clientSecret: appSecret,
        })
      : await iikoPost<TokenResponse>('/api/1/access_token', { apiLogin });

  cached = { token: data.token, expiresAt: now + TTL_MS };
  return data.token;
}

export function __resetTokenCache(): void {
  cached = null;
}
