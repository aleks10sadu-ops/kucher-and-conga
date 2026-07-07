import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

const makeReq = (body: unknown) =>
    new Request('http://localhost/api/vacancy-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

describe('POST /api/vacancy-apply', () => {
    beforeEach(() => {
        process.env.VACANCY_SHEETS_WEBHOOK_URL = 'https://script.google.com/test';
        vi.restoreAllMocks();
    });

    it('400 без ФИО', async () => {
        const res = await POST(makeReq({ phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(400);
    });

    it('400 без телефона', async () => {
        const res = await POST(makeReq({ fio: 'Иванов Иван', vacancy: 'Официант' }));
        expect(res.status).toBe(400);
    });

    it('200 и проксирует валидную анкету в Google Script', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
        const res = await POST(makeReq({ fio: 'Иванов Иван', phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith('https://script.google.com/test', expect.objectContaining({ method: 'POST' }));
    });

    it('502 если Google Script недоступен', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
        const res = await POST(makeReq({ fio: 'Иванов Иван', phone: '+79161234567', vacancy: 'Официант' }));
        expect(res.status).toBe(502);
    });
});
