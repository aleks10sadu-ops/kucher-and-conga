'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { CartItem } from '@/types/index';
import { deliveryZones, checkDeliveryZoneForCoords, type DeliveryZone } from '../data/deliveryZones';
import { composeAddressDetails } from '@/lib/booking/addressDetails';
import { validateMinOrder } from '@/lib/delivery/minOrder';
import { isDeliveryOpen, todayDeliveryWindowText } from '@/lib/delivery/schedule';
import { SITE } from '../components/forest/site';
import DeliveryZoneMiniMap from '../components/DeliveryZoneMiniMap';

const inputCls =
    'w-full rounded-lg border border-white/10 bg-forest-ink/60 px-4 py-3 text-sm text-cream placeholder-cream/40 outline-none transition focus:border-brass/60';

// Определение зоны по ключевым словам улицы (fallback без Яндекс-карт).
// Точные полигональные зоны подключаются, когда на странице загружен ymaps.
function zoneByKeyword(address: string) {
    const a = address.toLowerCase();
    if (/промышленная|загорская|московская/.test(a)) return deliveryZones[0];
    if (/внуковская|кропоткинская|туполева/.test(a)) return deliveryZones[1];
    if (/ключевая|лобненская|ольявидово/.test(a)) return deliveryZones[2];
    if (/солнечная|юбилейная|габово/.test(a)) return deliveryZones[3];
    if (/центральная|богослово|жуково/.test(a)) return deliveryZones[4];
    return null;
}

