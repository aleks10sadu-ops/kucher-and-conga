'use client';

import React from 'react';
import type { BookingType, BookingValidation } from '@/lib/booking/rules';

const LABEL: Record<BookingType, string> = {
  onsite: 'Заказ по факту',
  preorder: 'Предзаказ',
  banquet: 'Банкетное меню',
};

type Props = {
  validation: BookingValidation;
  selectedType: BookingType | null;
  onSelect: (t: BookingType) => void;
};

export default function BookingTypeSelector({ validation, selectedType, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {validation.availableTypes.map((t) => {
          const active = selectedType === t.type;
          return (
            <button
              key={t.type}
              type="button"
              disabled={!t.allowed}
              onClick={() => t.allowed && onSelect(t.type)}
              className={`text-left rounded-xl border px-3 py-2 transition ${
                active
                  ? 'border-brass bg-brass/10'
                  : 'border-white/15 bg-white/5 hover:bg-white/10'
              } ${!t.allowed ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold text-sm text-cream">{LABEL[t.type]}</div>
              {!t.allowed && t.reason && (
                <div className="text-[11px] text-cream/55 mt-0.5">{t.reason}</div>
              )}
            </button>
          );
        })}
      </div>

      {validation.info.map((m, i) => (
        <div key={`info-${i}`} className="text-xs text-brass bg-brass/10 border border-brass/25 rounded-lg px-3 py-2">
          {m}
        </div>
      ))}
      {validation.blocking.map((m, i) => (
        <div key={`block-${i}`} className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {m}
        </div>
      ))}
    </div>
  );
}
