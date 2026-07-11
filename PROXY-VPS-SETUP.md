# Reverse-proxy для kucherandconga.ru (обход деградации Vercel в РФ)

> Приватные значения в этом документе заменены плейсхолдерами:
> `<IP_VPS>` — публичный IP сервера-прокси, `<EMAIL>` — почта для Let's Encrypt.
> Реальные значения — у владельца проекта (IP виден в A-записях домена: `vercel dns ls kucherandconga.ru`).

## Зачем это нужно

С июля 2026 у части российских провайдеров (мобильные сети, домашний интернет) трафик к
инфраструктуре Vercel деградирован: соединения зависают/обрываются, сайт почти не открывается
без VPN. При этом канал «российский дата-центр → Vercel» работает нормально (проверено:
~4 МБ/с, ~90 мс). Поэтому перед Vercel стоит nginx-прокси на VPS с российским IP:

```
Посетитель ──► VPS (Москва, nginx, <IP_VPS>) ──► Vercel (пул живых IP)
               ├── статика/картинки/видео: кеш на VPS, 7 дней
               └── HTML / API / server actions: всегда свежие с Vercel
```

Процесс разработки не меняется: пуш в GitHub → деплой Vercel → прокси прозрачно отдаёт новое.
В дашборде Vercel домен помечается как «неправильно настроенный» — это ожидаемо (DNS указывает
на прокси, а не на Vercel) и ни на что не влияет.

## Составные части

| Что | Где | Детали |
|---|---|---|
| DNS-зона | Vercel DNS (`ns1/ns2.vercel-dns.com`) | Кастомные A-записи: `@ → <IP_VPS>`, `www → <IP_VPS>` |
| Прокси | VPS Ubuntu 24.04, nginx 1.24 | Конфиги ниже, кеш в `/var/cache/nginx/kucher` (лимит 1 ГБ) |
| TLS | Let's Encrypt (certbot, webroot) | Автопродление: `certbot.timer` + `renew_hook = systemctl reload nginx` |

**Важно про upstream:** nginx ходит на Vercel не по имени, а по пулу фиксированных IP —
во-первых, имя `kucherandconga.ru` после смены DNS указывает на сам VPS (была бы петля),
во-вторых, отдельные IP Vercel недоступны из РФ (на момент настройки мёртв `216.198.79.3` —
он исключён из пула). SNI и Host при этом остаются `kucherandconga.ru`, поэтому Vercel отдаёт
боевой сайт, а сертификат апстрима проверяется по имени домена.

## Конфиги nginx (точные копии с боевого сервера)

### /etc/nginx/conf.d/kucher-cache.conf

```nginx
proxy_cache_path /var/cache/nginx/kucher levels=1:2 keys_zone=kucher:20m max_size=1000m inactive=7d use_temp_path=off;

upstream vercel_origin {
    server 216.198.79.65:443 max_fails=2 fail_timeout=30s;
    server 216.198.79.1:443  max_fails=2 fail_timeout=30s;
    server 64.29.17.1:443    max_fails=2 fail_timeout=30s;
    server 64.29.17.65:443   max_fails=2 fail_timeout=30s;
    server 76.76.21.21:443   max_fails=2 fail_timeout=30s;
    server 76.76.21.61:443   backup;
    server 66.33.60.34:443   backup;
    keepalive 16;
}
```

### /etc/nginx/snippets/kucher-proxy-common.conf

```nginx
proxy_pass https://vercel_origin;
proxy_set_header Host kucherandconga.ru;
proxy_ssl_server_name on;
proxy_ssl_name kucherandconga.ru;
proxy_ssl_protocols TLSv1.2 TLSv1.3;
proxy_ssl_verify on;
proxy_ssl_verify_depth 3;
proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
proxy_ssl_session_reuse on;

proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_set_header Connection "";

proxy_connect_timeout 3s;
proxy_read_timeout 60s;
proxy_next_upstream error timeout http_502 http_503;
proxy_next_upstream_tries 3;

proxy_cache kucher;
proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
proxy_cache_lock on;
proxy_cache_lock_timeout 10s;
add_header X-Proxy-Cache $upstream_cache_status;
```

### /etc/nginx/snippets/kucher-proxy.conf