export default function DeliveryCheckout({
    items,
    subtotal,
    onClose,
    onSuccess,
}: {
    items: CartItem[];
    subtotal: number;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [f, setF] = useState({
        name: '',
        phone: '',
        address: '',
        house: '',
        building: '',
        entrance: '',
        floor: '',
        apartment: '',
        intercom: '',
        comment: '',
        deliveryTime: 'asap' as 'asap' | 'custom',
        deliveryTimeCustom: '',
        paymentMethod: 'card' as 'card' | 'cash',
        changeAmount: 'no-change',
        hasAllergy: false,
        allergyDetails: '',
    });
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const set = (patch: Partial<typeof f>) => setF((o) => ({ ...o, ...patch }));

    const [zone, setZone] = useState<DeliveryZone | null>(null);
    const [coords, setCoords] = useState<number[] | null>(null);
    // Полный адрес, который реально нашёл геокодер (с городом) — показываем гостю,
    // чтобы адрес из другого города не «проходил» молча как дмитровский.
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
    const deliveryPrice = zone?.price ?? null;
    const total = subtotal + (deliveryPrice || 0);

    // График приёма доставок (МСК). Пока открыто — гость ничего не видит;
    // вне графика показываем расписание на сегодня и блокируем отправку.
    // Пересчёт раз в полминуты, чтобы окно закрывалось/открывалось без перезагрузки.
    const [scheduleOpen, setScheduleOpen] = useState(() => isDeliveryOpen());
    useEffect(() => {
        const id = setInterval(() => setScheduleOpen(isDeliveryOpen()), 30_000);
        return () => clearInterval(id);
    }, []);

    // Яндекс-карты подгружает мини-карта зон (DeliveryZoneMiniMap) — она всегда
    // отрисована в форме, поэтому отдельный загрузчик скрипта не нужен.

    // Убираем страну/область/округ из адресной строки геокодера —
    // гостю важнее населённый пункт и улица.
    const cleanAddress = (line: string) =>
        line
            .replace(/^Россия,\s*/i, '')
            .replace(/^Московская область,\s*/i, '')
            .replace(/^Дмитровский (муниципальный|городской) округ,\s*/i, '');

    // Габариты самой дальней зоны (600₽) — в этих границах ищем адрес в первую очередь.
    const DELIVERY_BOUNDS = [[56.09, 37.03], [56.79, 38.05]];

    // Точная зона: геокодим адрес (улица + дом, если указан) → координаты →
    // проверка попадания в полигон. Город НЕ подставляем принудительно: если
    // гость указал другой город, геокодер найдёт именно его, а зона по
    // полигонам честно окажется пустой.
    // Fallback по ключевым словам улицы — только пока Яндекс-карты не загрузились.
    const resolveZone = (addrRaw: string, house?: string) => {
        const addr = house?.trim() ? `${addrRaw.trim()}, ${house.trim()}` : addrRaw.trim();
        const kw = zoneByKeyword(addr);
        const ym = (window as any).ymaps;
        if (!addr || !ym?.geocode) {
            setZone(kw);
            return;
        }
        ym.ready(() => {
            // Сначала ищем строго в границах зон доставки; если там ничего нет —
            // повторяем без строгих границ, чтобы показать гостю найденный город.
            ym.geocode(addr, { results: 1, boundedBy: DELIVERY_BOUNDS, strictBounds: true })
                .then((res: any) => {
                    const obj = res.geoObjects?.get(0);
                    if (obj) return obj;
                    return ym.geocode(addr, { results: 1, boundedBy: DELIVERY_BOUNDS })
                        .then((r2: any) => r2.geoObjects?.get(0));
                })
                .then((obj: any) => {
                    if (!obj) { setZone(kw); setResolvedAddress(null); return; }
                    const c = obj.geometry.getCoordinates();
                    setCoords(c);
                    setResolvedAddress(obj.getAddressLine ? cleanAddress(obj.getAddressLine()) : null);
                    // Координаты известны — доверяем только полигонам, без keyword-фолбэка:
                    // улицы вроде «Центральная» есть в любом городе.
                    setZone(checkDeliveryZoneForCoords(c));
                })
                .catch(() => setZone(kw));
        });
    };

    // Минимальный заказ зависит от зоны: бесплатная — от 1000 ₽ или 2 бизнес-ланчей,
    // платные — от 2000/3000 ₽. Пока зона не определена, действует базовое правило.
    const minOrder = validateMinOrder(items, subtotal, zone);

    // Гость выбрал точку на мини-карте: раскладываем адрес по полям —
    // улица/населённый пункт в «Улица», номер дома в «Дом».
    const pickFromMap = (address: string, c: number[], z: DeliveryZone | null, house?: string) => {
        setCoords(c);
        setZone(z);
        if (!address) {
            setResolvedAddress(null);
            return;
        }
        const cleaned = cleanAddress(address);
        // Отрезаем номер дома с конца строки — он поедет в своё поле.
        const street = house && cleaned.endsWith(`, ${house}`)
            ? cleaned.slice(0, -(house.length + 2))
            : cleaned;
        set({ address: street, ...(house ? { house } : {}) });
        setResolvedAddress(cleaned);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDeliveryOpen()) {
            setScheduleOpen(false);
            setErrorMsg(`Сейчас доставка не принимается. Приём заказов сегодня: ${todayDeliveryWindowText()} (по Москве).`);
            setStatus('error');
            return;
        }
        if (!minOrder.isValid) {
            setErrorMsg(minOrder.message || 'Заказ не проходит по условиям доставки.');
            setStatus('error');
            return;
        }
        if (!f.name.trim() || !f.phone.trim() || !f.address.trim()) {
            setErrorMsg('Заполните имя, телефон и адрес.');
            setStatus('error');
            return;
        }
        // Адрес распознан по координатам, но не попал ни в одну зону —
        // доставка туда не осуществляется (например, другой город).
        if (coords && !zone) {
            setErrorMsg('Этот адрес вне зон доставки — привезти туда не сможем. Проверьте адрес или выберите точку на карте.');
            setStatus('error');
            return;
        }
        if (f.hasAllergy && !f.allergyDetails.trim()) {
            setErrorMsg('Укажите, на что аллергия.');
            setStatus('error');
            return;
        }
        if (f.deliveryTime === 'custom' && !f.deliveryTimeCustom) {
            setErrorMsg('Укажите время доставки.');
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

        const allergyInfo = f.hasAllergy && f.allergyDetails.trim() ? { allergy: `Аллергия на: ${f.allergyDetails.trim()}` } : {};
        const deliveryTimeCustom =
            f.deliveryTime === 'custom' && f.deliveryTimeCustom
                ? `${new Date().toISOString().split('T')[0]}T${f.deliveryTimeCustom}:00`
                : '';

        const payload = {
            type: 'delivery' as const,
            name: f.name,
            phone: f.phone,
            address: f.address,
            house: f.house,
            building: f.building,
            entrance: f.entrance,
            floor: f.floor,
            apartment: f.apartment,
            intercom: f.intercom,
            comment: f.comment,
            ...allergyInfo,
            coordinates: coords,
            items: items.map((c) => ({ id: c.id, name: c.name, qty: c.qty, price: c.price, productId: (c as any).productId, isBusinessLunch: (c as any).isBusinessLunch, modifiers: (c as any).modifiers })),
            subtotal,
            deliveryPrice,
            total,
            zoneName: zone?.name,
            deliveryTime: f.deliveryTime,
            deliveryTimeCustom,
            paymentMethod: f.paymentMethod,
            changeAmount: f.changeAmount,
        };

        let ok = false;
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            // Осознанный отказ сервера (стоп-лист, закрытое окно бизнес-ланча,
            // минимальный заказ): НЕ уходим в TG-фолбэк, иначе заказ утёк бы мимо проверки.
            if (res.status === 409 && (data.error === 'stop_list' || data.error === 'business_lunch_closed' || data.error === 'delivery_closed')) {
                setStatus('error');
                setErrorMsg(data.message || 'Часть позиций сейчас недоступна. Обновите корзину.');
                return;
            }
            if (!data.ok && data.code === 'MIN_ORDER') {
                setStatus('error');
                setErrorMsg(data.error);
                return;
            }
            if (!data.ok) throw new Error(data.error || 'iiko order failed');
            ok = true;
        } catch (err) {
            console.error('iiko order failed, TG fallback:', err);
            try {
                const addrDetails = composeAddressDetails(f);
                await fetch('/api/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        address: addrDetails ? `${f.address}, ${addrDetails}` : f.address,
                        comment: `${f.comment ? f.comment + ' | ' : ''}⚠️ Заказ НЕ создан в iiko — пробейте вручную!`,
                    }),
                });
                ok = true;
            } catch (tgErr) {
                console.error('TG fallback failed:', tgErr);
            }
        }

        if (ok) {
            setStatus('ok');
            onSuccess();
        } else {
            setStatus('error');
            setErrorMsg('Не удалось отправить заказ. Позвоните нам, пожалуйста.');
        }
    };

    if (status === 'ok') {
        return (
            <Shell onClose={onClose} title="Заказ отправлен">
                <div className="p-6 text-center text-cream">
                    <div className="mb-3 text-3xl">🌿</div>
                    <p className="text-cream/80">
                        Заявка на доставку принята{deliveryPrice != null ? ` — доставка ${deliveryPrice === 0 ? 'бесплатно' : deliveryPrice + ' ₽'}` : ''}. Ожидайте звонка
                        для подтверждения.
                    </p>
                    <button onClick={onClose} className="mt-6 rounded-lg bg-terracotta px-6 py-2.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark">
                        Готово
                    </button>
                </div>
            </Shell>
        );
    }

    return (
        <Shell onClose={onClose} title="Оформление доставки">
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
                {!scheduleOpen && (
                    <div className="rounded-lg border border-brass/30 bg-brass/10 p-3 text-sm text-cream">
                        <p className="font-semibold text-brass">Сейчас доставка не принимается</p>
                        <p className="mt-1 text-cream/80">
                            Приём заказов сегодня: <span className="font-semibold text-cream">{todayDeliveryWindowText()}</span> (по Москве).
                            Возвращайтесь в рабочее время — или позвоните нам.
                        </p>
                    </div>
                )}
                {/* Мини-карта зон — первой в форме: гость сразу видит зоны и условия,
                    может выбрать точку кликом, адрес подставится в поля ниже. */}
                <DeliveryZoneMiniMap coords={coords} onPick={pickFromMap} />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input placeholder="Имя *" className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} />
                    <input placeholder="Телефон *" type="tel" className={inputCls} value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
                </div>
                <input
                    placeholder="Улица *"
                    className={inputCls}
                    value={f.address}
                    onChange={(e) => {
                        // Гость правит адрес руками — старые координаты и найденный
                        // адрес больше не актуальны, зона пока по ключевым словам.
                        set({ address: e.target.value });
                        setCoords(null);
                        setResolvedAddress(null);
                        setZone(zoneByKeyword(e.target.value));
                    }}
                    onBlur={() => resolveZone(f.address, f.house)}
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* Дом уточняет геокодинг: после ввода маркер встаёт на конкретное здание */}
                    <input placeholder="Дом" className={inputCls} value={f.house} onChange={(e) => set({ house: e.target.value })} onBlur={() => resolveZone(f.address, f.house)} />
                    <input placeholder="Корпус" className={inputCls} value={f.building} onChange={(e) => set({ building: e.target.value })} />
                    <input placeholder="Подъезд" className={inputCls} value={f.entrance} onChange={(e) => set({ entrance: e.target.value })} />
                    <input placeholder="Этаж" className={inputCls} value={f.floor} onChange={(e) => set({ floor: e.target.value })} />
                    <input placeholder="Квартира" className={inputCls} value={f.apartment} onChange={(e) => set({ apartment: e.target.value })} />
                    <input placeholder="Домофон" className={inputCls} value={f.intercom} onChange={(e) => set({ intercom: e.target.value })} />
                </div>
                {resolvedAddress && (
                    <p className="text-xs text-cream/45">Найдено: {resolvedAddress}</p>
                )}
                {f.address.trim() && (
                    zone ? (
                        <p className="text-xs text-cream/55">
                            Зона: {zone.name} — {zone.price === 0 ? 'доставка бесплатно' : `доставка ${zone.price} ₽`}, заказ от {zone.minOrder.toLocaleString('ru-RU')} ₽
                            {zone.price === 0 && ' (или от 2 бизнес-ланчей)'}
                        </p>
                    ) : coords ? (
                        <p className="text-xs text-terracotta">
                            Адрес вне зон доставки — привезти туда не сможем. Проверьте адрес или выберите точку на карте.
                        </p>
                    ) : (
                        <p className="text-xs text-cream/55">Зону доставки уточнит администратор при подтверждении.</p>
                    )
                )}

                {/* Время */}
                <div className="mt-1">
                    <div className="mb-1.5 text-sm text-cream/70">Время доставки</div>
                    <div className="flex flex-wrap gap-2">
                        {(['asap', 'custom'] as const).map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => set({ deliveryTime: v, deliveryTimeCustom: v === 'asap' ? '' : f.deliveryTimeCustom })}
                                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                    f.deliveryTime === v ? 'border-brass bg-brass/10 text-cream' : 'border-white/10 bg-white/[0.03] text-cream/70 hover:bg-white/[0.06]'
                                }`}
                            >
                                {v === 'asap' ? 'Как можно быстрее' : 'К времени'}
                            </button>
                        ))}
                        {f.deliveryTime === 'custom' && (
                            <input type="time" min="12:00" max="22:00" className={`${inputCls} [color-scheme:dark] w-auto`} value={f.deliveryTimeCustom} onChange={(e) => set({ deliveryTimeCustom: e.target.value })} />
                        )}
                    </div>
                </div>

                {/* Оплата */}
                <div>
                    <div className="mb-1.5 text-sm text-cream/70">Оплата</div>
                    <div className="flex flex-wrap gap-2">
                        {([['card', 'Картой при получении'], ['cash', 'Наличными']] as const).map(([v, label]) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => set({ paymentMethod: v, changeAmount: v === 'cash' ? f.changeAmount : 'no-change' })}
                                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                    f.paymentMethod === v ? 'border-brass bg-brass/10 text-cream' : 'border-white/10 bg-white/[0.03] text-cream/70 hover:bg-white/[0.06]'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {f.paymentMethod === 'cash' && (
                        <input placeholder="Сдача с суммы (или пусто — без сдачи)" className={`${inputCls} mt-2`} value={f.changeAmount === 'no-change' ? '' : f.changeAmount} onChange={(e) => set({ changeAmount: e.target.value || 'no-change' })} />
                    )}
                </div>

                <textarea placeholder="Комментарий к заказу" rows={4} className={`${inputCls} min-h-[112px] resize-y leading-relaxed`} value={f.comment} onChange={(e) => set({ comment: e.target.value })} />

                <label className="flex items-center gap-2 text-sm text-cream/70">
                    <input type="checkbox" checked={f.hasAllergy} onChange={(e) => set({ hasAllergy: e.target.checked })} className="h-4 w-4 accent-terracotta" />
                    У меня аллергия
                </label>
                {f.hasAllergy && <input placeholder="На что аллергия?" className={inputCls} value={f.allergyDetails} onChange={(e) => set({ allergyDetails: e.target.value })} />}

                <label className="flex items-start gap-3 text-[13px] text-cream/60">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-terracotta" />
                    <span>Согласен на обработку персональных данных согласно <Link href="/privacy" className="text-brass hover:underline">политике</Link>.</span>
                </label>

                {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}
                {!minOrder.isValid && <p className="text-sm text-brass">{minOrder.message}</p>}

                <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="text-sm text-cream/70">
                        Итого: <span className="font-bold text-cream">{total.toLocaleString('ru-RU')} ₽</span>
                        {deliveryPrice != null && <span className="text-cream/45"> {deliveryPrice === 0 ? '· доставка бесплатно' : `· доставка ${deliveryPrice} ₽`}</span>}
                    </div>
                </div>
                <button type="submit" disabled={status === 'sending' || items.length === 0 || !minOrder.isValid || !scheduleOpen || (!!coords && !zone)} className="rounded-lg bg-terracotta px-6 py-3.5 font-semibold text-[#FBF3EA] transition-colors hover:bg-terracotta-dark disabled:opacity-50">
                    {status === 'sending' ? 'Отправляем…' : 'Заказать доставку'}
                </button>
                <p className="text-center text-[12px] text-cream/45">или позвоните <a href={`tel:${SITE.phones[0].tel}`} className="text-brass hover:underline">{SITE.phones[0].label}</a></p>
            </form>
        </Shell>
    );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose} aria-hidden />
            <aside className="fixed right-0 top-0 z-[61] flex h-full w-full flex-col border-l border-white/10 bg-forest sm:w-[460px]">
                <div className="flex items-center justify-between border-b border-white/10 p-5">
                    <h2 className="font-display text-xl font-bold text-cream">{title}</h2>
                    <button onClick={onClose} aria-label="Закрыть" className="rounded-lg p-2 text-cream/70 transition-colors hover:bg-white/10 hover:text-cream">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </aside>
        </>
    );
}
