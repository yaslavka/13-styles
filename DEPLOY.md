# Релиз 13 STYLES: запуск на сервере — полная пошаговая инструкция

## Хостинг или сервер — что правильнее?

**Правильнее — VPS (виртуальный сервер), например Ubuntu 22.04/24.04.**

Обычный «шаред-хостинг» (cPanel, ISPmanager с PHP) для этого проекта **не подходит**:
13 STYLES — это Next.js-приложение (Node.js), API-маршруты, база SQLite, генерация
sitemap и socket.io-чат поддержки. Всё это живёт в постоянных Node-процессах,
которые на шаред-хостинге запустить нельзя.

**Минимальные требования VPS:**

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| CPU      | 2 vCPU  | 4 vCPU        |
| RAM      | 4 GB    | 8 GB          |
| Диск     | 40 GB SSD (репозиторий с фото товаров > 3 GB) | 80 GB SSD |
| ОС       | Ubuntu 22.04 / 24.04 LTS | — |

---

## Шаг 0. Домен

1. Купите домен у регистратора (например, `13styles.ru`).
2. В DNS добавьте **A-запись**: `@` → IP-адрес вашего VPS. Добавьте и `www`, если хотите поддерживать `www.домен`.
3. Подождите 15–60 минут, пока DNS обновится. Проверка: `ping домен` должен показывать IP сервера.

> HTTPS обязателен: DOKU требует защищённые callback-URL, и мы его бесплатно
> получим через Let's Encrypt (Шаг 7).

---

## Шаг 1. Подготовка сервера

Подключитесь по SSH (Windows: `ssh root@IP` в PowerShell или PuTTY):

```bash
ssh root@ВАШ_IP
```

Установите Node.js 20 LTS, git, Apache, certbot и pm2:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git apache2 certbot python3-certbot-apache
npm install -g pm2
```

Проверьте версии: `node -v` (v20.x), `npm -v`, `git --version`, `pm2 -v`.

---

## Шаг 2. Загрузка проекта из GitHub

```bash
cd /var/www
git clone https://github.com/yaslavka/13-styles.git 13styles
cd 13styles
```

**Важно:** клонировать полностью, без sparse-checkout — фото товаров
(`public/products/`, более 3 ГБ) лежат в репозитории и обязательны для витрины.
Если клон медленный, сначала уменьшите трафик: `git config --global core.compression 9`.

---

## Шаг 3. Файл .env

```bash
cp .env.example .env
nano .env
```

Заполните:

```ini
NODE_ENV=production
# Путь к базе SQLite на сервере:
DATABASE_URL=file:/var/www/13styles/db/custom.db

# Публичный адрес сайта (обязательно! он попадает в SEO, sitemap и callback DOKU):
# HTTPS протокол обязателен — DOKU принимает только https callback-URL:
NEXT_PUBLIC_SITE_URL=https://13-style.com

# ПОРТЫ ЗАПУСКА — если стандартные на сервере заняты, впишите свои:
# PORT      — витрина Next.js (npm start / pm2 web); ProxyPass / в Apache должен
#             указывать на этот порт
# CHAT_PORT — socket.io чат-сервиса (pm2 chat); в Apache порт чата менять НЕ нужно —
#             он подставляется из запроса автоматически, а клиент узнаёт его
#             в рантайме через /api/config/chat-port
PORT=3000
CHAT_PORT=3003

# Платежи DOKU (5 мерчантов, FUNSTAY — по умолчанию):
DOKU_ENV=production
DOKU_NOTIFY_ALLOW_UNVERIFIED=true
DOKU_EUR_IDR_RATE=17500
DOKU_FUNSTAY_CLIENT_ID=...
DOKU_FUNSTAY_SECRET_KEY=...
DOKU_FUNSTAY_API_KEY=...
DOKU_SKYVIEW_CLIENT_ID=...
... (все 5 мерчантов, как в рабочем .env)
DOKU_CARD_OFF_SESSION_TYPE=MOTO
```

Проще всего: скопировать готовый рабочий `.env` с локальной машины
(`scp .env root@ВАШ_IP:/var/www/13styles/.env`) и поправить только
`DATABASE_URL` и `NEXT_PUBLIC_SITE_URL`.

---

## Шаг 4. База данных, зависимости, сборка

```bash
# 1. Зависимости
npm install