```nginx
client_max_body_size 25m;

location / {
    include snippets/kucher-proxy-common.conf;
}

location ~* \.(mp4|webm|webp|avif|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|css|js)$ {
    include snippets/kucher-proxy-common.conf;
    proxy_ignore_headers Cache-Control Expires Set-Cookie;
    proxy_cache_valid 200 301 7d;
    proxy_cache_valid 404 1m;
}
```

Vercel отдаёт файлы из `public/` с `max-age=0`, поэтому для медиа заголовки origin игнорируются
и кеш держится 7 дней принудительно. HTML и API под это правило не попадают — страница меню
(ISR, пересборка раз в 10 минут) и формы всегда идут в Vercel напрямую.

### /etc/nginx/sites-available/kucherandconga (симлинк в sites-enabled)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name kucherandconga.ru www.kucherandconga.ru;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kucherandconga.ru www.kucherandconga.ru;

    ssl_certificate     /etc/letsencrypt/live/kucherandconga.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kucherandconga.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    include snippets/kucher-proxy.conf;
}
```

`http2 on;` — только для nginx ≥ 1.25; в 1.24 HTTP/2 включается флагом в `listen` (как выше).

## Восстановление с нуля (новый/переустановленный VPS)

```bash
# 1. Пакеты
apt-get update && apt-get install -y nginx certbot
mkdir -p /var/www/certbot /var/cache/nginx/kucher
rm -f /etc/nginx/sites-enabled/default

# 2. Разложить конфиги из этого документа по путям выше,
#    НО во временном виде: в site-конфиге оставить только server:80,
#    внутри него вместо редиректа — include snippets/kucher-proxy.conf;
ln -sf /etc/nginx/sites-available/kucherandconga /etc/nginx/sites-enabled/kucherandconga
nginx -t && systemctl reload nginx

# 3. Проверить пул IP (какие живы с этого сервера) и поправить upstream при необходимости:
for ip in 216.198.79.1 216.198.79.65 64.29.17.1 64.29.17.65 76.76.21.21 76.76.21.61 66.33.60.34; do
  echo -n "$ip -> "; curl -s -o /dev/null -w "%{http_code}/%{time_total}s\n" --max-time 5 \
    --resolve kucherandconga.ru:443:$ip https://kucherandconga.ru/robots.txt; done

# 4. DNS: направить домен на новый VPS (на машине с авторизованным Vercel CLI):
#    npx vercel dns ls kucherandconga.ru            # посмотреть/удалить старые A-записи (vercel dns rm <id>)
#    npx vercel dns add kucherandconga.ru '' A <IP_VPS>
#    npx vercel dns add kucherandconga.ru www A <IP_VPS>

# 5. Сертификат (после смены DNS; ретраить, пока LE не увидит новую A-запись):
certbot certonly --webroot -w /var/www/certbot -d kucherandconga.ru -d www.kucherandconga.ru \
  --non-interactive --agree-tos -m <EMAIL> --no-eff-email

# 6. Вернуть боевой site-конфиг (80 → редирект, 443 → прокси) и хук продления:
sed -i '/\[renewalparams\]/a renew_hook = systemctl reload nginx' /etc/letsencrypt/renewal/kucherandconga.ru.conf
nginx -t && systemctl reload nginx

# 7. Проверка
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://kucherandconga.ru/
curl -sI https://kucherandconga.ru/redesign/hero-mobile.mp4 | grep -i x-proxy-cache   # 2-й раз должен быть HIT
```

## Обслуживание

- **Сайт лёг, на VPS всё запущено** → проверить живость IP пула (шаг 3 выше): ТСПУ мог убить
  ещё какие-то IP — убрать мёртвые из `upstream`, `nginx -t && systemctl reload nginx`.
- **Мониторинг ошибок**: `tail -f /var/log/nginx/error.log` (таймауты апстрима видно сразу).
- **Сбросить кеш статики**: `rm -rf /var/cache/nginx/kucher/* && systemctl reload nginx`.
- **Полный откат на прямой Vercel** (если блокировки снимут): удалить обе кастомные A-записи —
  `npx vercel dns ls kucherandconga.ru`, затем `npx vercel dns rm <id>` для каждой; зона вернётся
  к системным ALIAS-записям Vercel в течение минут.
- **Переезд на другой VPS**: пройти «Восстановление с нуля» на новой машине — DNS переключать
  в самом конце (шаг 4), старый прокси до этого продолжает работать.
