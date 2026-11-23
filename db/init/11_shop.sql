-- Витрина магазина: категории, характеристики, картинки и голоса за отзывы.
-- Скрипт идемпотентный: его можно применять и к уже поднятой базе.

ALTER TABLE inventory.products
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'Прочее',
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT TRUE;

-- Голоса за отзывы. Уникального ограничения нет намеренно:
-- ничто не мешает накрутить сколько угодно лайков одному отзыву.
CREATE TABLE IF NOT EXISTS inventory.review_votes (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES inventory.reviews(id) ON DELETE CASCADE,
    voter_id VARCHAR(64) NOT NULL DEFAULT 'anonymous',
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('like', 'dislike')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON inventory.review_votes (review_id);

-- Отзыв можно подписать чужим именем, поэтому автора храним ещё и строкой.
ALTER TABLE inventory.reviews
    ADD COLUMN IF NOT EXISTS author_name VARCHAR(64);
ALTER TABLE inventory.reviews
    ALTER COLUMN author_id DROP NOT NULL;

-- ---------- характеристики и картинки существующих товаров ----------

UPDATE inventory.products SET
    category = 'Смартфоны',
    description = 'Флагман с титановым корпусом, экраном 120 Гц и быстрой зарядкой.',
    image_url = 'https://placehold.co/640x420/131a26/ea6a0c/png?text=Aurora+X',
    specs = '{"Память": "256 ГБ", "Процессор": "Snapdragon 8 Gen 1", "Цвет": "Графит"}'::jsonb
WHERE id = 1;

UPDATE inventory.products SET
    category = 'Наушники',
    description = 'Накладные наушники с активным шумоподавлением и кейсом.',
    image_url = 'https://placehold.co/640x420/131a26/ea6a0c/png?text=Pulse+Pro',
    specs = '{"Тип": "Накладные", "Автономность": "30 ч", "Цвет": "Чёрный"}'::jsonb
WHERE id = 2;

UPDATE inventory.products SET
    category = 'Аксессуары',
    description = 'Механическая клавиатура со свитчами, подсветкой и съёмным кабелем.',
    image_url = 'https://placehold.co/640x420/131a26/ea6a0c/png?text=KeyForge',
    specs = '{"Подключение": "USB-C", "Свитчи": "Tactile Brown", "Цвет": "Серый"}'::jsonb
WHERE id = 3;

UPDATE inventory.products SET category = 'Прочее', is_listed = FALSE WHERE id IN (4, 5, 6);

UPDATE inventory.products SET
    category = 'Аксессуары',
    description = 'Силиконовый чехол с защитой камеры и мягким внутренним слоем.',
    image_url = 'https://placehold.co/640x420/131a26/ea6a0c/png?text=Case',
    specs = '{"Материал": "Силикон", "Цвет": "Прозрачный"}'::jsonb
WHERE id = 7;

UPDATE inventory.products SET
    category = 'Мониторы',
    description = '27-дюймовый 4K-монитор с поддержкой HDR и регулировкой высоты.',
    image_url = 'https://placehold.co/640x420/131a26/ea6a0c/png?text=ViewMax+27',
    specs = '{"Диагональ": "27\"", "Разрешение": "3840x2160", "Матрица": "IPS"}'::jsonb
WHERE id = 8;

-- ---------- новые товары витрины ----------

INSERT INTO inventory.products (id, title, price, seller, stock, category, description, image_url, specs)
SELECT * FROM (VALUES
    (9,  'Смартфон X-200 Pro',        8999000::bigint, 'alice', 1,  'Смартфоны',
     'Топовая модель с тройной камерой, 12 ГБ оперативной памяти и экраном 6.7\".',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=X-200+Pro',
     '{"Память": "12/256 ГБ", "Процессор": "Snapdragon 8 Gen 2", "Цвет": "Титановый", "Экран": "6.7\" AMOLED"}'::jsonb),
    (10, 'Смартфон Aurora Lite',      3499000::bigint, 'alice', 14, 'Смартфоны',
     'Средний класс с хорошей автономностью и чистой системой.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Aurora+Lite',
     '{"Память": "8/128 ГБ", "Процессор": "Dimensity 8200", "Цвет": "Голубой"}'::jsonb),
    (11, 'Ноутбук Nimbus 14',         11999000::bigint, 'alice', 6,  'Ноутбуки',
     'Лёгкий ультрабук для работы: 14 дюймов, алюминий, до 16 часов автономности.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Nimbus+14',
     '{"Память": "16/512 ГБ", "Процессор": "Core Ultra 7", "Цвет": "Серебристый", "Экран": "14\" IPS"}'::jsonb),
    (12, 'Ноутбук Vector Gaming 16',  18999000::bigint, 'alice', 4,  'Ноутбуки',
     'Игровая станция с дискретной видеокартой и экраном 165 Гц.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Vector+16',
     '{"Память": "32/1024 ГБ", "Процессор": "Ryzen 9", "Видеокарта": "RTX 4070", "Цвет": "Чёрный"}'::jsonb),
    (13, 'Наушники Pulse Air',         1299000::bigint, 'alice', 25, 'Наушники',
     'Вкладыши с шумоподавлением и зарядным кейсом.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Pulse+Air',
     '{"Тип": "TWS", "Автономность": "24 ч", "Цвет": "Белый"}'::jsonb),
    (14, 'Наушники Studio One',        2499000::bigint, 'alice', 9,  'Наушники',
     'Студийные мониторные наушники с ровной АЧХ и съёмным кабелем.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Studio+One',
     '{"Тип": "Мониторные", "Сопротивление": "250 Ом", "Цвет": "Чёрный"}'::jsonb),
    (15, 'Умные часы Chrono S2',       2799000::bigint, 'carol', 11, 'Умные часы',
     'Часы с AMOLED-экраном, GPS и расширенными датчиками пульса.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Chrono+S2',
     '{"Экран": "1.4\" AMOLED", "Автономность": "10 дней", "Цвет": "Стальной"}'::jsonb),
    (16, 'Умные часы FitBand Active',   899000::bigint, 'carol', 30, 'Умные часы',
     'Лёгкий трекер для тренировок с пульсометром и защитой от воды.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=FitBand',
     '{"Экран": "1.1\" TFT", "Автономность": "14 дней", "Цвет": "Красный"}'::jsonb),
    (17, 'Роутер NetCore AX3000',       999000::bigint, 'carol', 18, 'Роутеры',
     'Wi-Fi 6 роутер с гигабитными портами и гостевой сетью.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=NetCore',
     '{"Стандарт": "Wi-Fi 6", "Порты": "1 WAN + 4 LAN", "Цвет": "Белый"}'::jsonb),
    (18, 'Роутер MeshLink 3-pack',     2199000::bigint, 'carol', 7,  'Роутеры',
     'Комплект из трёх модулей для бесшовного покрытия квартиры.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=MeshLink',
     '{"Стандарт": "Wi-Fi 6", "Модулей": "3", "Цвет": "Белый"}'::jsonb),
    (19, 'Планшет Slate 11',           4499000::bigint, 'alice', 12, 'Планшеты',
     'Планшет 11 дюймов для работы с документами и рисования.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Slate+11',
     '{"Память": "8/256 ГБ", "Экран": "11\" 120 Гц", "Цвет": "Серый"}'::jsonb),
    (20, 'Повербанк Volt 20000',        449000::bigint, 'carol', 40, 'Аксессуары',
     'Внешний аккумулятор с быстрой зарядкой и индикатором остатка.',
     'https://placehold.co/640x420/131a26/ea6a0c/png?text=Volt',
     '{"Ёмкость": "20000 мАч", "Мощность": "65 Вт", "Цвет": "Чёрный"}'::jsonb)
) AS seed(id, title, price, seller, stock, category, description, image_url, specs)
WHERE NOT EXISTS (SELECT 1 FROM inventory.products WHERE id = 9);

SELECT setval(pg_get_serial_sequence('inventory.products', 'id'), COALESCE((SELECT MAX(id) FROM inventory.products), 1));

-- ---------- отзывы и голоса для наполнения витрины ----------

INSERT INTO inventory.reviews (product_id, rating, body, author_id, author_name)
SELECT * FROM (VALUES
    (9, 5, 'Камера отличная, но греется в играх.', '11111111-1111-1111-1111-111111111111'::uuid, 'student'),
    (9, 4, 'Быстрый, батарея держит день. Цена кусается.', '22222222-2222-2222-2222-222222222222'::uuid, 'admin'),
    (11, 5, 'Идеален для поездок: тихий и лёгкий.', '11111111-1111-1111-1111-111111111111'::uuid, 'student'),
    (15, 3, 'GPS ловит не сразу, в остальном норм.', '22222222-2222-2222-2222-222222222222'::uuid, 'admin'),
    (17, 4, 'Покрытие хорошее, веб-интерфейс устаревший.', '11111111-1111-1111-1111-111111111111'::uuid, 'student')
) AS seed(product_id, rating, body, author_id, author_name)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory.reviews r WHERE r.product_id = 9
);

