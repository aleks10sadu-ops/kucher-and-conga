'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createReservation } from '@/lib/reservations';
import { composeReservationComment } from '@/lib/booking/composeReservation';
import { useCart } from '@/lib/hooks/useCart';
import type { Hall } from '@/lib/halls/halls-data';
import {
    evaluateBooking,
    classifyHall,
    banquetPackagesForHall,
    type BookingType,
} from '@/lib/booking/rules';
import { BANQUET_PACKAGES, isBanquetPackageAllowed } from '@/lib/booking/banquetPackages';
import HallSelector from '../components/HallSelector';
import BookingTypeSelector from '../components/BookingTypeSelector';
import BanquetMenuModal from '../components/BanquetMenuModal';
import PreorderMenuModal from '../components/PreorderMenuModal';
import { SITE } from '../components/forest/site';

type Mode = 'admin' | 'self';

const inputCls =
    'w-full rounded-lg border border-white/10 bg-forest-ink/60 px-4 py-3 text-cream placeholder-cream/40 outline-none transition focus:border-brass/60';

const todayISO = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};


export default function BookingForm({ serverHalls }: { serverHalls?: Hall[] }) {
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

    // Выбор зала + банкетного пакета (режим «Выбрать зал и меню»)
    const [hallId, setHallId] = useState<string | null>(null);
    const [preorderOpen, setPreorderOpen] = useState(false);
    const [hallName, setHallName] = useState<string | null>(null);
    const [banquetPackageId, setBanquetPackageId] = useState<string | null>(null);
    const [banquetSalads, setBanquetSalads] = useState<string[]>([]);
    const [banquetModalOpen, setBanquetModalOpen] = useState(false);
    const cart = useCart();

    const step = (setter: (n: number) => void, val: number, delta: number, min: number) => setter(Math.max(min, val + delta));

    const cartFoodSum = cart.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    const hallGroup = classifyHall(hallName);
    const validation = evaluateBooking({
        adults,
        children,
        eventDate: date,
        eventTime: time,
        now: new Date(),
        hallGroup,
        type: bookingType,
        cartFoodSum,
    });
    const allowedSignature = validation.availableTypes.map((t) => (t.allowed ? '1' : '0')).join('');

    // Авто-переключение типа брони, если выбранный стал недоступен (число гостей/срок изменились).
    useEffect(() => {
        if (mode !== 'self') return;
        const current = validation.availableTypes.find((t) => t.type === bookingType);
        if (current && !current.allowed) {
            const firstAllowed = validation.availableTypes.find((t) => t.allowed);
            if (firstAllowed) setBookingType(firstAllowed.type);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowedSignature, bookingType, mode]);

    const resetForm = () => {
        setFirstName(''); setLastName(''); setPhone(''); setDate(''); setTime('');
        setAdults(2); setChildren(0); setBookingType('onsite'); setComment(''); setConsent(false);
        setHallId(null); setHallName(null); setBanquetPackageId(null); setBanquetSalads([]);
    };

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

        const effectiveType: BookingType = mode === 'admin' ? 'onsite' : bookingType;

        // Доменные правила — только в режиме «Выбрать зал и меню».
        if (mode === 'self') {
            if (!hallId) {
                setErrorMsg('Выберите зал.');
                setStatus('error');
                return;
            }
            if (!validation.canSubmit) {
                setErrorMsg(validation.blocking[0] || 'Бронирование с такими параметрами недоступно — свяжитесь с администратором.');
                setStatus('error');
                return;
            }
            if (effectiveType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), banquetPackageId)) {
                setErrorMsg('Выберите банкетный пакет для этого зала.');
                setStatus('error');
                return;
            }
        }

        setStatus('sending');
        setErrorMsg('');

        const banquetBaseName =
            mode === 'self' && effectiveType === 'banquet'
                ? BANQUET_PACKAGES.find((p) => p.id === banquetPackageId)?.name ?? null
                : null;
        const banquetPackageName = banquetBaseName
            ? banquetSalads.length
                ? `${banquetBaseName} — салаты: ${banquetSalads.join(', ')}`
                : banquetBaseName
            : null;
        const preorderItems =
            mode === 'self' && effectiveType === 'preorder'
                ? cart.items.map((c) => ({ name: c.name, qty: c.qty, price: c.price, productId: (c as any).productId || String(c.id) }))
                : [];
        const preorderSum = mode === 'self' && effectiveType === 'preorder' ? cartFoodSum : 0;

        // Стоп-лист: проверяем предзаказ ДО создания брони в CRM и отправки в TG
        // (сервер /api/telegram проверит ещё раз — это бэкстоп для устаревших клиентов).
        if (preorderItems.length > 0) {
            try {
                const sl = await fetch('/api/stop-list').then((r) => r.json());
                const stoppedIds = new Set<string>((sl?.productIds || []).map(String));
                const blocked = preorderItems.filter((i) => i.productId && stoppedIds.has(String(i.productId))).map((i) => i.name);
                if (blocked.length > 0) {
                    setErrorMsg(`Увы, уже закончилось: ${blocked.join(', ')}. Уберите эти блюда из предзаказа и отправьте заявку снова.`);
                    setStatus('error');
                    return;
                }
            } catch {
                /* стоп-лист недоступен — заявку не блокируем, сервер проверит сам */
            }
        }

        const composedComment = composeReservationComment({
            adults,
            children,
            bookingType: effectiveType,
            hallName: mode === 'self' ? hallName : null,
            cartItems: preorderItems,
            cartFoodSum: preorderSum,
            banquetPackageName,
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
                banquetPackageId: mode === 'self' ? banquetPackageId : null,
                comment,
                hallId: mode === 'self' ? hallId : null,
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
                    hallName: mode === 'self' ? hallName : null,
                    cartItems: preorderItems,
                    cartFoodSum: preorderSum,
                    banquetPackageName,
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
            if (mode === 'self' && effectiveType === 'preorder') cart.clear();
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
                    Бронь подтверждает администратор — он свяжется с вами, чтобы согласовать детали.
                </p>
                <button
                    onClick={() => { setStatus('idle'); resetForm(); }}
                    className="mt-6 rounded-lg border border-white/15 bg-white/[0.05] px-6 py-2.5 text-sm text-cream transition-colors hover:bg-white/[0.1]"
                >
                    Оставить ещё одну
                </button>
            </div>
        );
    }

    const selfSubmitBlocked =
        mode === 'self' &&
        (!validation.canSubmit ||
            !hallId ||
            (bookingType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), banquetPackageId)));

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

            {/* Карусель залов — только в режиме «Выбрать зал и меню» */}
            {mode === 'self' && (
                <div className="mb-6">
                    <HallSelector
                        initialHallsData={serverHalls}
                        selectedHallId={hallId}
                        onSelect={(id, name) => {
                            setHallId(id);
                            setHallName(name ?? null);
                            setBanquetPackageId(null);
                            setBanquetSalads([]);
                        }}
                    />
                </div>
            )}

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

            {/* Тип брони + правила — только в режиме «сам» */}
            {mode === 'self' && (
                <div className="mt-5 space-y-4">
                    <div className="text-sm text-cream/70">Тип брони</div>
                    <BookingTypeSelector validation={validation} selectedType={bookingType} onSelect={setBookingType} />

                    {/* Предзаказ: сводка корзины */}
                    {bookingType === 'preorder' && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            {cart.items.length === 0 ? (
                                <div className="space-y-3 text-sm text-cream/70">
                                    <p>Выберите блюда — они попадут в предзаказ.</p>
                                    <button
                                        type="button"
                                        onClick={() => setPreorderOpen(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brass/40 bg-white/[0.04] px-4 py-2 font-medium text-brass transition-colors hover:bg-white/[0.09]"
                                    >
                                        Выбрать блюда из меню →
                                    </button>
                                    <p className="text-xs text-cream/50">Добавленные блюда появятся здесь автоматически, форма не сбросится.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold text-cream/85">Состав предзаказа</div>
                                    <ul className="space-y-1">
                                        {cart.items.map((it) => (
                                            <li key={it.id} className="flex justify-between text-sm text-cream/70">
                                                <span>{it.name} × {it.qty}</span>
                                                <span>{(it.price || 0) * (it.qty || 0)} ₽</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-semibold text-brass">
                                        <span>Сумма предзаказа</span>
                                        <span>{cartFoodSum} ₽</span>
                                    </div>
                                    <button type="button" onClick={() => setPreorderOpen(true)} className="inline-block text-xs text-cream/55 hover:text-brass">
                                        Добавить ещё блюда →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Банкет: выбор пакета */}
                    {bookingType === 'banquet' && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setBanquetModalOpen(true)}
                                className="w-full rounded-xl bg-white/10 py-3 font-semibold text-cream transition hover:bg-white/20"
                            >
                                {banquetPackageId ? 'Изменить банкетный пакет' : 'Выбрать банкетный пакет'}
                            </button>
                            {banquetPackageId && (
                                <div className="text-center text-sm text-brass">
                                    <p>Выбран пакет: {BANQUET_PACKAGES.find((p) => p.id === banquetPackageId)?.name}</p>
                                    {banquetSalads.length > 0 && (
                                        <p className="mt-0.5 text-xs text-cream/60">Салаты: {banquetSalads.join(', ')}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
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
                    disabled={status === 'sending' || selfSubmitBlocked}
                    className="w-full rounded-lg bg-terracotta px-8 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark disabled:opacity-50 sm:w-auto"
                >
                    {status === 'sending' ? 'Отправляем…' : 'Забронировать стол'}
                </button>
                <span className="text-[13px] text-cream/50">
                    Бронь подтверждает администратор — или позвоните{' '}
                    <a href={`tel:${SITE.phones[0].tel}`} className="text-brass hover:underline">{SITE.phones[0].label}</a>
                </span>
            </div>

            {/* Модалка выбора банкетного пакета */}
            <BanquetMenuModal
                isOpen={banquetModalOpen}
                onClose={() => setBanquetModalOpen(false)}
                selectable
                hallFilter={banquetPackagesForHall(hallGroup)}
                selectedPackageId={banquetPackageId}
                onSelectPackage={(id, salads) => {
                    setBanquetPackageId(id);
                    setBanquetSalads(salads);
                    setBanquetModalOpen(false);
                }}
            />

            {/* Модалка предзаказа: выбор блюд прямо на странице брони */}
            <PreorderMenuModal isOpen={preorderOpen} onClose={() => setPreorderOpen(false)} />
        </form>
    );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
    return (
        <div className="rounded-lg border border-white/10 bg-forest-ink/60 px-4 py-2.5">
            <div className="text-[12px] text-cream/55">{label}</div>
            <div className="mt-1 flex items-center justify-between">
                <button type="button" onClick={onDec} aria-label={`${label}: меньше`} className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-lg text-cream transition-colors hover:bg-white/[0.12]">−</button>
                <span className="min-w-[2ch] text-center text-lg font-semibold text-cream">{value}</span>
                <button type="button" onClick={onInc} aria-label={`${label}: больше`} className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.06] text-lg text-cream transition-colors hover:bg-white/[0.12]">+</button>
            </div>
        </div>
    );
}
