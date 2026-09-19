'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { MenuItem, CartItem, ModifierGroup } from '@/types/index';
import { isBusinessLunchOpen, BUSINESS_LUNCH_WINDOW_TEXT } from '@/lib/menu/businessLunchWindow';
import {
  isGarnishGroup,
  selectedDishHasNoGarnish,
} from '@/lib/menu/businessLunchModifiers';

type Props = {
  sets: MenuItem[];
  onAddToCart: (item: CartItem) => void;
  // Стоп-лист iiko (productId недоступных позиций). Модификатор в стопе нельзя выбрать.
  stopSet?: Set<string>;
};

// Дефолт «С хлебом» ставим только для выделенной группы «Хлеб» (её создаёт mapMenu
// с точным именем 'Хлеб'). Подстрочный матч /хлеб/i ошибочно ловил бы группу
// «Выбор хлеба и напитков» и авто-выбирал напиток — напитки гость выбирает сам.
const isBreadGroup = (name: string) => name.trim().toLowerCase() === 'хлеб';

// Локальные фото сетов (скачаны из внешнего меню iiko): «Бизнес ланчи СЕТ № N» → set-N.webp
function setImage(name: string): string | null {
  const m = name.match(/сет\s*№?\s*([1-4])/i);
  return m ? `/business-lunch/set-${m[1]}.webp` : null;
}

function conciseSetDescription(description?: string | null): string | null {
  if (!description) return null;

  const composition = description.match(/комплексный бизнес-ланч:\s*([^.]*)/i)?.[1]?.trim();
  if (!composition) return description.split('. ')[0].trim();

  const compactComposition = composition
    .replace(/первое блюдо/gi, 'Первое')
    .replace(/второе блюдо/gi, 'Второе')
    .replace(/салат/gi, 'Салат');

  return `В сет входит: ${compactComposition}`;
}

function defaultChoices(set: MenuItem | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of set?.modifierGroups || []) {
    if (isBreadGroup(g.name) && g.options[0]) out[g.id] = g.options[0].id;
  }
  return out;
}

