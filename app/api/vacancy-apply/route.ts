// Принимает анкету отклика на вакансию. Полная анкета пишется в Google Sheets
// (env VACANCY_SHEETS_WEBHOOK_URL, настройка: docs/google-sheets-vacancies-setup.md),
// плюс краткий пинг в Telegram-группу (env TELEGRAM_VACANCY_CHAT_ID, иначе TELEGRAM_CHAT_ID),
// чтобы знать о новом отклике сразу. Отклик считается принятым, если сработал ХОТЯ БЫ ОДИН
// канал — так форма доступна в любое время, даже если Google временно недоступен.
import { NextResponse } from 'next/server';

const MAX_LEN = 1000;

const FIELDS = ['vacancy', 'fio', 'phone', 'age', 'citizenship', 'experience', 'medbook', 'startDate', 'salary', 'resume', 'comment'] as const;

const esc = (s: string = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Полная анкета → Google Sheets. Две попытки: сетевые таймауты к Google бывают разовыми.
async function sendToSheets(data: Record<string, string>): Promise<boolean> {
    const url = process.env.VACANCY_SHEETS_WEBHOOK_URL;
    if (!url) return false;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(15000),
            });
            if (res.ok) return true;
        } catch {
            /* повторим */
        }
    }
    return false;
}

// Краткий пинг в Telegram: вакансия, имя, телефон, ссылка — деталей достаточно, чтобы
// среагировать, даже если Google-таблица недоступна. Полная анкета — в таблице.
async function pingTelegram(data: Record<string, string>): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_VACANCY_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;
    const lines = [
        '🧑‍🍳 <b>Новый отклик на вакансию</b>',
        data.vacancy ? `Вакансия: ${esc(data.vacancy)}` : '',
        `Имя: ${esc(data.fio)}`,
        `Телефон: ${esc(data.phone)}`,
        data.resume ? `Резюме/TG: ${esc(data.resume)}` : '',
        '',
        'Полная анкета — в Google Таблице откликов.',
    ].filter(Boolean);
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
            signal: AbortSignal.timeout(15000),
        });
        const json = await res.json();
        return !!json.ok;
    } catch {
        return false;
    }
}

export async function POST(req: Request) {
    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    // Только известные поля, всё в строки, с лимитом длины
    const data: Record<string, string> = {};
    for (const f of FIELDS) {
        const v = body[f];
        if (typeof v === 'string') data[f] = v.trim().slice(0, MAX_LEN);
    }

    if (!data.fio || !data.phone) {
        return NextResponse.json({ error: 'Укажите ФИО и телефон' }, { status: 400 });
    }

    // Оба канала параллельно; успех, если сработал хотя бы один.
    const [sheetsOk, telegramOk] = await Promise.all([sendToSheets(data), pingTelegram(data)]);

    if (sheetsOk || telegramOk) {
        return NextResponse.json({ ok: true, sheets: sheetsOk, telegram: telegramOk });
    }

    console.error('Отклик не доставлен: Google Sheets и Telegram оба недоступны');
    return NextResponse.json({ error: 'Не удалось отправить анкету, попробуйте позже' }, { status: 502 });
}
