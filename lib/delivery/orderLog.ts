// Журнал попыток заказа доставки с сайта (таблица site_order_log в Supabase).
// Пишется на каждый исход: успех iiko, отказ по правилам, ошибка, TG-фолбэк.
// Логирование НИКОГДА не ломает основной поток заказа — все ошибки глушатся.
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type OrderLogOutcome =
  | 'iiko_ok'
  | 'iiko_error'
  | 'tg_fallback'
  | 'rejected_schedule'
  | 'rejected_min_order'
  | 'rejected_stop_list'
  | 'rejected_bl_window'
  | 'bad_request';

export interface OrderLogRecord {
  outcome: OrderLogOutcome;
  /** номер/id заказа при успехе, текст ошибки/причины при отказе */
  detail?: string;
  name?: string;
  phone?: string;
  address?: string;
  items?: unknown;
  subtotal?: number;
  total?: number;
}

export async function logOrderAttempt(rec: OrderLogRecord): Promise<void> {
  try {
    const sb = createSupabaseAdminClient();
    const { error } = await sb.from('site_order_log').insert({
      outcome: rec.outcome,
      detail: rec.detail?.slice(0, 1000) ?? null,
      name: rec.name ?? null,
      phone: rec.phone ?? null,
      address: rec.address ?? null,
      items: rec.items ?? null,
      subtotal: rec.subtotal ?? null,
      total: rec.total ?? null,
    });
    if (error) console.error('site_order_log insert failed:', error.message);
  } catch (e) {
    console.error('site_order_log failed:', e);
  }
}
