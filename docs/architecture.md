# Архитектура MarketVault Academy

## Целевая схема

```
                    ┌──────────────────────────────┐
                    │        Browser / React       │
                    │      http://localhost:3000   │
                    └──────────────┬───────────────┘
                                   │ HTTP / WebSocket
                    ┌──────────────▼───────────────┐
                    │        api-gateway :4000     │
                    │   Express, JWT, GraphQL,     │
                    │   партнёрский кабинет, кэш   │
                    └───┬────────┬────────┬────────┘
                        │        │        │
          ┌─────────────▼──┐ ┌───▼─────┐ ┌▼─────────────────┐
          │ auth-service   │ │ legacy  │ │ inventory-service│
          │ FastAPI :8000  │ │ PHP :80 │ │ Go :8080         │
          └───┬────────┬───┘ └──┬───┬──┘ └───┬──────────┬───┘
              │        │        │   │        │          │
              │        │        │   │        │          │
       ┌──────▼───┐ ┌──▼────────▼───▼──┐ ┌───▼──────┐ ┌─▼────────────┐
       │ postgres │ │      redis        │ │  mongo   │ │ stats-service│
       │  :5432   │ │      :6379        │ │ :27017   │ │ Flask :8000  │
       └──────────┘ └───────────────────┘ └──────────┘ └──────────────┘
```

`stats-service` доступен только из сети `backend` и не публикует порт. Шлюз и
`auth-service`/`inventory-service` могут обращаться к нему по DNS-имени
`stats-service`, что делает его целью SSRF-сценариев.

## Сети и границы доверия

| Сеть | Участники | Публикация |
|------|-----------|------------|
| `edge` | frontend, api-gateway | 3000, 4000 |
| `backend` | api-gateway, auth-service, legacy-service, inventory-service, stats-service, postgres, mongo, redis | нет |

- Наружу опубликованы только UI и API-шлюз.
- PostgreSQL, MongoDB, Redis и stats-service недоступны с хоста.
- `api-gateway` — единственная точка, которая видит обе сети.
- Прямых портов у legacy/inventory нет: доступ идёт через прокси шлюза.
- `backend` помечена как `internal: true`: у сервисов нет выхода в интернет.
  SSRF работает по внутреннему DNS-имени `stats-service`, RFI использует
  wrapper `data://`, поэтому внешняя сеть не требуется.

## Данные и владельцы схем

| Хранилище | Схема/БД | Владелец | Назначение |
|-----------|----------|----------|------------|
| PostgreSQL | `auth` | auth-service | пользователи платформы, роли, состояние входов |
| PostgreSQL | `academy` | platform API | каталог челленджей, прогресс, подсказки, решения |
| PostgreSQL | `inventory` | inventory-service | склад, заказы, кошельки, файлы |
| PostgreSQL | `legacy` | legacy-service | зарезервировано под старые отчёты |
| MongoDB | `marketvault` | api-gateway | партнёрские аккаунты и каталог (NoSQL-сценарии) |
| Redis | DB 0 | auth-service | сессии, счётчики попыток |
| Redis | DB 1 | inventory-service | блокировки, кэш остатков |
| Redis | DB 2 | stats-service | служебные счётчики |
| Redis | DB 3 | api-gateway | кэш ответов, GraphQL rate limit |

Все схемы создаются в одном инстансе PostgreSQL, но логически изолированы по
именам. Каждый сервис получает свой `DB_SCHEMA` и обращается только к нему.

## Модель прогресса

`academy.challenges` — статический каталог 32 сценариев. Поля:

- `slug` — стабильный идентификатор для фронтенда и API;
- `hint_1`, `hint_2` — последовательные подсказки;
- `solution_payload` — точный эксплойт для вкладки «Разбор»;
- `vulnerable_code` / `secure_code` — фрагменты для подсветки;
- `flag` — эталонное значение, которое проверяет сервис;
- `service`, `category`, `difficulty`, `order_index` — фильтры и сортировка.

