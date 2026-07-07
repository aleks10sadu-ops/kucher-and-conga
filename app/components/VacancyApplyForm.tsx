'use client';

import React, { useState } from 'react';

type Props = { vacancyTitle: string };

const inputCls = 'w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg outline-none text-white placeholder-neutral-500 focus:border-amber-400/50 transition';

// Анкета отклика на вакансию. Пишется в Google Таблицу через /api/vacancy-apply.
export default function VacancyApplyForm({ vacancyTitle }: Props) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setStatus('sending');
        setErrorMsg('');
        try {
            const res = await fetch('/api/vacancy-apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vacancy: vacancyTitle, ...Object.fromEntries(fd.entries()) }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Ошибка отправки');
            setStatus('ok');
            form.reset();
        } catch (err) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Ошибка отправки');
        }
    };

    if (status === 'ok') {
        return (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="text-xl font-bold mb-2">Анкета отправлена!</h3>
                <p className="text-neutral-300">Мы свяжемся с вами в ближайшее время.</p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-4">
            <h3 className="text-2xl font-bold">Откликнуться на вакансию</h3>
            <p className="text-neutral-400 text-sm">Заполните анкету — мы рассмотрим её и свяжемся с вами.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="fio" required maxLength={200} placeholder="ФИО *" className={inputCls} />
                <input name="phone" required maxLength={30} type="tel" placeholder="Телефон *" className={inputCls} />
                <input name="age" maxLength={10} inputMode="numeric" placeholder="Возраст" className={inputCls} />
                <input name="citizenship" maxLength={100} placeholder="Гражданство" className={inputCls} />
                <select name="medbook" className={inputCls} defaultValue="">
                    <option value="" disabled>Медицинская книжка</option>
                    <option value="Есть">Есть</option>
                    <option value="Нет">Нет</option>
                    <option value="Готов оформить">Готов(а) оформить</option>
                </select>
                <input name="startDate" maxLength={100} placeholder="Когда готовы выйти на работу" className={inputCls} />
                <input name="salary" maxLength={100} placeholder="Ожидания по зарплате" className={inputCls} />
                <input name="resume" maxLength={300} placeholder="Ссылка на резюме или Telegram" className={inputCls} />
            </div>

            <textarea name="experience" maxLength={1000} rows={3} placeholder="Опыт работы: где и сколько работали" className={inputCls} />
            <textarea name="comment" maxLength={1000} rows={3} placeholder="Расскажите о себе" className={inputCls} />

            {status === 'error' && <p className="text-red-400 text-sm">{errorMsg}</p>}

            <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full md:w-auto px-8 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50"
            >
                {status === 'sending' ? 'Отправляем…' : 'Отправить анкету'}
            </button>
        </form>
    );
}
