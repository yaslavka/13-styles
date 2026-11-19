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

Установите Node.js 20 LTS, git, nginx, certbot и pm2:

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx certbot python3-certbot-nginx
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
NEXT_PUBLIC_SITE_URL=http://13-style.com

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

```bash
# Основной сайт (порт 3000)
pm2 start "node .next/standalone/server.js" --name web -e .env

# Чат поддержки (socket.io, порт 3003)
cd mini-services/chat-service && npm install && cd ../..
pm2 start "node mini-services/chat-service/index.js" --name chat

pm2 save          # сохранить список процессов
pm2 startup       # автозапуск после перезагрузки сервера (выполните выведенную команду)
```

Проверка: `pm2 status` — оба процесса `online`;
`curl -I http://localhost:3000` → HTTP 200.

---

## Шаг 6. Nginx (обратный прокси)

```bash
nano /etc/nginx/sites-available/13styles
```

Содержимое (замените домен):

```nginx
server {
    listen 80;
    server_name ваш_домен www.ваш_домен;
    client_max_body_size 25m;

    # WebSocket (чат): запросы с XTransformPort уходят в чат-сервис на :3003.
    # Фронтенд всегда подключается как /?XTransformPort=3003 — правило ниже
    # направляет их в нужный сервис без изменения кода.
    if ($arg_XTransformPort) {
        set $backend http://127.0.0.1:$arg_XTransformPort;
    }

    location / {
        proxy_pass $backend_or_main;  # см. примечание ниже
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Статика sitemap/robots/фото отдаётся напрямую из public/ Next.js —
    # отдельной настройки не требует.
}
```

Из-за особенности nginx с `if` проще использовать такой рабочий вариант
`location /` (без if, с двумя location):

```nginx
    location / {
        # чат и любые сервисы через ?XTransformPort=N
        error_page 418 = @chat;
        if ($arg_XTransformPort) { return 418; }
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location @chat {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
```

Активируйте и включите HTTPS:

```bash
ln -sf /etc/nginx/sites-available/13styles /etc/nginx/sites-enabled/13styles
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d ваш_домен -d www.ваш_домен   # бесплатный SSL, автообновление
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
| Чат не подключается | `pm2 status` — процесс `chat` онлайн; проверьте блок `@chat` в nginx |
| 413 при загрузке фото в админке | Увеличьте `client_max_body_size` в nginx |
| Порт 3000 занят | `pm2 delete web` и запустите заново; либо смените порт в pm2-команде и в nginx `proxy_pass` |
