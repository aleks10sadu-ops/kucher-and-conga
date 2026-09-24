'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createReservation } from '@/lib/reservations';
import { composeReservationComment } from '@/lib/booking/composeReservation';
import { useCart } from '@/lib/hooks/useCart';
import { reachYandexGoal } from '@/lib/analytics/yandexMetrika';
import {
    evaluateBooking,
    bookingDateClosureMessage,
    bookingHallClosureMessage,
    isBookingDateClosed,
    bookingTimeWindowForDate,
    isBookingTimeAllowed,
    type BookingType,
} from '@/lib/booking/rules';
import {
    banquetSaladNames,
    getBanquetPackage,
    isBanquetSelectionComplete,
} from '@/lib/booking/banquetPackages';
import { bookingSourceLabel, bookingSourceRef, type ParsedBookingContext } from '@/lib/booking/bookingContext';
import { banquetFilterForHall, bookingHallByKey, type BookingHall } from '@/lib/booking/hallCatalog';
import { changeBookingHall, createInitialBookingSelection } from '@/lib/booking/bookingSelection';
import HallSelector from '../components/HallSelector';
import BookingTypeSelector from '../components/BookingTypeSelector';
import BanquetMenuModal from '../components/BanquetMenuModal';
import PreorderMenuModal from '../components/PreorderMenuModal';
import DateTimePicker from '../components/DateTimePicker';
import { SITE } from '../components/forest/site';

const inputCls =
    'w-full rounded-lg border border-white/10 bg-forest-ink/60 px-4 py-3 text-cream placeholder-cream/40 outline-none transition focus:border-brass/60';

const formatRubles = (value: number) => `${value.toLocaleString('ru-RU')} ₽`;

const formatTimeInput = (value: string) => {
    const cleaned = value.replace(/[^\d:]/g, '');
    if (cleaned.includes(':')) {
        const [hours, minutes = ''] = cleaned.split(':');
        return `${hours.slice(0, 2)}:${minutes.slice(0, 2)}`;
    }
    const digits = cleaned.slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

const normalizeTimeInput = (value: string) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
};

