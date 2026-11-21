UPDATE academy.challenges
SET hint_2 = $mv$POST /api/auth/forgot-password строит ссылку из заголовка Host. Письмо можно посмотреть в лабораторном ящике: GET /api/auth/mailbox?email=...$mv$
WHERE slug = 'password-reset-poisoning';

UPDATE academy.challenges
SET hint_2 = $mv$POST /api/auth/login не ограничивает число попыток. Словарь rockyou подходит; после серии неудач успешный вход отдаёт флаг.$mv$
WHERE slug = 'brute-force-login';