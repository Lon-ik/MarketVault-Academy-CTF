INSERT INTO academy.user_progress
    (user_id, challenge_id, is_solved, solved_at, attempts, hints_used)
SELECT
    '11111111-1111-1111-1111-111111111111'::uuid,
    id,
    TRUE,
    now() - make_interval(days => order_index),
    2,
    1
FROM academy.challenges
WHERE slug IN ('jwt-alg-none', 'jwt-weak-secret', 'sqli-auth-bypass')
ON CONFLICT (user_id, challenge_id) DO NOTHING;