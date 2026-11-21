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
    u.username,
    p.solved_challenges,
    p.total_challenges,
    p.percent_solved
FROM academy.v_user_progress p
JOIN auth.users u ON u.id = p.user_id
ORDER BY u.username;
SQL