`academy.device_progress` — состояние прохождения, привязанное к устройству
(cookie `mv_device`), а не к аккаунту:

- первичный ключ `(device_id, challenge_id)`;
- `is_solved` и `solved_at` для прогресс-бара;
- `attempts`, `last_attempt_at` для аналитики;
- `hints_used`, `solution_revealed` для честной статистики.

Сводка по устройству (`solved`, `total`, `percent` и разбивка по сервисам)
считается прямо в запросах Dashboard; отдельного представления и таблицы
лидеров нет.

## Поток прогресса

1. React загружает каталог через `GET /api/academy/challenges`.
2. Для каждой карточки приходит состояние прохождения из
   `academy.device_progress` по cookie `mv_device`; аккаунт на прогресс не влияет.
3. Кнопка «Подсказки и разбор» вызывает `GET /api/academy/challenges/:slug/hints`
   и увеличивает `hints_used`.
4. Вкладка «Показать разбор» вызывает `POST /api/academy/challenges/:slug/reveal`,
   выставляет `solution_revealed` и возвращает `solution_payload`,
   `vulnerable_code`, `secure_code`.
5. Сервис-цель при успешной эксплуатации отправляет флаг на
   `POST /api/academy/challenges/:slug/solve`; платформа сверяет `flag` и
   выставляет `is_solved=TRUE`, `solved_at=now()`.

Эндпоинты платформенного API будут реализованы в `api-gateway` на следующем
этапе. Схема уже поддерживает все состояния Dashboard.

## Этапы

| Этап | Содержимое | Статус |
|------|------------|--------|
| 1 | compose, сети, PostgreSQL-схемы, каталог 32 челленджей, прогресс | готово |
| 2 | auth-service и api-gateway, JWT, Academy API | готово |
| 3 | legacy-service, inventory-service, stats-service, MongoDB/Redis | готово |
| 4 | интеграционные тесты, изоляция, контракты, randomized flags | готово |
| 5 | React Dashboard и 4 frontend-челленджа | готово |

## Эксплуатация

- Все init-скрипты PostgreSQL лежат в `db/init` и выполняются только при
  создании пустого тома `pgdata`.
- `scripts/reset.sh` полностью пересоздаёт окружение.
- Пароли и секреты для локального стенда лежат в `.env`; для публичного
  размещения значения нужно заменить.
- Healthcheck есть у PostgreSQL, MongoDB и Redis; healthcheck приложений
  добавляется вместе с их Dockerfile на следующем этапе.
- Витрина защищена от скупки: `inventory.stock_baseline` хранит изначальные
  остатки (сид `14_stock_baseline.sql`), а `api-gateway` раз в 15 минут
  возвращает их в `inventory.products`. Интервал задаётся переменной
  `STOCK_RESET_MINUTES` (по умолчанию 15).
- Легаси-портал намеренно уязвим (RCE, LFI, XXE, upload, unserialize), поэтому
  он ограничен по ресурсам и записи: `read_only` с `tmpfs` для `/tmp` и
  `uploads`, `pids_limit`, `memory`/`cpus` и `no-new-privileges`. Порты `3000`
  и `4000` публикуются только на `127.0.0.1`, сеть `backend` помечена
  `internal: true` — из контейнеров хост недоступен, а задания остаются
  решаемыми. Легаси-портал вынесен в отдельную internal-сеть `legacy`: из него
  виден только шлюз, но не база, redis и соседние сервисы, а учётные данные БД
  из его окружения убраны.
- `auth-service` ходит в базу отдельной ролью `auth_service` (только `auth.users`,
  `auth.jwt_keys` и чтение `academy.challenges`), а не суперпользователем: SQL-инъекция
  в логине больше не даёт доступ к схеме `inventory`, `pg_read_file` и
  `COPY ... FROM PROGRAM`.