export default function BookingForm({
    bookingHalls,
    initialContext,
}: {
    bookingHalls: BookingHall[];
    initialContext: ParsedBookingContext;
}) {
    const [selection, setSelection] = useState(() => createInitialBookingSelection(initialContext, bookingHalls));
    const { mode, hallKey, bookingType, adults, banquetPackageId, saladIds, notice } = selection;
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [children, setChildren] = useState(0);
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [preorderOpen, setPreorderOpen] = useState(false);
    const [banquetModalOpen, setBanquetModalOpen] = useState(false);
    const cart = useCart();

    const step = (setter: (n: number) => void, val: number, delta: number, min: number) => setter(Math.max(min, val + delta));
    const setMode = (nextMode: 'admin' | 'self') => setSelection((current) => ({ ...current, mode: nextMode }));
    const setAdults = (nextAdults: number) => setSelection((current) => ({ ...current, adults: nextAdults }));
    const setBookingType = (nextType: BookingType) => setSelection((current) => ({ ...current, bookingType: nextType }));

    const cartFoodSum = cart.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    const selectedHall = bookingHallByKey(bookingHalls, hallKey);
    const crmHallId = selectedHall?.crmHallId ?? null;
    const hallName = selectedHall?.name ?? null;
    const hallClosureMessage = mode === 'self' ? bookingHallClosureMessage(date, hallName) : null;
    const selectedBanquetMenu = getBanquetPackage(banquetPackageId);
    const bookingTimeWindow = bookingTimeWindowForDate(date);
    const timeInvalid = Boolean(date && time.length === 5 && !isBookingTimeAllowed(date, time));
    const effectiveBookingType: BookingType = mode === 'admin' ? 'onsite' : bookingType;
    const validation = evaluateBooking({
        adults,
        children,
        eventDate: date,
        eventTime: time,
        now: new Date(),
        hallGroup: selectedHall?.group ?? null,
        type: bookingType,
        cartFoodSum,
        hall: selectedHall,
        banquetMenuPrice: selectedBanquetMenu?.pricePerPerson ?? null,
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
        setChildren(0); setComment(''); setConsent(false);
        setSelection(createInitialBookingSelection({
            source: null, hallKey: null, bookingType: null, banquetPackageId: null,
            saladIds: [], ref: null, warnings: [],
        }, bookingHalls));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName.trim() || !phone.trim() || !date || !time) {
            setErrorMsg('Заполните имя, телефон, дату и время.');
            setStatus('error');
            return;
        }
        const bookingClosureMessage = bookingDateClosureMessage(date);
        if (bookingClosureMessage) {
            setErrorMsg(bookingClosureMessage);
            setStatus('error');
            return;
        }
        if (hallClosureMessage) {
            setErrorMsg(hallClosureMessage);
            setStatus('error');
            return;
        }
        if (!isBookingTimeAllowed(date, time)) {
            setErrorMsg(bookingTimeWindow ? `Введите время от ${bookingTimeWindow.start} до ${bookingTimeWindow.end}.` : 'Выберите дату и время.');
            setStatus('error');
            return;
        }
        if (!consent) {
            setErrorMsg('Отметьте согласие на обработку данных.');
            setStatus('error');
            return;
        }

        const effectiveType = effectiveBookingType;

        // Доменные правила — только в режиме «Выбрать зал и меню».
        if (mode === 'self') {
            if (!selectedHall) {
                setErrorMsg('Выберите зал.');
                setStatus('error');
                return;
            }
            if (!validation.canSubmit) {
                setErrorMsg(validation.blocking[0] || 'Бронирование с такими параметрами недоступно — свяжитесь с администратором.');
                setStatus('error');
                return;
            }
            if (effectiveType === 'banquet' && !isBanquetSelectionComplete(banquetPackageId, saladIds)) {
                setErrorMsg('Выберите банкетное меню и все необходимые салаты.');
                setStatus('error');
                return;
            }
        }

        setStatus('sending');
        setErrorMsg('');

        const banquetMenuName =
            mode === 'self' && effectiveType === 'banquet'
                ? selectedBanquetMenu?.name ?? null
                : null;
        const selectedBanquetSaladNames = banquetMenuName
            ? banquetSaladNames(banquetPackageId, saladIds)
            : [];
        const preorderItems =
            mode === 'self' && effectiveType === 'preorder'
                ? cart.items.map((c) => ({ name: c.name, qty: c.qty, price: c.price, productId: (c as any).productId || String(c.id) }))
                : [];
        const preorderSum = mode === 'self' && effectiveType === 'preorder' ? cartFoodSum : 0;
        const calculatedAmount = effectiveType === 'preorder'
            ? preorderSum
            : effectiveType === 'banquet' && selectedBanquetMenu
                ? selectedBanquetMenu.pricePerPerson * adults
                : null;
        const minimumOrder = mode === 'self' ? selectedHall?.minimumOrder ?? null : null;
        const source = bookingSourceLabel(initialContext.source);
        const sourceRef = bookingSourceRef(initialContext.source, initialContext.ref);

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
            banquetMenuName,
            banquetSaladNames: selectedBanquetSaladNames,
            calculatedAmount,
            minimumOrder,
            source,
            sourceRef,
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
                hallId: mode === 'self' ? crmHallId : null,
                hallName: mode === 'self' ? hallName : null,
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
                    banquetMenuName,
                    banquetSaladNames: selectedBanquetSaladNames,
                    calculatedAmount,
                    minimumOrder,
                    source,
                    sourceRef,
                    mode,
                    comment,
                }),
            });
            telegramOk = res.ok;
        } catch (err) {
            console.warn('Telegram notify failed:', err);
        }

        if (crmOk || telegramOk) {
            reachYandexGoal('booking_submit', {
                booking_type: effectiveType,
                mode,
                hall: mode === 'self' ? hallName : undefined,
            });
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
        (Boolean(hallClosureMessage) ||
            !validation.canSubmit ||
            !selectedHall ||
            (bookingType === 'banquet' && !isBanquetSelectionComplete(banquetPackageId, saladIds)));

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
                        halls={bookingHalls}
                        selectedHallKey={hallKey}
                        bookingDate={date}
                        onSelect={(nextHallKey) => setSelection((current) => changeBookingHall(current, nextHallKey, bookingHalls))}
                    />
                    {hallClosureMessage && (
                        <p role="alert" className="mt-3 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-sm text-cream/80">
                            {hallClosureMessage}
                        </p>
                    )}
                    {notice === 'incompatible-menu' && (
                        <p className="mt-3 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-xs text-cream/80">
                            Для зала Conga доступны банкетные меню 6000 и 7500 ₽. Выберите подходящий вариант.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} placeholder="Имя *" className={inputCls} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} placeholder="Фамилия" className={inputCls} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" maxLength={30} placeholder="Телефон *" className={inputCls} />
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                        <div className="text-xs font-medium text-cream/65">Дата</div>
                        <DateTimePicker
                            dateOnly
                            showTime={false}
                            value={date}
                            onChange={(nextDate) => {
                                setDate(nextDate);
                                if (!isBookingTimeAllowed(nextDate, time)) setTime('');
                            }}
                            disablePastDates
                            isDateDisabled={isBookingDateClosed}
                            ariaLabel="Дата"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="booking-time" className="block text-xs font-medium text-cream/65">Время</label>
                        <input
                            id="booking-time"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="ЧЧ:ММ"
                            maxLength={5}
                            value={time}
                            onChange={(e) => setTime(formatTimeInput(e.target.value))}
                            onBlur={() => setTime(normalizeTimeInput(time))}
                            required
                            aria-invalid={timeInvalid}
                            aria-describedby={timeInvalid ? 'booking-time-error' : undefined}
                            className={`${inputCls} ${timeInvalid ? 'border-red-400/70 focus:border-red-400' : ''}`}
                        />
                        {timeInvalid && bookingTimeWindow && (
                            <p id="booking-time-error" className="text-[11px] leading-tight text-red-400">
                                Допустимо {bookingTimeWindow.start}–{bookingTimeWindow.end}
                            </p>
                        )}
                    </div>
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

                    {validation.minimumOrder && (
                        <div className="rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 text-xs text-cream/80">
                            <p>Минимальная сумма для {selectedHall?.name} — {formatRubles(validation.minimumOrder.required)}</p>
                            <p>Сейчас выбрано на {formatRubles(validation.minimumOrder.current)}</p>
                            <p>{validation.minimumOrder.satisfied
                                ? 'Минимальная сумма достигнута'
                                : `До минимальной суммы не хватает ${formatRubles(validation.minimumOrder.missing)}`}</p>
                        </div>
                    )}

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

                    {/* Банкет: выбор банкетного меню */}
                    {bookingType === 'banquet' && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setBanquetModalOpen(true)}
                                className="w-full rounded-xl bg-white/10 py-3 font-semibold text-cream transition hover:bg-white/20"
                            >
                                {banquetPackageId ? 'Изменить банкетное меню' : 'Выбрать банкетное меню'}
                            </button>
                            {banquetPackageId && (
                                <div className="text-center text-sm text-brass">
                                    <p>Выбрано банкетное меню: {selectedBanquetMenu?.name}</p>
                                    {saladIds.length > 0 && (
                                        <p className="mt-0.5 text-xs text-cream/60">Салаты: {banquetSaladNames(banquetPackageId, saladIds).join(', ')}</p>
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
                    disabled={status === 'sending' || selfSubmitBlocked || timeInvalid}
                    className="w-full rounded-lg bg-terracotta px-8 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark disabled:opacity-50 sm:w-auto"
                >
                    {status === 'sending' ? 'Отправляем…' : 'Забронировать стол'}
                </button>
                <span className="text-[13px] text-cream/50">
                    Бронь подтверждает администратор — или позвоните{' '}
                    <a href={`tel:${SITE.phones[0].tel}`} className="text-brass hover:underline">{SITE.phones[0].label}</a>
                </span>
            </div>

            {/* Модалка выбора банкетного меню */}
            <BanquetMenuModal
                isOpen={banquetModalOpen}
                onClose={() => setBanquetModalOpen(false)}
                selectable
                hallFilter={banquetFilterForHall(selectedHall)}
                selectedPackageId={banquetPackageId}
                selectedSaladIds={saladIds}
                confirmLabel="Выбрать банкетное меню"
                onSelectPackage={(id, salads) => {
                    const menu = getBanquetPackage(id);
                    if (menu) {
                        setSelection((current) => ({
                            ...current,
                            banquetPackageId: menu.id,
                            saladIds: salads,
                            notice: null,
                        }));
                    }
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