# 2. База данных: восстанавливается из дампа репозитория (товары, фото-ссылки, бренды)
npm run db:restore

# 3. Prisma-клиент
npm run db:generate

# 4. Сборка (заодно пересоберёт sitemap.xml и robots.txt в public/)
npm run build
```

Если на сервере не нужен git-клон с историей, после сборки можно уменьшить место:
`git gc --aggressive --prune=now`.

---

## Шаг 5. Запуск процессов через pm2

Порты берутся из .env (PORT и CHAT_PORT) — если стандартные 3000/3003 заняты,
просто впишите свои в .env и перезапустите pm2-процессы.

```bash
# Основной сайт (порт из PORT в .env, по умолчанию 3000)
pm2 start scripts/start-web.cjs --name web

# Чат поддержки (socket.io, порт из CHAT_PORT в .env, по умолчанию 3003)
cd mini-services/chat-service && npm install && cd ../..
pm2 start mini-services/chat-service/index.js --name chat

pm2 save          # сохранить список процессов
pm2 startup       # автозапуск после перезагрузки сервера (выполните выведенную команду)
```

Проверка: `pm2 status` — оба процесса `online`;
`curl -I http://localhost:ПОРТ_ВИТРИНЫ` → HTTP 200.

Если меняли порты в .env: `pm2 restart web chat --update-env`.

---

## Шаг 6. Apache (обратный прокси)

Включите модули прокси и WebSocket (mod_proxy_wstunnel нужен для чата):

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite headers
systemctl restart apache2
```

Создайте виртуальный хост:

```bash
nano /etc/apache2/sites-available/13styles.conf
```

Содержимое (замените домен; **порт в ProxyPass должен совпадать с PORT из .env**.
Порт чата в Apache прописывать НЕ нужно — он берётся из запроса автоматически,
а клиент узнаёт его в рантайме через /api/config/chat-port):

```apache
<VirtualHost *:80>
    ServerName ваш_домен
    ServerAlias www.ваш_домен

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyTimeout 300

    # Исходный протокол (http/https) доходит до Next.js в обоих vhost
    # без правок после certbot (Apache 2.4.10+):
    RequestHeader set X-Forwarded-Proto "expr=%{HTTPS} == 'on' ? 'https' : 'http'"

    RewriteEngine On

    # 1) WebSocket-транспорт чата: запросы с ?XTransformPort=N и заголовком
    #    Upgrade: websocket уходят туннелем (ws://) в чат-сервис на порту N.
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteCond %{QUERY_STRING} (^|&)XTransformPort=([0-9]+)(&|$)
    RewriteRule ^(.*)$ ws://127.0.0.1:%2$1 [P,L]

    # 2) Остальные запросы с ?XTransformPort=N (polling-транспорт чата и любые
    #    другие микросервисы) — обычный HTTP-прокси на тот же динамический порт:
    RewriteCond %{HTTP:Upgrade} !websocket [NC]
    RewriteCond %{QUERY_STRING} (^|&)XTransformPort=([0-9]+)(&|$)
    RewriteRule ^(.*)$ http://127.0.0.1:%2$1 [P,L]

    # 3) Всё остальное — витрина Next.js (PORT из .env, здесь 3000):
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    ErrorLog ${APACHE_LOG_DIR}/13styles-error.log
    CustomLog ${APACHE_LOG_DIR}/13styles-access.log combined
</VirtualHost>
```

Важно: внутри каждой пары RewriteCond условие с портом стоит ПОСЛЕДНИМ —
подстановка %2 берёт скобки из последней сработавшей строки RewriteCond.
Порядок правил тоже важен: правила с RewriteCond проверяются до ProxyPass.

Активируйте и включите HTTPS:

```bash
a2ensite 13styles
a2dissite 000-default
apache2ctl configtest && systemctl reload apache2
certbot --apache -d ваш_домен -d www.ваш_домен   # бесплатный SSL, автообновление
```

**HTTPS протокол обязателен.** На вопрос certbot «Please choose whether or not to
redirect HTTP traffic to HTTPS» выберите **2 (Redirect)** — весь HTTP-трафик
автоматически переводится на https 301-редиректом. Certbot создаст SSL-вариант
хоста и пропишет редирект в Apache сам (благодаря строке RequestHeader с expr
конфиг править после certbot не нужно).

Проверка редиректа и сертификата после certbot:

```bash
curl -sI http://ваш_домен | head -3          # должно быть: 301 Moved Permanently + Location: https://…
curl -sI https://ваш_домен | head -1         # HTTP/1.1 200 OK
```

---

## Шаг 7. После запуска: админка и SEO

1. **Админка**: `https://домен/admin` → логин `admin` / пароль `13styles2024`
   (смените пароль в разделе «Безопасность»).
