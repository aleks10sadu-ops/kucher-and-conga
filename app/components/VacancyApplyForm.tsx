'use client';

import React, { useState } from 'react';

type Props = { vacancyTitle: string };

const inputCls = 'w-full rounded-lg border border-white/10 bg-forest-ink/60 px-4 py-3 text-cream placeholder-cream/40 outline-none transition focus:border-brass/60';

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
            <div className="rounded-2xl border border-brass/30 bg-brass/10 p-8 text-center text-cream">
                <div className="mb-3 text-3xl">✅</div>
                <h3 className="mb-2 font-display text-xl font-bold">Анкета отправлена!</h3>
                <p className="text-cream/75">Мы свяжемся с вами в ближайшее время.</p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-cream md:p-8">
            <h3 className="font-display text-2xl font-bold">Откликнуться на вакансию</h3>
            <p className="text-sm text-cream/55">Заполните анкету — мы рассмотрим её и свяжемся с вами.</p>

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

            {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

            <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full rounded-lg bg-terracotta px-8 py-3 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark disabled:opacity-50 md:w-auto"
            >
                {status === 'sending' ? 'Отправляем…' : 'Отправить анкету'}
            </button>
        </form>
    );
}
