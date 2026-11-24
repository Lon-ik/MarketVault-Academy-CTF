#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT COUNT(*) AS challenges FROM academy.challenges;
SELECT service, COUNT(*) AS total
FROM academy.challenges
GROUP BY service
ORDER BY service;
SELECT
    d.device_id,
    COUNT(*) FILTER (WHERE d.is_solved) AS solved,
    (SELECT COUNT(*) FROM academy.challenges WHERE is_active = TRUE) AS total
FROM academy.device_progress d
GROUP BY d.device_id
ORDER BY solved DESC;
SQL