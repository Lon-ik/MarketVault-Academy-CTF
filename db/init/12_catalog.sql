-- Расширение каталога: живые фото товаров, магазины, продавцы и отзывы.
-- Файл идемпотентный: повторный запуск ничего не дублирует.

-- ---------- пользователи-продавцы ----------

INSERT INTO auth.users (id, username, email, password_hash, role)
VALUES
    ('33333333-3333-3333-3333-333333333301', 'alice', 'alice@marketvault.local', crypt('student123', gen_salt('bf')), 'student'),
    ('33333333-3333-3333-3333-333333333302', 'bob',   'bob@marketvault.local',   crypt('student123', gen_salt('bf')), 'student'),
    ('33333333-3333-3333-3333-333333333303', 'carol', 'carol@marketvault.local', crypt('student123', gen_salt('bf')), 'student'),
    ('33333333-3333-3333-3333-333333333304', 'dave',  'dave@marketvault.local',  crypt('student123', gen_salt('bf')), 'student'),
    ('33333333-3333-3333-3333-333333333305', 'erin',  'erin@marketvault.local',  crypt('student123', gen_salt('bf')), 'student'),
    ('33333333-3333-3333-3333-333333333306', 'frank', 'frank@marketvault.local', crypt('student123', gen_salt('bf')), 'student')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory.wallets (user_id, balance)
SELECT id, 250000 FROM auth.users
WHERE username IN ('alice', 'bob', 'carol', 'dave', 'erin', 'frank')
ON CONFLICT (user_id) DO NOTHING;

-- ---------- магазины ----------

