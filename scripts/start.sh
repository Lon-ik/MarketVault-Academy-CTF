#!/usr/bin/env bash
#
# Поднимает стенд одной командой: проверяет окружение, готовит .env и флаги,
# собирает образы, запускает сервисы и дожидается готовности.
#
#   ./scripts/start.sh                обычный запуск (или достройка уже поднятого стенда)
#   ./scripts/start.sh --fresh        снести тома и поднять заново
#   ./scripts/start.sh --rotate-flags новый набор флагов
#   ./scripts/start.sh --no-build     без пересборки образов
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

FRESH=0
BUILD=1
ROTATE=0

usage() {
  cat <<'HELP'
Запуск MarketVault Academy.

  ./scripts/start.sh                 поднять стенд (или достроить уже запущенный)
  ./scripts/start.sh --fresh         удалить тома и поднять заново
  ./scripts/start.sh --rotate-flags  сгенерировать новые флаги
  ./scripts/start.sh --no-build      не пересобирать образы
  ./scripts/start.sh --help          эта справка

После запуска: http://localhost:3000 (student / student123)
HELP
}

for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=1 ;;
    --rotate-flags) ROTATE=1 ;;
    --no-build) BUILD=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Неизвестный параметр: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

step() { printf '\n[%s] %s\n' "$1" "$2"; }
ok()   { printf '   · %s\n' "$*"; }
warn() { printf '   ! %s\n' "$*" >&2; }
die()  { printf '\nОшибка: %s\n' "$*" >&2; exit 1; }

port_busy() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null || return 1
  exec 3<&- 2>/dev/null || true
  return 0
}

# ---------- 1. окружение ----------

step 1/7 "Проверяю окружение"

command -v docker >/dev/null 2>&1 \
  || die "Docker не установлен. Инструкция: https://docs.docker.com/engine/install/"

docker info >/dev/null 2>&1 \
  || die "Docker установлен, но не запущен. Запустите Docker Desktop или службу docker."

docker compose version >/dev/null 2>&1 \
  || die "Нужен Docker Compose v2 (плагин 'docker compose'). Проверьте: docker compose version"

ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo ok)"
ok "compose $(docker compose version --short 2>/dev/null || echo v2)"

STACK_UP=0
if docker compose ps --status running --quiet 2>/dev/null | grep -q .; then
  STACK_UP=1
fi

if [ "$STACK_UP" -eq 0 ]; then
  for port in 3000 4000; do
    if port_busy "$port"; then
      die "Порт $port занят другим приложением. Освободите его и запустите снова."
    fi
  done
fi
ok "порты 3000 и 4000 свободны"

# ---------- 2. конфигурация ----------

step 2/7 "Готовлю конфигурацию"

if [ ! -f .env ]; then
  cp .env.example .env
  ok "создан .env из .env.example"
else
  ok ".env уже есть, оставляю как есть"
fi

# ---------- 3. флаги ----------

step 3/7 "Готовлю флаги"

generate_flags() {
  local extra="${1:-}"
  if command -v python3 >/dev/null 2>&1; then
    python3 scripts/flags.py generate $extra
    return
  fi
  warn "python3 не найден, генерирую флаги во временном контейнере"
  docker run --rm -v "$ROOT:/repo" -w /repo python:3.12-alpine \
    python scripts/flags.py generate $extra
}

if [ "$ROTATE" -eq 1 ]; then
  generate_flags --rotate
  ok "флаги перегенерированы"
elif [ ! -f runtime/flags.json ]; then
  generate_flags
  ok "флаги созданы"
else
  ok "флаги уже сгенерированы"
fi

mkdir -p runtime/flags/inventory runtime/flags/legacy

# ---------- 4. сборка ----------

step 4/7 "Готовлю образы"

if [ "$FRESH" -eq 1 ]; then
  ok "удаляю контейнеры и тома"
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
fi

if [ "$BUILD" -eq 1 ]; then
  docker compose build
  ok "образы собраны"
else
  ok "сборка пропущена (--no-build)"
fi

# ---------- 5. запуск ----------

step 5/7 "Запускаю сервисы"

docker compose up -d --remove-orphans
ok "контейнеры запущены"

# ---------- 6. готовность ----------

step 6/7 "Жду готовности"

printf '   · PostgreSQL'
for _ in $(seq 1 60); do
  if docker compose exec -T postgres sh -c \
      'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    total="$(docker compose exec -T postgres sh -c \
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from academy.challenges"' 2>/dev/null | tr -d '[:space:]')" || total=""
    if [ -n "${total:-}" ] && [ "${total:-0}" -gt 0 ] 2>/dev/null; then
      printf ' готово (%s заданий)\n' "$total"
      break
    fi
  fi
  printf '.'
  sleep 2
done

docker compose exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from academy.challenges"' >/dev/null 2>&1 \
  || die "PostgreSQL не инициализировался. Посмотрите: docker compose logs postgres"

# ---------- 7. флаги в базу ----------

step 7/7 "Записываю флаги в базу"

awk -v q="'" -F'"' '/^  "/ && NF >= 4 {
  print "UPDATE academy.challenges SET flag = " q $4 q " WHERE slug = " q $2 q ";"
}' runtime/flags.json \
  | docker compose exec -T postgres sh -c \
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -v ON_ERROR_STOP=1' >/dev/null

ok "флаги синхронизированы"

docker compose restart api-gateway >/dev/null 2>&1 || true

printf '   · API'
for _ in $(seq 1 45); do
  if curl -sf -m 2 http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    printf ' готово\n'
    break
  fi
  printf '.'
  sleep 1
done
curl -sf -m 2 http://127.0.0.1:4000/api/health >/dev/null 2>&1 \
  || warn "API ещё не отвечает, посмотрите: docker compose logs api-gateway"

printf '   · Интерфейс'
for _ in $(seq 1 60); do
  if curl -sf -m 2 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    printf ' готово\n'
    break
  fi
  printf '.'
  sleep 1
done
curl -sf -m 2 http://127.0.0.1:3000/ >/dev/null 2>&1 \
  || warn "Интерфейс ещё не отвечает, посмотрите: docker compose logs frontend"

# ---------- итог ----------

cat <<'DONE'

Стенд запущен.

  Интерфейс:  http://localhost:3000
  API:        http://localhost:4000/api/health

  Аккаунты:   student / student123
              admin   / admin123

  Логи:       docker compose logs -f
  Остановка:  docker compose down
  Сброс:      ./scripts/start.sh --fresh
  Флаги:      python3 scripts/flags.py status

DONE
