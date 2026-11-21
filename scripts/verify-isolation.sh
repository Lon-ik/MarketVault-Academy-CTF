#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="${COMPOSE_PROJECT_NAME:-marketvault-academy}"
status=0
BACKEND="${PROJECT}_backend"
EDGE="${PROJECT}_edge"

internal_flag=$(docker network inspect "$BACKEND" --format '{{.Internal}}' 2>/dev/null || echo "missing")
if [[ "$internal_flag" != "true" ]]; then
  echo "FAIL: network $BACKEND is not internal ($internal_flag)"
  status=1
else
  echo "OK: network $BACKEND is internal"
fi

if ! docker network inspect "$EDGE" >/dev/null 2>&1; then
  echo "FAIL: network $EDGE is missing"
  status=1
fi

internal_services=(postgres mongo redis auth-service stats-service inventory-service legacy-service)
edge_services=(api-gateway frontend)

for service in "${internal_services[@]}"; do
  container=$(docker compose ps -q "$service" 2>/dev/null || true)
  if [[ -z "$container" ]]; then
    continue
  fi
  networks=$(docker inspect "$container" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  if echo "$networks" | grep -q "$EDGE"; then
    echo "FAIL: $service is attached to $EDGE"
    status=1
  else
    echo "OK: $service is isolated ($networks)"
  fi
done

gateway=$(docker compose ps -q api-gateway 2>/dev/null || true)
if [[ -n "$gateway" ]]; then
  gateway_networks=$(docker inspect "$gateway" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  if echo "$gateway_networks" | grep -q "$EDGE" && echo "$gateway_networks" | grep -q "$BACKEND"; then
    echo "OK: api-gateway bridges $EDGE and $BACKEND"
  else
    echo "FAIL: api-gateway networks: $gateway_networks"
    status=1
  fi
fi

published=$(docker ps \
  --filter "label=com.docker.compose.project=$PROJECT" \
  --format '{{.Names}} {{.Ports}}')

echo
echo "Published ports:"
echo "$published"

if echo "$published" | grep -E ':(5432|6379|27017|8000|8080|80)->' >/dev/null 2>&1; then
  echo "FAIL: an internal service publishes a port on the host"
  status=1
else
  echo "OK: only edge ports are published"
fi

if [[ "$status" -eq 0 ]]; then
  echo
  echo "OK: isolation checks passed"
fi

exit "$status"