CREATE TABLE IF NOT EXISTS inventory.shops (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(40) UNIQUE NOT NULL,
    title VARCHAR(120) NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO inventory.shops (id, slug, title, owner_id, description)
VALUES
    (1, 'aurora-store',      'Aurora Store',      '33333333-3333-3333-3333-333333333301'::uuid, 'Смартфоны и планшеты собственной сборки.'),
    (2, 'nimbus-tech',       'Nimbus Tech',       '33333333-3333-3333-3333-333333333302'::uuid, 'Ноутбуки для работы и игр.'),
    (3, 'pulse-audio',       'Pulse Audio',       '33333333-3333-3333-3333-333333333303'::uuid, 'Наушники, звук и аксессуары питания.'),
    (4, 'chrono-wear',       'Chrono Wear',       '33333333-3333-3333-3333-333333333304'::uuid, 'Умные часы и трекеры активности.'),
    (5, 'netcore-networks',  'NetCore Networks',  '33333333-3333-3333-3333-333333333305'::uuid, 'Роутеры и домашние сети.'),
    (6, 'viewmax-displays',  'ViewMax Displays',  '33333333-3333-3333-3333-333333333306'::uuid, 'Мониторы, клавиатуры и периферия.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE inventory.products
    ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES inventory.shops(id);

-- ---------- живые фотографии товаров (Wikimedia Commons, свободные лицензии) ----------

UPDATE inventory.products SET shop_id = 1, seller = 'alice',
    image_url = '/products/p1-aurora-x.jpg'
WHERE id = 1;

UPDATE inventory.products SET shop_id = 3, seller = 'carol',
    image_url = '/products/p2-pulse-pro.jpg'
WHERE id = 2;

UPDATE inventory.products SET shop_id = 6, seller = 'frank',
    image_url = '/products/p3-keyforge.jpg'
WHERE id = 3;

UPDATE inventory.products SET shop_id = 1, seller = 'alice',
    image_url = '/products/p7-case.jpg'
WHERE id = 7;

UPDATE inventory.products SET shop_id = 6, seller = 'frank',
    image_url = '/products/p8-viewmax.png'
WHERE id = 8;

UPDATE inventory.products SET shop_id = 1, seller = 'alice',
    image_url = '/products/p9-x200-pro.jpg'
WHERE id = 9;

UPDATE inventory.products SET shop_id = 1, seller = 'alice',
    image_url = '/products/p10-aurora-lite.jpg'
WHERE id = 10;

UPDATE inventory.products SET shop_id = 2, seller = 'bob',
    image_url = '/products/p11-nimbus-14.png'
WHERE id = 11;

UPDATE inventory.products SET shop_id = 2, seller = 'bob',
    image_url = '/products/p12-vector-16.jpg'
WHERE id = 12;

UPDATE inventory.products SET shop_id = 3, seller = 'carol',
    image_url = '/products/p13-pulse-air.jpg'
WHERE id = 13;

UPDATE inventory.products SET shop_id = 3, seller = 'carol',
    image_url = '/products/p14-studio-one.jpg'
WHERE id = 14;

UPDATE inventory.products SET shop_id = 4, seller = 'dave',
    image_url = '/products/p15-chrono-s2.jpg'
WHERE id = 15;

UPDATE inventory.products SET shop_id = 4, seller = 'dave',
    image_url = '/products/p16-fitband.jpg'
WHERE id = 16;

UPDATE inventory.products SET shop_id = 5, seller = 'erin',
    image_url = '/products/p17-netcore.jpg'
WHERE id = 17;

UPDATE inventory.products SET shop_id = 5, seller = 'erin',
    image_url = '/products/p18-meshlink.jpg'
WHERE id = 18;

UPDATE inventory.products SET shop_id = 1, seller = 'alice',
    image_url = '/products/p19-slate-11.jpg'
WHERE id = 19;

UPDATE inventory.products SET shop_id = 3, seller = 'carol',
    image_url = '/products/p20-volt.jpg'
WHERE id = 20;

-- ---------- отзывы покупателей ----------

INSERT INTO inventory.reviews (product_id, rating, body, author_id, author_name)
SELECT seed.product_id, seed.rating, seed.body, seed.author_id, seed.author_name
FROM (VALUES
    (9,  5, 'Камера снимает отлично, экран яркий даже на солнце.', '33333333-3333-3333-3333-333333333302'::uuid, 'bob'),
    (9,  4, 'Быстрый и удобный, но комплектный чехол скользкий.', '33333333-3333-3333-3333-333333333303'::uuid, 'carol'),
    (9,  2, 'За свои деньги ожидал большего, греется в играх.', '33333333-3333-3333-3333-333333333304'::uuid, 'dave'),
    (10, 4, 'Отличный вариант для родителей: простой и живучий.', '33333333-3333-3333-3333-333333333305'::uuid, 'erin'),
    (10, 5, 'Батарея держит два дня при активном использовании.', '33333333-3333-3333-3333-333333333306'::uuid, 'frank'),
    (11, 5, 'Тихий, лёгкий, заряд держит весь рабочий день.', '33333333-3333-3333-3333-333333333301'::uuid, 'alice'),
    (11, 4, 'Клавиатура удобная, но портов маловато.', '33333333-3333-3333-3333-333333333303'::uuid, 'carol'),
    (12, 5, 'Тянет все современные игры на высоких настройках.', '33333333-3333-3333-3333-333333333306'::uuid, 'frank'),
    (12, 3, 'Мощный, но вентиляторы слышно даже в наушниках.', '33333333-3333-3333-3333-333333333302'::uuid, 'bob'),
    (13, 4, 'Шумоподавление хорошее, кейс компактный.', '33333333-3333-3333-3333-333333333304'::uuid, 'dave'),
    (13, 5, 'За такие деньги лучшего не найти.', '33333333-3333-3333-3333-333333333305'::uuid, 'erin'),
    (14, 5, 'Ровный звук, слышно детали в миксе.', '33333333-3333-3333-3333-333333333301'::uuid, 'alice'),
    (15, 4, 'Экран яркий, шагомер точный, зарядка раз в неделю.', '33333333-3333-3333-3333-333333333302'::uuid, 'bob'),
    (15, 3, 'GPS иногда ловит спутники по минуте.', '33333333-3333-3333-3333-333333333306'::uuid, 'frank'),
    (16, 5, 'Идеальные для бега: легкие и не мешают.', '33333333-3333-3333-3333-333333333303'::uuid, 'carol'),
    (17, 4, 'Покрытие по всей квартире, веб-интерфейс устарел.', '33333333-3333-3333-3333-333333333304'::uuid, 'dave'),
    (17, 5, 'Настроил за десять минут, скорость не режет.', '33333333-3333-3333-3333-333333333305'::uuid, 'erin'),
    (18, 5, 'Три модуля закрыли весь дом и дачный участок.', '33333333-3333-3333-3333-333333333301'::uuid, 'alice'),
    (18, 2, 'Один модуль пришёл с царапиной, меняли по гарантии.', '33333333-3333-3333-3333-333333333306'::uuid, 'frank'),
    (19, 4, 'Хорош для заметок и чтения, для монтажа слабоват.', '33333333-3333-3333-3333-333333333302'::uuid, 'bob'),
    (19, 5, 'Стилус точный, экран не бликует.', '33333333-3333-3333-3333-333333333304'::uuid, 'dave'),
    (20, 5, 'Заряжает ноутбук и телефон одновременно.', '33333333-3333-3333-3333-333333333303'::uuid, 'carol'),
    (20, 3, 'Ёмкости хватает, но греется при быстрой зарядке.', '33333333-3333-3333-3333-333333333305'::uuid, 'erin'),
    (1,  4, 'Смартфон как смартфон, но за эти деньги хорош.', '33333333-3333-3333-3333-333333333306'::uuid, 'frank')
) AS seed(product_id, rating, body, author_id, author_name)
WHERE (SELECT COUNT(*) FROM inventory.reviews) < 10;

-- ---------- голоса за отзывы ----------

INSERT INTO inventory.review_votes (review_id, voter_id, vote)
SELECT r.id,
       (ARRAY['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'guest-1', 'guest-2'])[1 + ((r.id + g) % 8)],
       CASE WHEN (r.id + g) % 5 = 0 THEN 'dislike' ELSE 'like' END
FROM inventory.reviews r
CROSS JOIN generate_series(1, 3) AS g
WHERE r.product_id BETWEEN 9 AND 20
  AND NOT EXISTS (SELECT 1 FROM inventory.review_votes v WHERE v.review_id = r.id);


-- ---------- фотографии, подобранные вручную ----------
-- Часть карточек переведена на фото из Unsplash (лицензия Unsplash).
-- Остальные товары используют снимки с Wikimedia Commons.

UPDATE inventory.products SET image_url = '/products/u1-aurora-x.jpg'     WHERE id = 1;
UPDATE inventory.products SET image_url = '/products/u2-pulse-pro.jpg'    WHERE id = 2;
UPDATE inventory.products SET image_url = '/products/u7-case.jpg'         WHERE id = 7;
UPDATE inventory.products SET image_url = '/products/u8-viewmax.jpg'      WHERE id = 8;
UPDATE inventory.products SET image_url = '/products/u9-x200-pro.jpg'     WHERE id = 9;
UPDATE inventory.products SET image_url = '/products/u10-aurora-lite.jpg' WHERE id = 10;
UPDATE inventory.products SET image_url = '/products/u11-nimbus-14.jpg'   WHERE id = 11;
UPDATE inventory.products SET image_url = '/products/u12-vector-16.jpg'   WHERE id = 12;
UPDATE inventory.products SET image_url = '/products/u13-pulse-air.jpg'   WHERE id = 13;
UPDATE inventory.products SET image_url = '/products/u14-studio-one.jpg'  WHERE id = 14;
UPDATE inventory.products SET image_url = '/products/u15-chrono-s2.jpg'   WHERE id = 15;
UPDATE inventory.products SET image_url = '/products/u17-netcore.jpg'     WHERE id = 17;
UPDATE inventory.products SET image_url = '/products/u18-meshlink.jpg'    WHERE id = 18;
UPDATE inventory.products SET image_url = '/products/u19-slate-11.jpg'    WHERE id = 19;


-- Уточнение характеристик роутеров: два антенны, а не три.
UPDATE inventory.products
SET specs = specs || '{"Антенны": "2"}'::jsonb
WHERE id IN (17, 18);

