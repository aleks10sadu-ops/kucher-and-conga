-- Журнал всех попыток заказа доставки с сайта: что пришло и чем закончилось.
-- Пишет только сервер (service role); RLS включён без политик — анону закрыто.
-- Применена в проде 14.07.2026 (mmyfglktqvojwpycreko).
create table if not exists site_order_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  outcome text not null,   -- iiko_ok | iiko_error | tg_fallback | rejected_schedule | rejected_min_order | rejected_stop_list | rejected_bl_window | bad_request
  detail text,             -- номер/id заказа или текст ошибки
  name text,
  phone text,
  address text,
  items jsonb,
  subtotal numeric,
  total numeric
);
create index if not exists site_order_log_created_idx on site_order_log (created_at desc);
alter table site_order_log enable row level security;
