'use client';

import React from 'react';
import { Clock, Truck } from 'lucide-react';

export default function DeliveryStatusBanner({ settings, isAvailable, onDeliveryClick }) {
  if (isAvailable) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {settings.isDeliveryEnabled ? (
            <Clock className="w-6 h-6 text-amber-500" />
          ) : (
            <Truck className="w-6 h-6 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-300 mb-2">
            {settings.isDeliveryEnabled ? 'Доставка временно недоступна' : 'Доставка отключена'}
          </h3>
          <p className="text-amber-200 mb-3">
            {settings.isDeliveryEnabled
              ? `Доставка осуществляется с ${settings.startTime} до ${settings.endTime}. Попробуйте оформить заказ позже или забронируйте стол.`
              : 'Доставка временно отключена администратором. Попробуйте оформить заказ позже или забронируйте стол.'
            }
          </p>
          <button
            onClick={onDeliveryClick}
            className="px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors font-medium"
          >
            Посмотреть меню
          </button>
        </div>
      </div>
    </div>
  );
}
