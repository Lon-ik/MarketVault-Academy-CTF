CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS academy;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS legacy;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO auth.users (id, username, email, password_hash, role)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'student',
        'student@academy.local',
        crypt('student123', gen_salt('bf')),
        'student'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'admin',
        'admin@academy.local',
        crypt('admin123', gen_salt('bf')),
        'admin'
    )
ON CONFLICT (id) DO NOTHING;