INSERT INTO inventory.review_votes (review_id, voter_id, vote)
SELECT r.id, v.voter, v.vote
FROM (VALUES
    ('student', 'like'), ('admin', 'like'), ('guest-1', 'like'), ('guest-2', 'dislike')
) AS v(voter, vote)
CROSS JOIN LATERAL (
    SELECT id FROM inventory.reviews WHERE product_id = 9 ORDER BY id LIMIT 1
) AS r
WHERE NOT EXISTS (SELECT 1 FROM inventory.review_votes);


-- ---------- корзина ----------

CREATE TABLE IF NOT EXISTS inventory.cart_items (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

-- ---------- промокоды для пополнения кошелька ----------

CREATE TABLE IF NOT EXISTS inventory.promo_codes (
    code VARCHAR(40) PRIMARY KEY,
    amount BIGINT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.promo_redemptions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL REFERENCES inventory.promo_codes(code) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, code)
);

INSERT INTO inventory.promo_codes (code, amount, description, max_uses)
VALUES
    ('WELCOME', 500000, 'Приветственный бонус новому покупателю', NULL),
    ('MV2026', 1000000, 'Сезонная акция MarketVault', NULL),
    ('SECURITYDAY', 2500000, 'День информационной безопасности', 1000),
    ('DEBUG-ACCESS', 10000000, 'Служебный код для отладки витрины', 10)
ON CONFLICT (code) DO NOTHING;

