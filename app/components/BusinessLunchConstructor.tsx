'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import type { MenuItem, CartItem, ModifierGroup } from '@/types/index';

type Props = {
  sets: MenuItem[];
  onAddToCart: (item: CartItem) => void;
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

function defaultChoices(set: MenuItem | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of set?.modifierGroups || []) {
    if (isBreadGroup(g.name) && g.options[0]) out[g.id] = g.options[0].id;
  }
  return out;
}

export default function BusinessLunchConstructor({ sets, onAddToCart }: Props) {
  const [selectedSetId, setSelectedSetId] = useState<string | number | null>(sets[0]?.id ?? null);
  // выбранные опции: { [groupId]: optionId }
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    defaultChoices(sets.find((s) => String(s.id) === String(sets[0]?.id)) || null),
  );

  const selectedSet = useMemo(
    () => sets.find((s) => String(s.id) === String(selectedSetId)) || null,
    [sets, selectedSetId],
  );
  const groups: ModifierGroup[] = selectedSet?.modifierGroups || [];

  // Все группы бизнес-ланча обязательны: гость выбирает по одной позиции из каждой.
  // iiko отдаёт min=0 для гарнира/супа/салата/второго/напитка, поэтому опираемся не на min,
  // а на факт выбора в каждой группе (хлеб удовлетворён дефолтом «С хлебом»).
  const missingGroups = groups.filter((g) => !choices[g.id]);
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
    if (!selectedSet || !requiredOk) return;
    const chosen = groups
      .map((g) => {
        const optId = choices[g.id];
        const opt = g.options.find((o) => o.id === optId);
        return opt
          ? { group: g.name, option: opt.name, groupId: String(g.id), optionId: String(opt.id) }
          : null;
      })
      .filter(Boolean) as { group: string; option: string; groupId: string; optionId: string }[];

    const hash = Object.keys(choices).sort().map((g) => `${g}:${choices[g]}`).join('~');
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
    return <div className="text-neutral-400 text-center py-8">Бизнес-ланч сейчас недоступен.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Выбор сета */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sets.map((s) => {
          const active = String(s.id) === String(selectedSetId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSet(s.id)}
              className={`text-left rounded-2xl border px-4 py-3 transition ${
                active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {setImage(s.name) && (
                <div className="relative w-full h-32 mb-3 rounded-xl overflow-hidden">
                  <Image src={setImage(s.name)!} alt={s.name} fill sizes="(max-width: 640px) 100vw, 340px" className="object-cover" />
                </div>
              )}
              <div className="font-semibold">{s.name}</div>
              <div className="text-amber-400 font-bold mt-1">{(s.price || 0).toLocaleString('ru-RU')} ₽</div>
              {s.description && <div className="text-xs text-neutral-400 mt-1">{s.description}</div>}
            </button>
          );
        })}
      </div>

      {/* Группы модификаторов выбранного сета */}
      {selectedSet && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="font-semibold mb-2">
                {g.name}
                <span className="text-amber-400"> *</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {g.options.map((o) => {
                  const active = choices[g.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => choose(g.id, o.id)}
                      className={`text-left rounded-xl border px-3 py-2 text-sm transition ${
                        active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {o.name}
                      {o.price > 0 && <span className="text-neutral-400"> +{o.price} ₽</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Добавить */}
      {selectedSet && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="text-sm text-neutral-400">
            {requiredOk ? 'Готово к добавлению' : `Выберите: ${missingGroups.map((g) => g.name).join(', ')}`}
          </div>
          <button
            type="button"
            disabled={!requiredOk}
            onClick={handleAdd}
            className="px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Добавить — {(selectedSet.price || 0).toLocaleString('ru-RU')} ₽
          </button>
        </div>
      )}
    </div>
  );
}
