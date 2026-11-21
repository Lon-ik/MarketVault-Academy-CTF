#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="${COMPOSE_PROJECT_NAME:-marketvault-academy}"
DC=(docker compose)
SERVICES=(postgres mongo redis auth-service stats-service api-gateway inventory-service legacy-service frontend)

echo "[1/6] Останавливаю окружение и удаляю тома..."
"${DC[@]}" -p "$PROJECT" down -v --remove-orphans

echo "[2/6] Генерирую флаги..."
if [[ "${ROTATE_FLAGS:-0}" == "1" ]]; then
  python3 scripts/flags.py generate --rotate
else
  python3 scripts/flags.py generate
fi

echo "[3/6] Собираю образы..."
"${DC[@]}" -p "$PROJECT" build auth-service stats-service api-gateway inventory-service legacy-service frontend

echo "[4/6] Запускаю сервисы..."
"${DC[@]}" -p "$PROJECT" up -d "${SERVICES[@]}"

echo "[5/6] Ожидаю готовности PostgreSQL..."
for _ in $(seq 1 45); do
  if "${DC[@]}" -p "$PROJECT" exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "[6/6] Синхронизирую флаги и состояние..."
python3 scripts/flags.py sync
"${DC[@]}" -p "$PROJECT" up -d --wait "${SERVICES[@]}"

"${DC[@]}" -p "$PROJECT" ps
echo
echo "Frontend: http://localhost:3000"
echo "API:      http://localhost:4000"
echo "Флаги:    python3 scripts/flags.py status"
echo "Postgres: docker compose exec postgres psql -U marketvault -d marketvault"