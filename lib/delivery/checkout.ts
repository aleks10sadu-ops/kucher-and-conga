export const formatOrderTimeInput = (value: string) => {
    const cleaned = value.replace(/[^\d:]/g, '');
    if (cleaned.includes(':')) {
        const [hours, minutes = ''] = cleaned.split(':');
        return `${hours.slice(0, 2)}:${minutes.slice(0, 2)}`;
    }
    const digits = cleaned.slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

export const normalizeOrderTimeInput = (value: string) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
};

export const buildScheduledOrderDateTime = (date: string, time: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
        ? `${date}T${time}:00`
        : '';

export type CheckoutSubmissionResult =
    | { ok: true }
    | { ok: false; message: string };

export async function submitCheckoutOrder(
    payload: Record<string, unknown>,
    fetcher: typeof fetch = fetch,
    fallbackPayload: Record<string, unknown> = payload,
): Promise<CheckoutSubmissionResult> {
    if (payload.fulfillmentType !== 'pickup' &&
        (typeof payload.zoneName !== 'string' || !payload.zoneName.trim())) {
        return {
            ok: false,
            message: 'Не удалось определить зону доставки. Уточните адрес или выберите точку на карте.',
        };
    }
    let response: Response;
    const requestId = typeof payload.requestId === 'string' ? payload.requestId : crypto.randomUUID();
    payload = { ...payload, requestId };
    // Re-submit the exact same request through the validated server path.
    fallbackPayload = { ...payload, type: 'delivery' };
    try {
        response = await fetcher('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('iiko order network failure, TG fallback:', error);
        return sendTelegramFallback(fallbackPayload, fetcher);
    }

    let data: { ok?: boolean; message?: string; error?: string } = {};
    try {
        data = await response.json();
    } catch (error) {
        if (response.status >= 500) {
            console.error('iiko order server failure, TG fallback:', error);
            return sendTelegramFallback(fallbackPayload, fetcher);
        }
        return { ok: false, message: 'Проверьте данные заказа.' };
    }

    if (response.status < 500) {
        if (!response.ok || !data.ok) {
            return { ok: false, message: data.message || data.error || 'Проверьте данные заказа.' };
        }
        return { ok: true };
    }

    console.error('iiko order server failure, TG fallback:', data.error || response.status);
    return sendTelegramFallback(fallbackPayload, fetcher);
}

async function sendTelegramFallback(
    payload: Record<string, unknown>,
    fetcher: typeof fetch,
): Promise<CheckoutSubmissionResult> {
    try {
        const response = await fetcher('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            return { ok: false, message: 'Не удалось отправить заказ. Позвоните нам, пожалуйста.' };
        }
        return { ok: true };
    } catch (error) {
        console.error('TG fallback failed:', error);
        return { ok: false, message: 'Не удалось отправить заказ. Позвоните нам, пожалуйста.' };
    }
}
