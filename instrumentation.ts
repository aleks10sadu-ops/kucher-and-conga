// Runs once at server startup (Next.js instrumentation hook), before any
// route handler or Server Action executes.
//
// Disables Happy Eyeballs (autoSelectFamily, default-on in Node 20+): on some
// VPN/RU routes to the iiko host (api-ru.iiko.services) undici's parallel
// connect attempts hang and fetch fails with UND_ERR_CONNECT_TIMEOUT, even
// though a direct TLS connection succeeds. Setting it here guarantees the flag
// is applied process-wide for every server path, not just whichever module
// happens to load lib/iiko/client.ts first.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const net = await import('node:net');
    if (typeof net.setDefaultAutoSelectFamily === 'function') {
      net.setDefaultAutoSelectFamily(false);
    }
  }
}
