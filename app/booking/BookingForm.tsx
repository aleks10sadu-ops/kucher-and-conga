'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createReservation } from '@/lib/reservations';
import { composeReservationComment } from '@/lib/booking/composeReservation';
import { SITE } from '../components/forest/site';

type Mode = 'admin' | 'self';
type BookingType = 'onsite' | 'preorder' | 'banquet';

const TYPE_OPTIONS: { id: BookingType; name: string; hint: string }[] = [
    { id: 'onsite', name: 'В зале', hint: 'Закажете на месте' },
    { id: 'preorder', name: 'Предзаказ', hint: 'Соберём блюда к приходу' },
    { id: 'banquet', name: 'Банкет', hint: 'Сеты и меню под повод' },
];

const inputCls =
    'w-full rounded-lg border border-white/12 bg-forest-ink/60 px-4 py-3 text-cream placeholder-cream/40 outline-none transition focus:border-brass/60';

const todayISO = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export default function BookingForm() {
    const [mode, setMode] = useState<Mode>('admin');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [bookingType, setBookingType] = useState<BookingType>('onsite');
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const step = (setter: (n: number) => void, val: number, delta: number, min: number) => setter(Math.max(min, val + delta));

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !phone.trim() || !date || !time) {
            setErrorMsg('Заполните имя, телефон, дату и время.');
            setStatus('error');
            return;
        }
        if (!consent) {
            setErrorMsg('Отметьте согласие на обработку данных.');
            setStatus('error');
            return;
        }
        setStatus('sending');
        setErrorMsg('');

        const effectiveType: BookingType = mode === 'admin' ? 'onsite' : bookingType;
        const composedComment = composeReservationComment({
            adults,
            children,
            bookingType: effectiveType,
            hallName: null,
            cartItems: [],
            cartFoodSum: 0,
            banquetPackageName: null,
            comment,
        });

        let crmOk = false;
        let telegramOk = false;

        try {
            const result = await createReservation({
                firstName,
                lastName,
                phone,
                date,
                time,
                adults,
                children,
                bookingType: effectiveType,
                banquetPackageId: null,
                comment,
                hallId: null,
                composedComment,
            });
            crmOk = !!result.success;
        } catch (err) {
            console.error('CRM reservation error:', err);
        }

        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'booking',
                    name: `${firstName} ${lastName}`.trim(),
                    firstName,
                    lastName: lastName || '',
                    phone,
                    date,
                    time,
                    adults,
                    children,
                    bookingType: effectiveType,
                    hallName: null,
                    cartItems: [],
                    cartFoodSum: 0,
                    banquetPackageName: null,
                    mode,
                    comment,
                }),
            });
            telegramOk = res.ok;
        } catch (err) {
            console.warn('Telegram notify failed:', err);
        }

        if (crmOk || telegramOk) {
            setStatus('ok');
        } else {
            setStatus('error');
            setErrorMsg('Не удалось отправить заявку. Позвоните нам, пожалуйста.');
        }
    };

    if (status === 'ok') {
        return (
            <div className="rounded-2xl border border-brass/30 bg-brass/10 p-8 text-center text-cream">
                <div className="mb-3 text-3xl">🌿</div>
                <h3 className="font-display text-2xl font-bold">Заявка принята</h3>
                <p className="mx-auto mt-2 max-w-[42ch] text-cream/75">
                    Администратор свяжется с вами, чтобы подтвердить бронь и подобрать стол.
                </p>
                <button
                    onClick={() => { setStatus('idle'); setFirstName(''); setLastName(''); setPhone(''); setDate(''); setTime(''); setComment(''); setConsent(false); }}
                    className="mt-6 rounded-lg border border-white/15 bg-white/[0.05] px-6 py-2.5 text-sm text-cream transition-colors hover:bg-white/[0.1]"
                >
                    Оставить ещё одну
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            {/* Режим */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-forest-ink/40 p-1">
                {([['admin', 'Связаться с администратором'], ['self', 'Выбрать зал и меню']] as const).map(([m, label]) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            mode === m ? 'bg-terracotta text-[#FBF3EA]' : 'text-cream/70 hover:text-cream'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} placeholder="Имя *" className={inputCls} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} placeholder="Фамилия" className={inputCls} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" maxLength={30} placeholder="Телефон *" className={inputCls} />
                <div className="grid grid-cols-2 gap-4">
                    <input value={date} onChange={(e) => setDate(e.target.value)} type="date" min={todayISO()} aria-label="Дата" className={`${inputCls} [color-scheme:dark]`} />
                    <input value={time} onChange={(e) => setTime(e.target.value)} type="time" min="12:00" max="22:00" aria-label="Время" className={`${inputCls} [color-scheme:dark]`} />
                </div>
            </div>

            {/* Гости */}
            <div className="mt-4 grid grid-cols-2 gap-4">
                <Stepper label="Взрослых" value={adults} onDec={() => step(setAdults, adults, -1, 1)} onInc={() => step(setAdults, adults, 1, 1)} />
                <Stepper label="Детей" value={children} onDec={() => step(setChildren, children, -1, 0)} onInc={() => step(setChildren, children, 1, 0)} />
            </div>

            {/* Тип меню — только в режиме «сам» */}
            {mode === 'self' && (
                <div className="mt-5">
                    <div className="mb-2 text-sm text-cream/70">Тип брони</div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {TYPE_OPTIONS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setBookingType(t.id)}
                                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                    bookingType === t.id ? 'border-brass bg-brass/10' : 'border-white/12 bg-white/[0.03] hover:bg-white/[0.06]'
                                }`}
                            >
                                <div className="text-sm font-semibold text-cream">{t.name}</div>
                                <div className="mt-0.5 text-[12px] text-cream/55">{t.hint}</div>
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[12px] text-cream/45">
                        Хотите конкретный зал — напишите в комментарии. Все залы:{' '}
                        <Link href="/halls" className="text-brass hover:underline">залы и банкеты</Link>.
                    </p>
                </div>
            )}

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={mode === 'self' ? 'Комментарий: повод, пожелания по залу, аллергии…' : 'Комментарий: повод, число гостей, пожелания…'}
                className={`${inputCls} mt-4`}
            />

            <label className="mt-4 flex items-start gap-3 text-[13px] text-cream/60">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-terracotta" />
                <span>
                    Согласен на обработку персональных данных согласно{' '}
                    <Link href="/privacy" className="text-brass hover:underline">политике конфиденциальности</Link>.
                </span>
            </label>

            {status === 'error' && <p className="mt-3 text-sm text-red-400">{errorMsg}</p>}

            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full rounded-lg bg-terracotta px-8 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark disabled:opacity-50 sm:w-auto"
                >
                    {status === 'sending' ? 'Отправляем…' : 'Забронировать стол'}
                </button>
                <span className="text-[13px] text-cream/50">
                    или позвоните{' '}
                    <a href={`tel:${SITE.phones[0].tel}`} className="text-brass hover:underline">{SITE.phones[0].label}</a>
                </span>
            </div>
        </form>
    );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
    return (
        <div className="rounded-lg border border-white/12 bg-forest-ink/60 px-4 py-2.5">
            <div className="text-[12px] text-cream/55">{label}</div>
            <div className="mt-1 flex items-center justify-between">
                <button type="button" onClick={onDec} aria-label={`${label}: меньше`} className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-lg text-cream transition-colors hover:bg-white/[0.12]">−</button>
                <span className="min-w-[2ch] text-center text-lg font-semibold text-cream">{value}</span>
                <button type="button" onClick={onInc} aria-label={`${label}: больше`} className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-lg text-cream transition-colors hover:bg-white/[0.12]">+</button>
            </div>
        </div>
    );
}
