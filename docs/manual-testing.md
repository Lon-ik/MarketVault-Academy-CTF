# Как проверять задания вручную

Платформа рассчитана на исследование через браузер, DevTools и HTTP-клиент. Ниже — базовые приёмы, без готовых решений.

## 1. Где взять токен

1. Войдите через `http://localhost:3000/login`.
2. Откройте DevTools → Application → Local Storage → ключ `mv_token`.
3. Либо посмотрите ответ `POST /api/auth/login` на вкладке Network: поле `access_token`.

Дальше токен передаётся заголовком:

```bash
curl -i http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## 2. Cookie-сессия

Шлюз выдаёт cookie `connect.sid` после `POST /api/session/login`. Сохранить и использовать её в curl:

```bash
curl -i -c cookies.txt -X POST http://localhost:4000/api/session/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"student123"}'

curl -i -b cookies.txt http://localhost:4000/api/admin/flag
```

Auth-service использует отдельную cookie `sid`.

## 3. Где искать флаг

В зависимости от задания флаг возвращается в одном из мест:

- JSON-поле `flag` или массив `flags`;
- заголовок ответа `X-Challenge-Flag`;
- cookie (например, `dom_xss_flag` и `pm_xss_flag` видны в DevTools → Application → Cookies);
- HTML-комментарий в теле ответа;
- stdout команды в ответе legacy-сервиса.

После успешного входа через UI флаг из ответа автоматически показывается в правом нижнем углу сайта (toast «flag received»).

## 4. Быстрые инструменты

- **Браузер**: для страниц `http://localhost:3000/*`, cookie и XSS-сценариев.
- **curl**: для API, заголовков, GraphQL, NoSQL и конкурентных запросов.
- **DevTools → Network**: посмотреть запрос, тело, заголовки и `Set-Cookie`.
- **ffuf / hydra**: перебор паролей.
- **jwt.io / jwt_tool**: разбор и подпись JWT.
- **jq**: читать JSON из ответа.

Пример с телом JSON:

```bash
curl -i -X POST http://localhost:4000/api/partner/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"partner123"}'
```

## 5. Если флаг «не появляется»

- Убедитесь, что стенд запущен: `docker compose ps`.
- Проверьте, что используете правильный вход: UI на `:3000`, API на `:4000`.
- Для API-заданий смотрите полный ответ (`curl -i`), а не только страницу браузера.
- Для cookie-сценариев проверяйте именно ту cookie и тот `Path`, который указан в подсказке.
- Для CSRF: браузер может не отправить `SameSite=Lax` cookie в межсайтовом POST. Для проверки используйте curl/Postman с cookie и заголовком `Origin`, как указано в подсказке.
- Для XSS: открывайте страницу на `:3000` и смотрите DevTools → Console/Application.

## 6. Автоматическая проверка всех сценариев

```bash
cd /home/LONIK/marketvault-academy
./scripts/run-tests.sh
```

Скрипт проверяет эксплуатацию каждого задания, получение флага и его приём через Academy API, затем сбрасывает состояние.