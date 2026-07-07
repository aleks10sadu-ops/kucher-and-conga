// Принимает анкету отклика на вакансию и пишет её в Google Sheets через Apps Script.
// Настройка таблицы: docs/google-sheets-vacancies-setup.md (env VACANCY_SHEETS_WEBHOOK_URL).
import { NextResponse } from 'next/server';

const MAX_LEN = 1000;

const FIELDS = ['vacancy', 'fio', 'phone', 'age', 'citizenship', 'experience', 'medbook', 'startDate', 'salary', 'resume', 'comment'] as const;

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

    const url = process.env.VACANCY_SHEETS_WEBHOOK_URL;
    if (!url) {
        console.error('VACANCY_SHEETS_WEBHOOK_URL не настроен');
        return NextResponse.json({ error: 'Приём анкет временно недоступен' }, { status: 502 });
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Apps Script status ${res.status}`);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Ошибка отправки анкеты в Google Sheets:', err);
        return NextResponse.json({ error: 'Не удалось отправить анкету, попробуйте позже' }, { status: 502 });
    }
}
