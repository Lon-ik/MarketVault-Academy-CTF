# API контракты MarketVault Academy

Базовый адрес для React-клиента: `http://localhost:4000`.

## Соглашения

- Формат данных: `application/json`, кроме HTML-разделов legacy.
- Авторизация:
  - JWT: заголовок `Authorization: Bearer <access_token>`, алгоритм HS256;
  - cookie-сессия шлюза: `connect.sid`, устанавливается после `POST /api/session/login`.
- Ошибки шлюза: `{ "error": "..." }`.
- Ошибки auth-service (через прокси): `{ "detail": "..." }`.
- Коды: `200` успех, `302/307` редирект, `400` неверные данные, `401` нет авторизации, `403` запрещено, `404` не найдено, `409` конфликт, `502` сервис недоступен.

## Аутентификация

### POST /api/auth/login

Через прокси auth-service.

Запрос:

```json
{ "username": "student", "password": "student123" }
```

Ответ `200`:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": "<uuid>", "username": "student", "role": "student" },
  "session": "<sid>",
  "flag": null,
  "flags": []
}
```

### POST /api/session/login

Создаёт cookie-сессию шлюза. Запрос тот же, что у `/api/auth/login`, ответ проходит насквозь и дополнительно ставит `connect.sid`.

### POST /api/auth/register

```json
{ "username": "user", "email": "user@academy.local", "password": "secret123" }
```

Ответ `200` содержит `access_token` и `user`. `409`, если имя занято.

### GET /api/auth/me

Заголовок `Authorization: Bearer <jwt>`.

```json
{ "user": { "id": "<uuid>", "username": "student", "role": "student" }, "token": {}, "flag": null }
```

### PATCH /api/auth/profile

`Authorization: Bearer <jwt>`. Принимает поля профиля: `email`, `username`, `role`.

```json
{ "email": "new@academy.local", "role": "admin" }
```

Ответ: `{ "user": {}, "flag": null }`.

### POST /api/auth/forgot-password

```json
{ "email": "student@academy.local" }
```

Ответ: `{ "status": "sent" }`. Ссылка строится на основе заголовка `Host`.

### GET /api/auth/mailbox?email=

Лабораторный почтовый ящик: `{ "email": "...", "messages": [ { "link": "...", "host": "...", "created_at": "..." } ] }`.

### GET /api/auth/reset?token= / POST /api/auth/reset

Проверка и применение сброса:

```json
{ "token": "<token>", "new_password": "newsecret" }
```

Ответ: `{ "status": "password_changed", "flag": null }`.

### GET /api/auth/session?sid=

Работа с Redis-сессией auth-service. Возвращает `{ "sid": "...", "authenticated": true, "user": {}, "flag": null }`.

## Academy API (React Dashboard)

Все запросы требуют `Authorization: Bearer <jwt>`.

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/academy/challenges` | каталог 30 заданий с полем `is_solved` |
| GET | `/api/academy/progress` | `total`, `solved`, `percent`, `byService`, `recent` |
| GET | `/api/academy/challenges/{slug}/hints?level=1\|2` | подсказки, увеличивает `hints_used` |
| POST | `/api/academy/challenges/{slug}/reveal` | возвращает `solution_payload`, `vulnerable_code`, `secure_code` |
| POST | `/api/academy/challenges/{slug}/solve` | проверка флага |

Пример ответа `/api/academy/progress`:

```json
{
  "total": 30,
  "solved": 3,
  "percent": 10.0,
  "byService": [ { "service": "auth-service", "total": 8, "solved": 1 } ],
  "recent": [ { "slug": "jwt-alg-none", "title": "...", "solved_at": "..." } ]
}
```

Пример `/api/academy/challenges/{slug}/solve`:

```json
{ "flag": "MV{...}" }
```

Ответ `200`: `{ "solved": true, "progress": { "total": 30, "solved": 4, "percent": 13.3 } }`, `400` при неверном флаге.

## Публичные сценарии шлюза

| Метод | Путь | Тело / параметры | Примечание |
|-------|------|------------------|------------|
| POST | `/graphql` | `{ "query": "...", "variables": {} }` или массив | интроспекция, batching |
| POST | `/api/images/parse` | `{ "imageUrl": "..." }` | SSRF |
| GET | `/api/landing` | заголовок `X-Forwarded-Host` | кэш ответа |
| POST | `/api/profile/merge` | произвольный JSON | слияние настроек |
| GET | `/api/admin/flag` | cookie `connect.sid` | возвращает флаг при активной сессии |
| GET | `/api/admin/summary` | — | сводка |
| POST | `/api/partner/login` | `{ "username": "...", "password": "..." }` | MongoDB-вход |
| GET | `/api/academy/leaderboard` | Bearer | список лидеров |
| GET | `/api/frontend/bootstrap?page=search\|support` | cookie `connect.sid` | ставит лабораторные cookie для XSS-сценариев |
| POST | `/api/profile/email` | cookie `connect.sid`, `{ "email": "..." }` | смена email, флаг при cross-site origin |
| POST | `/api/checkout/confirm` | cookie `connect.sid`, `{ "framed": true }` | подтверждение заказа, флаг при встраивании |

## Inventory service (через `/api/inventory/*`)

| Метод | Путь | Авторизация | Ответ |
|-------|------|-------------|-------|
| GET | `/api/inventory/products` | нет | `{ "products": [ { "id", "title", "price", "seller", "stock" } ] }` |
| GET | `/api/inventory/products/{id}` | нет | объект товара |
| GET | `/api/inventory/wallet` | Bearer | `{ "userId", "balance" }` |
| POST | `/api/inventory/wallet/topup` | Bearer | `{ "amount": 1000 }` → `{ "balance" }` |
| GET | `/api/inventory/orders` | Bearer | `{ "orders": [...] }` — только свои |
| GET | `/api/inventory/orders/{id}` | Bearer | заказ, поле `flag` при чужом заказе |
| POST | `/api/inventory/redeem` | Bearer | `{ "amount": 1000 }` → `{ "orderId", "balance", "flag"? }` |
| GET | `/api/inventory/files?name=` | нет | текстовое содержимое файла |

## Legacy service (через `/legacy/*`)

| Метод | Путь | Параметры | Формат |
|-------|------|-----------|--------|
| GET | `/legacy/` | — | HTML |
| GET | `/legacy/report.php` | `page` | text/plain |
| GET | `/legacy/template.php` | `page` | text/plain |
| POST | `/legacy/import.php` | XML в теле | text/plain |
| GET | `/legacy/ping.php` | `host` | text/plain |
| GET | `/legacy/dashboard.php` | cookie `prefs` | text/plain |
| POST | `/legacy/upload.php` | multipart `file` | JSON `{ "uploaded", "path", "gateway" }` |
| GET | `/legacy/uploads/{name}` | — | отдаётся Apache, `.php` исполняется |

## Данные для React

- Стартовые аккаунты: `student / student123`, `admin / admin123`.
- Для Dashboard достаточно JWT из `/api/auth/login` и cookie-сессии из `/api/session/login`.
- Прогресс-бар строится по `solved / total` из `/api/academy/progress`.
- Список карточек — `/api/academy/challenges`; модалка «I'm Stuck» использует `hints` и `reveal`; отправка — `solve`.