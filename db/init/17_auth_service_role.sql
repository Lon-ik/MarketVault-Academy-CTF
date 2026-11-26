-- Отдельная роль PostgreSQL для auth-service.
-- Раньше все сервисы ходили суперпользователем marketvault: SQL-инъекция в логине
-- давала полный контроль над базой (чужие схемы, pg_read_file, COPY ... FROM PROGRAM).
-- Роль auth_service видит только то, что нужно сервису аутентификации.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_service') THEN
        CREATE ROLE auth_service LOGIN PASSWORD 'auth-service-pass';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO auth_service;
GRANT USAGE ON SCHEMA academy TO auth_service;

GRANT SELECT, INSERT, UPDATE ON auth.users TO auth_service;
GRANT SELECT ON auth.jwt_keys TO auth_service;
GRANT SELECT ON academy.challenges TO auth_service;

-- Никаких прав на inventory.*, на остальные таблицы academy и на pg_read_file.
REVOKE CREATE ON SCHEMA public FROM auth_service;
