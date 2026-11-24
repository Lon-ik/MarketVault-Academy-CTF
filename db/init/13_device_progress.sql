-- Прогресс по заданиям, привязанный к устройству (cookie mv_device), а не к аккаунту.
-- Идемпотентно: можно применять и к уже поднятой базе.

CREATE TABLE IF NOT EXISTS academy.device_progress (
    device_id TEXT NOT NULL,
    challenge_id INTEGER NOT NULL REFERENCES academy.challenges(id) ON DELETE CASCADE,
    is_solved BOOLEAN NOT NULL DEFAULT FALSE,
    solved_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    hints_used INTEGER NOT NULL DEFAULT 0,
    solution_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (device_id, challenge_id),
    CONSTRAINT device_solved_at_required CHECK (is_solved = FALSE OR solved_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_device_progress_solved
    ON academy.device_progress (device_id, is_solved);
