// Server-only credentials. Never import this module from a client component.
type Product = { id: string; name: string; deleted?: boolean };

export function hasDirectNamesSource(): boolean {
  return Boolean(process.env.IIKO_SERVER_URL?.trim());
}

export async function getServerProductNames(): Promise<Map<string, string>> {
  const base = process.env.IIKO_SERVER_URL?.trim().replace(/\/$/, '');
  const login = process.env.IIKO_SERVER_LOGIN;
  const passwordHash = process.env.IIKO_SERVER_PASSWORD_SHA1;
  if (!base || !login || !passwordHash) throw new Error('Incomplete iikoServer configuration');
  const baseUrl = new URL(base);
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error('iikoServer requires an HTTPS URL without credentials or query parameters');
  }
  if (!/^[a-f0-9]{40}$/i.test(passwordHash)) throw new Error('Invalid iikoServer password hash configuration');

  const request = async (path: string, params: Record<string, string>, timeout = 12_000) => {
    const url = new URL(`${base}/api/${path}`);
    url.search = new URLSearchParams(params).toString();
    try {
      return await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(timeout) });
    } catch {
      // Do not expose URLs containing authentication hashes or API keys in logs.
      throw new Error('iikoServer connection failed or timed out');
    }
  };

  const auth = await request('auth', { login, pass: passwordHash });
  if (!auth.ok) throw new Error(`iikoServer authentication HTTP ${auth.status}`);
  const key = (await auth.text()).trim().replace(/^"|"$/g, '');
  if (!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(key)) throw new Error('Invalid iikoServer authentication response');
  try {
    const response = await request('v2/entities/products/list', { key, includeDeleted: 'false' });
    if (!response.ok) throw new Error(`iikoServer products HTTP ${response.status}`);
    const products: unknown = await response.json();
    if (!Array.isArray(products) || products.some((p) => !p || typeof p.id !== 'string' || typeof p.name !== 'string')) {
      throw new Error('Invalid iikoServer products response');
    }
    return new Map((products as Product[])
      .filter((p) => !p.deleted && p.name.trim())
      .map((p) => [p.id, p.name.trim()]));
  } finally {
    // API sessions can consume a license slot. Release even when products fail.
    try {
      const logout = await request('logout', { key }, 5_000);
      if (!logout.ok) console.warn(`[iikoServer] Session cleanup HTTP ${logout.status}`);
    } catch {
      console.warn('[iikoServer] Session cleanup failed');
    }
  }
}
