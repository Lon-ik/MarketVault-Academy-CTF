CREATE TABLE IF NOT EXISTS academy.challenges (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(80) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    service VARCHAR(40) NOT NULL,
    category VARCHAR(40) NOT NULL,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
    description TEXT NOT NULL,
    flag TEXT NOT NULL,
    hint_1 TEXT NOT NULL,
    hint_2 TEXT NOT NULL,
    solution_payload TEXT NOT NULL,
    vulnerable_code TEXT NOT NULL,
    secure_code TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy.user_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES academy.challenges(id) ON DELETE CASCADE,
    is_solved BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    hints_used INTEGER NOT NULL DEFAULT 0,
    solution_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, challenge_id),
    CONSTRAINT solved_at_required CHECK (is_solved = FALSE OR solved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_challenges_service ON academy.challenges (service);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON academy.challenges (category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON academy.challenges (difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_order ON academy.challenges (order_index);
CREATE INDEX IF NOT EXISTS idx_progress_challenge ON academy.user_progress (challenge_id);
CREATE INDEX IF NOT EXISTS idx_progress_solved ON academy.user_progress (user_id, is_solved);

CREATE OR REPLACE VIEW academy.v_user_progress AS
SELECT
    u.id AS user_id,
    COUNT(c.id) AS total_challenges,
    COUNT(p.challenge_id) FILTER (WHERE p.is_solved) AS solved_challenges,
    ROUND(
        100.0 * COUNT(p.challenge_id) FILTER (WHERE p.is_solved)
        / NULLIF(COUNT(c.id), 0),
        1
    ) AS percent_solved
FROM auth.users u
CROSS JOIN academy.challenges c
LEFT JOIN academy.user_progress p
    ON p.user_id = u.id
    AND p.challenge_id = c.id
    AND p.is_solved = TRUE
WHERE c.is_active = TRUE
GROUP BY u.id;