export default function BusinessLunchConstructor({ sets, onAddToCart, stopSet }: Props) {
  const isOptStopped = (o: { id: string }) => !!stopSet && stopSet.has(String(o.id));
  const [selectedSetId, setSelectedSetId] = useState<string | number | null>(sets[0]?.id ?? null);
  // выбранные опции: { [groupId]: optionId }
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    defaultChoices(sets.find((s) => String(s.id) === String(sets[0]?.id)) || null),
  );

  // Окно заказа считаем на клиенте (страница — ISR, серверное время закешировано).
  // Пересчитываем раз в минуту, чтобы кнопка ожила/погасла на границе часов без перезагрузки.
  const [orderingOpen, setOrderingOpen] = useState(true);
  useEffect(() => {
    const tick = () => setOrderingOpen(isBusinessLunchOpen());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const selectedSet = useMemo(
    () => sets.find((s) => String(s.id) === String(selectedSetId)) || null,
    [sets, selectedSetId],
  );
  useEffect(() => {
    if (selectedSet || !sets.length) return;
    setSelectedSetId(sets[0].id);
    setChoices(defaultChoices(sets[0]));
  }, [sets, selectedSet]);
  const groups: ModifierGroup[] = selectedSet?.modifierGroups || [];
  const garnishDisabled = selectedDishHasNoGarnish(groups, choices);

  // Стоп-лист приходит асинхронно после монтирования: если ранее выбранная опция
  // (в т.ч. дефолтный «С хлебом») попала в стоп — снимаем выбор, чтобы гость не
  // отправил недоступную позицию. Пустая группа снова станет «нужно выбрать».
  useEffect(() => {
    setChoices((c) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const g of groups) {
        const optId = c[g.id];
        const opt = optId ? g.options.find((o) => o.id === optId) : undefined;
        if (optId && (!opt || isOptStopped(opt))) { changed = true; continue; }
        if (optId) next[g.id] = optId;
      }
      return changed ? next : c;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopSet, selectedSetId, selectedSet]);

  // При выборе блюда с пометкой «Без гарнира» снимаем ранее выбранный гарнир.
  // Если затем выбрать обычное блюдо, группа снова разблокируется и потребует
  // нового осознанного выбора — старый гарнир сам не вернётся.
  useEffect(() => {
    if (!garnishDisabled) return;
    setChoices((current) => {
      const next = { ...current };
      let changed = false;
      for (const group of groups) {
        if (isGarnishGroup(group.name) && next[group.id]) {
          delete next[group.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [garnishDisabled, groups]);

  // Все группы бизнес-ланча обязательны: гость выбирает по одной позиции из каждой.
  // iiko отдаёт min=0 для гарнира/супа/салата/второго/напитка, поэтому опираемся не на min,
  // а на факт выбора в каждой группе (хлеб удовлетворён дефолтом «С хлебом»).
  // Опция в стопе не должна попасть в заказ, даже если была выбрана до обновления стоп-листа.
  const chosenOptStopped = (g: ModifierGroup) => {
    const opt = g.options.find((o) => o.id === choices[g.id]);
    return !opt || isOptStopped(opt);
  };

  const missingGroups = groups.filter(
    (g) => !(garnishDisabled && isGarnishGroup(g.name)) && (!choices[g.id] || chosenOptStopped(g)),
  );
  const requiredOk = missingGroups.length === 0;

  const selectSet = (id: string | number) => {
    setSelectedSetId(id);
    const next = sets.find((s) => String(s.id) === String(id)) || null;
    setChoices(defaultChoices(next)); // сброс, но с дефолтным «С хлебом»
  };

  const choose = (groupId: string, optionId: string) => {
    setChoices((c) => ({ ...c, [groupId]: optionId }));
  };

  const handleAdd = () => {
    if (!selectedSet || !requiredOk || !orderingOpen) return;
    const chosen = groups
      .filter((g) => !(garnishDisabled && isGarnishGroup(g.name)))
      .map((g) => {
        const optId = choices[g.id];
        const opt = g.options.find((o) => o.id === optId);
        return opt
          ? { group: g.name, option: opt.name, groupId: String(g.id), optionId: String(opt.id) }
          : null;
      })
      .filter(Boolean) as { group: string; option: string; groupId: string; optionId: string }[];

    const hash = chosen
      .map((modifier) => `${modifier.groupId}:${modifier.optionId}`)
      .sort()
      .join('~');
    const composition = chosen.map((c) => `${c.group}: ${c.option}`).join('; ');

    onAddToCart({
      id: `bl-${selectedSet.id}-${hash}`,
      name: selectedSet.name,
      price: selectedSet.price || 0,
      qty: 1,
      weight: 'Бизнес-ланч',
      description: composition,
      isBusinessLunch: true,
      productId: String(selectedSet.id),
      modifiers: chosen,
    });
  };

  if (!sets.length) {
    return <div className="text-cream/55 text-center py-8">Бизнес-ланч сейчас недоступен.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Выбор сета */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
        {sets.map((s) => {
          const active = String(s.id) === String(selectedSetId);
          const image = setImage(s.name);
          const description = conciseSetDescription(s.description);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectSet(s.id)}
              className={`grid min-h-[112px] grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-2xl border p-2.5 text-left transition sm:min-h-[124px] sm:grid-cols-[100px_minmax(0,1fr)] sm:p-3 ${
                active ? 'border-brass bg-brass/10' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]'
              }`}
            >
              {image && (
                <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                  <Image src={image} alt={s.name} fill sizes="(max-width: 640px) 92px, 100px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 self-center">
                <div className="text-sm font-semibold leading-tight text-cream sm:text-base">{s.name}</div>
                <div className="mt-1 text-base font-bold leading-none text-brass">{(s.price || 0).toLocaleString('ru-RU')} ₽</div>
                {description && <div className="mt-2 text-xs leading-snug text-cream/65">{description}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Группы модификаторов выбранного сета */}
      {selectedSet && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((g) => {
            const disabledByDish = garnishDisabled && isGarnishGroup(g.name);
            return (
              <div key={g.id} className={disabledByDish ? 'opacity-55' : undefined}>
                <div className="font-semibold mb-2">
                  {g.name}
                  {disabledByDish
                    ? <span className="text-cream/55 font-normal"> — не требуется</span>
                    : <span className="text-brass"> *</span>}
                </div>
                {disabledByDish && (
                  <div className="mb-2 text-xs text-cream/55">
                    Гарнир отключён для выбранного блюда с пометкой «Без гарнира».
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {g.options.map((o) => {
                    const active = !disabledByDish && choices[g.id] === o.id;
                    const stopped = isOptStopped(o);
                    const disabled = stopped || disabledByDish;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={disabled}
                        aria-disabled={disabled}
                        onClick={() => { if (!disabled) choose(g.id, o.id); }}
                        className={`text-left rounded-xl border px-3 py-2 text-sm transition ${
                          disabled
                            ? 'border-white/10 bg-white/[0.02] opacity-50 cursor-not-allowed'
                            : active
                              ? 'border-brass bg-brass/10'
                              : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]'
                        }`}
                      >
                        <span className={stopped ? 'line-through' : undefined}>{o.name}</span>
                        {o.price > 0 && !disabled && <span className="text-cream/55"> +{o.price} ₽</span>}
                        {stopped && <span className="text-cream/55"> — нет в наличии</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Окно заказа закрыто: меню видно, но добавить в корзину нельзя */}
      {!orderingOpen && (
        <div className="rounded-2xl border border-brass/30 bg-brass/10 px-4 py-3 text-sm text-cream/80">
          Бизнес-ланчи заказывают {BUSINESS_LUNCH_WINDOW_TEXT} (по Москве). Сейчас можно посмотреть меню и собрать сет, а оформить заказ получится в рабочие часы.
        </div>
      )}

      {/* Добавить */}
      {selectedSet && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-sm text-cream/55">
            {!orderingOpen
              ? `Заказ ${BUSINESS_LUNCH_WINDOW_TEXT}`
              : requiredOk
                ? 'Готово к добавлению'
                : `Выберите: ${missingGroups.map((g) => g.name).join(', ')}`}
          </div>
          <button
            type="button"
            disabled={!requiredOk || !orderingOpen}
            onClick={handleAdd}
            className="px-6 py-3 rounded-full bg-terracotta text-[#FBF3EA] font-semibold hover:bg-terracotta-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {orderingOpen ? `Добавить — ${(selectedSet.price || 0).toLocaleString('ru-RU')} ₽` : 'Заказ закрыт'}
          </button>
        </div>
      )}
    </div>
  );
}