2. **Платежи DOKU → Глобальные настройки → «Адрес сайта»**: впишите
   `https://ваш_домен` и сохраните — это URL для callback-ов платежей.
   Каждый запрос создания платежа сам передаёт в DOKU:
   - `order.callback_url` / `callback_url_result` / `callback_url_cancel` — возврат покупателя;
   - `additional_info.override_notification_url` — серверное уведомление о статусе
     (`/api/payments/doku/notify`).
   **Настраивать Notification URL в DOKU Console не требуется.**
   Если в кабинете DOKU он всё же задан — путь должен быть тем же
   (`/api/payments/doku/notify`), домен можно любой: override заменит его.
3. **SEO**: откройте `https://домен/sitemap.xml` (индекс из чанков по всем товарам)
   и `https://домен/robots.txt`. В [Google Search Console](https://search.google.com/search-console)
   добавьте домен и отправьте sitemap: «Индексирование → Карты сайта → sitemap.xml».
   Яндекс: [Вебмастер](https://webmaster.yandex.ru) → «Файлы Sitemap».
4. Проверьте страницу товара: правый клик → «Просмотр кода» — в `<head>` есть
   title, description, OG-теги, JSON-LD Product, у каждого `<img>` заполнен alt.

---

## Шаг 8. Обновление релиза (когда внесены правки)

```bash
cd /var/www/13styles
git pull
npm install
npm run db:restore        # только если в коммите обновлялся дамп db/seed/custom.db.gz
npm run db:generate
npm run build             # next build + перегенерация sitemap + копирование статики
pm2 restart web chat
```

Если менялись данные каталога (товары/цены/бренды) без обновления дампа —
пересоберите sitemap отдельно: `npm run sitemap`.

---

## Шаг 9. Бэкапы

```bash
# Дамп базы (снапшот → gzip в db/seed/custom.db.gz)
npm run db:dump

# Секретный бэкап вне репозитория (cron раз в сутки):
# 0 4 * * * cd /var/www/13styles && npm run db:dump && cp db/seed/custom.db.gz /root/backups/$(date +\%F).gz
```

Восстановление на новом сервере: `npm run db:restore` (распакует дамп в `db/custom.db`).

---

## Частые проблемы

| Симптом | Причина и решение |
|---------|-------------------|
| `/sitemap.xml` отдаёт 404/пустой файл | Запустите `npm run sitemap` — файлы генерируются в `public/` |
| Фото товаров 404 | Клон был неполным — убедитесь, что `public/products/g2l` существует (`git checkout -- public/products`) |
| Оплата DOKU: «Could not open DOKU payment» | Проверьте ключи мерчанта в админке и режим (БОЕВОЙ/ТЕСТ); смотрите журнал `pm2 logs web` |
| Уведомление о платеже не приходит | URL в «Адрес сайта» должен быть публичным HTTPS-доменом (localhost/ngrok DOKU игнорирует); проверьте, что `https://домен/api/payments/doku/notify` доступен извне |
| Чат не подключается | `pm2 status` — процесс `chat` онлайн; проверьте RewriteRule-блоки XTransformPort в Apache (модули proxy, proxy_wstunnel, rewrite включены) |
| 413 при загрузке фото в админке | Увеличьте `LimitRequestBody` в Apache (по умолчанию 0 — без лимита) |
| Порт витрины занят (PORT) | Впишите свободный порт в .env (PORT) и `pm2 restart web --update-env`; в Apache `ProxyPass /` укажите тот же порт |
| Порт чата занят / чат не отвечает (CHAT_PORT) | Впишите свободный порт в .env (CHAT_PORT) и `pm2 restart chat --update-env`; в Apache менять ничего не нужно — порт маршрутизируется из запроса автоматически, клиент подхватит его через /api/config/chat-port |
