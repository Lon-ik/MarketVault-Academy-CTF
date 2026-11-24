#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

REDIS_PASS=$(grep -E '^REDIS_PASSWORD=' .env 2>/dev/null | cut -d= -f2 || true)
REDIS_PASS=${REDIS_PASS:-marketvault}

docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<'SQL'
DELETE FROM academy.user_progress
WHERE user_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM academy.user_progress p
USING auth.users u
WHERE p.user_id = u.id AND u.username LIKE 'qa_%';

DELETE FROM academy.device_progress;

DELETE FROM auth.users WHERE username LIKE 'qa_%';

UPDATE auth.users
SET email = 'student@academy.local'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE inventory.wallets
SET balance = 10000
WHERE user_id = '11111111-1111-1111-1111-111111111111';

DELETE FROM inventory.orders
WHERE notes IN ('redeem', 'cart checkout', 'negative quantity', 'web checkout');

DELETE FROM inventory.cart_items;
DELETE FROM inventory.promo_redemptions;
UPDATE inventory.promo_codes SET used_count = 0;
UPDATE inventory.products SET stock = 1 WHERE id = 9;
SQL

for db in 0 1 2 3; do
  docker compose exec -T -e REDISCLI_AUTH="$REDIS_PASS" redis redis-cli -n "$db" FLUSHDB >/dev/null
done

docker compose exec -T legacy-service sh -c 'find /var/www/html/uploads -type f -name "*.php" -delete' >/dev/null 2>&1 || true

docker compose restart api-gateway >/dev/null

for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:4000/api/health >/dev/null; then
    break
  fi
  sleep 1
done

echo "state reset"