
# MarketVault-Academy-CTF
Учебная CTF-платформа: 30 намеренно уязвимых веб-сценариев, полиглотные микросервисы и прокачка прогресса — XP, ранги, достижения и scoreboard.

> ⚠️ **Только для обучения.** Проект содержит намеренные уязвимости (SQLi, SSRF, RFI/XXE, XSS, CSRF, IDOR, race condition и другие). Запускайте его в изолированной среде, не подключайте реальные данные, секреты и платёжные системы.

## 
Скриншоты
<img width="1879" height="948" alt="Screenshot 2026-11-21 at 18-12-28 MarketVault Academy" src="https://github.com/user-attachments/assets/4e6aec6f-9198-4945-9945-384cd66c9527" />

<img width="1879" height="3051" alt="Screenshot 2026-11-21 at 18-00-32 MarketVault Academy" src="https://github.com/user-attachments/assets/2c5dc1de-5227-4537-9f4c-544c475fd3a8" />

<img width="1879" height="948" alt="Screenshot 2026-11-21 at 18-12-05 MarketVault Academy" src="https://github.com/user-attachments/assets/42e7e1ab-7854-497c-b23e-d7647ac5254b" />

<img width="1879" height="948" alt="Screenshot 2026-11-21 at 18-12-12 MarketVault Academy" src="https://github.com/user-attachments/assets/b1734999-c2d0-401f-b204-6c41bf05e114" />

<img width="1879" height="948" alt="Screenshot 2026-11-21 at 18-12-19 MarketVault Academy" src="https://github.com/user-attachments/assets/e9c0bff3-a071-4eec-a6d1-1da544d670b3" />

## Документация

- [Руководство по запуску для начинающих](docs/GETTING_STARTED.md)
- [Архитектура проекта](docs/architecture.md)
- [Матрица CTF-заданий](docs/challenge-matrix.md)
- [API-контракты](docs/api-contracts.md)


## Возможности

- 30 заданий по шести сервисам: auth, API/GraphQL, legacy PHP, inventory (Go), MongoDB, Redis и frontend.
- Mission board: каталог миссий по сервисам, XP за сложность, прогресс и next objective.
- Геймификация: ранги, достижения, scoreboard.
- Подсказки в два уровня, раскрытие решения, отправка флагов и фиксация прогресса.
- Изолированная инфраструктура: PostgreSQL, MongoDB, Redis и шесть приложений.
- Автотесты всех 30 сценариев, проверка изоляции и аудит секретов.

## Стек

| Слой | Технология | Порт |
|------|------------|------|
| frontend | React + Vite | 3000 |
| api-gateway | Node.js + Express | 4000 |
| auth-service | Python + FastAPI | внутренний 8000 |
| legacy-service | PHP + Apache | внутренний 80 |
| inventory-service | Go | внутренний 8080 |
| stats-service | Python + Flask | внутренний 8000 |
| PostgreSQL | 16 | внутренний 5432 |
| MongoDB | 7 | внутренний 27017 |
| Redis | 7 | внутренний 6379 |

## Быстрый старт

Требуется Docker 24+ и Docker Compose v2.

```bash
git clone https://github.com/Lon-ik/MarketVault-Academy-CTF.git
cd MarketVault-Academy-CTF
chmod +x scripts/*.sh scripts/flags.py
./scripts/reset.sh
```

- UI: <http://localhost:3000>
- API: <http://localhost:4000>

Скрипт `reset.sh` удаляет тома, генерирует флаги, собирает образы и поднимает стенд.

## Демо-аккаунты

| Логин | Пароль | Роль |
|-------|--------|------|
| student | student123 | student |
| admin | admin123 | admin |

## XP и ранги

| Сложность | XP |
|-----------|-----|
| easy | 100 |
| medium | 200 |
| hard | 300 |

Ранги: `Rookie → Scout → Hunter → Specialist → Elite → Legend`.

## Проверки

```bash
./scripts/run-tests.sh        # эксплуатация всех 30 сценариев + приём флагов
./scripts/verify-isolation.sh # наружу доступны только 3000 и 4000
./scripts/check-secrets.sh    # секреты и флаги не попадают в Git
```

Ожидаемый результат: `TOTAL 35 | PASS 35 | SKIP 0 | FAIL 0`.

## Структура

```
marketvault-academy/
├── docker-compose.yml
├── .env.example
├── db/
│   ├── init/                 # схема, челленджи, прогресс, inventory
│   └── mongo/                # партнёрские аккаунты
├── services/
│   ├── api-gateway/          # Express, GraphQL, прокси, Academy API
│   ├── auth-service/         # FastAPI, JWT, сессии
│   ├── inventory-service/    # Go, заказы и кошелёк
│   ├── legacy-service/       # PHP + Apache
│   ├── stats-service/        # внутренний Flask-сервис
│   └── frontend/             # React + Vite
├── docs/                     # архитектура, API, матрица челленджей
├── scripts/                  # reset, flags, tests, isolation, secrets
├── tests/                    # интеграционные тесты
└── README.md
```

## Изоляция и секреты

> Значения в `.env.example` предназначены только для локального учебного запуска. Не используйте их на публичных серверах или в production. Для любого внешнего развёртывания задайте собственные секреты и учётные данные.


- Сеть `backend` помечена `internal: true`, наружу опубликованы только UI и gateway.
- Флаги генерируются в `runtime/` и не коммитятся.
- `.env`, `runtime/`, `node_modules/` и тестовые окружения исключены из Git.
- Перед публикацией проверьте: `./scripts/check-secrets.sh`.

## Управление флагами

```bash
python3 scripts/flags.py generate          # создать флаги, если их нет
python3 scripts/flags.py sync              # записать флаги в PostgreSQL
ROTATE_FLAGS=1 ./scripts/reset.sh          # полностью новый набор флагов
```
