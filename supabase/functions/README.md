# Supabase Edge Functions — уведомления о доставках в Telegram

Обе функции задеплоены в Supabase-проект `supabase-kucherandcongo` (`mmyfglktqvojwpycreko`)
и пишут в TG-группу «Kucher&Congа - доставка» от бота `@Kucher_and_congo_bot`.
Здесь лежат копии исходников — сами функции живут в Supabase (деплой через MCP/CLI),
не забывайте синхронизировать изменения в обе стороны.

## Как устроены уведомления (1 сообщение на доставку)

```
заказ на сайте → /api/orders → iiko
                                 │
        вебхук iiko (мгновенно)  │   pg_cron (раз в минуту)
                 ▼               │            ▼
          iiko-webhook ──────────┴──────► iiko-poller
                 │        общая таблица        │
                 └──► iiko_notified_orders ◄───┘
```

- **iiko-webhook** — принимает вебхуки iiko (`DeliveryOrderUpdate`), мгновенно шлёт
  «🚚 Новая доставка №…» и атомарно «бронирует» заказ INSERT'ом в
  `iiko_notified_orders` (конфликт по PK = уже объявлен → skip). Дубли невозможны
  даже при холодных стартах и повторных событиях iiko.
  URL вебхука настроен в iiko API (`/api/1/webhooks/update_settings`), authToken = `POLLER_KEY`.
- **iiko-poller** — опрашивает iiko раз в минуту (pg_cron `iiko-poller-minutely`):
  напоминание «не подтверждён > 7 минут», редактирование сообщения при смене статуса,
  громкий reply при отмене/удалении. Новые заказы объявляет **только если** вебхук
  этого не сделал (строки в таблице нет) — т.е. работает страховкой при падении вебхука.

## История (июль 2026)

Раньше «🚚 Новая доставка» слал отдельный Vercel-проект `iiko-tg-webhook` с дедупом
в памяти лямбды: на холодном старте память пуста → дубль. Плюс поллер слал своё
сообщение, не зная про вебхук. Итого до 3 сообщений на одну доставку. Vercel-проект
больше не используется (iiko переключён на `iiko-webhook`), его можно удалить.

## Секреты (Supabase → Edge Functions → Secrets)

`IIKO_API_LOGIN`, `IIKO_ORGANIZATION_ID`, `TG_TOKEN`, `TG_CHAT_ID`, `POLLER_KEY`
(+ автоматические `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
У обеих функций `verify_jwt = false` — авторизация своя: поллер проверяет заголовок
`x-poller-key`, вебхук — `Authorization` (значение = `POLLER_KEY`).
