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

CREATE INDEX IF NOT EXISTS idx_challenges_service ON academy.challenges (service);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON academy.challenges (category);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON academy.challenges (difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_order ON academy.challenges (order_index);

-- Прогресс заданий живёт в academy.device_progress (см. 13_device_progress.sql).
-- Таблицы прогресса по аккаунту и таблицы лидеров больше нет.
