import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type HeaderRule = {
    source: string;
    headers: Array<{ key: string; value: string }>;
};

const require = createRequire(import.meta.url);
const nextConfig = require('../next.config.js') as {
    headers?: () => Promise<HeaderRule[]>;
};

describe('Yandex Metrika CSP', () => {
    it('allows Webvisor recording frames and connections', async () => {
        const rules = (await nextConfig.headers?.()) || [];
        const globalRule = rules.find((rule) => rule.source === '/:path*');
        const policy = globalRule?.headers.find((header) => header.key === 'Content-Security-Policy')?.value || '';

        expect(policy).toContain('child-src blob: https://mc.yandex.ru');
        expect(policy).toContain("frame-src 'self' blob: https://yandex.ru");
        expect(policy).toContain('https://mc.webvisor.com');
        expect(policy).toContain('wss://mc.yandex.ru');
        if (process.env.NODE_ENV === 'production') expect(policy).not.toContain("'unsafe-eval'");
    });
});
