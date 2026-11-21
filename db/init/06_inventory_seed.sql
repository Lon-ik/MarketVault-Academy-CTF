CREATE TABLE IF NOT EXISTS inventory.products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    seller VARCHAR(64) NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES inventory.products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.orders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'paid',
    address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES inventory.orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    title VARCHAR(200) NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inventory.wallets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory.files (
    name VARCHAR(200) PRIMARY KEY,
    content TEXT NOT NULL DEFAULT ''
);

INSERT INTO inventory.products (id, title, price, seller, stock)
SELECT * FROM (VALUES
    (1, 'Смартфон Aurora X 256 ГБ', 3999900, 'alice', 5),
    (2, 'Наушники Pulse Pro', 1299900, 'alice', 12),
    (3, 'Клавиатура KeyForge', 899000, 'alice', 8),
    (4, 'Книга «Чистый Python»', 249000, 'carol', 20),
    (5, 'Шаблон лендинга SaaS', 199000, 'carol', 999),
    (6, 'Консультация по архитектуре', 500000, 'alice', 10),
    (7, 'Чехол для смартфона', 149000, 'alice', 40),
    (8, 'Монитор ViewMax 27 4K', 2899900, 'alice', 6)
) AS seed(id, title, price, seller, stock)
WHERE NOT EXISTS (SELECT 1 FROM inventory.products);

INSERT INTO inventory.reviews (product_id, rating, body, author_id)
SELECT 1, 5, 'Работает быстро, экран отличный.', '11111111-1111-1111-1111-111111111111'
WHERE NOT EXISTS (SELECT 1 FROM inventory.reviews);

INSERT INTO inventory.reviews (product_id, rating, body, author_id)
SELECT 2, 4, 'Шумоподавление хорошее, кейс удобный.', '22222222-2222-2222-2222-222222222222'
WHERE (SELECT COUNT(*) FROM inventory.reviews) = 1;

INSERT INTO inventory.orders (id, user_id, total, status, address, notes)
SELECT * FROM (VALUES
    (1, '22222222-2222-2222-2222-222222222222'::uuid, 3999900, 'paid',
     'Москва, склад №3', 'Служебный заказ. MV{GRAPHQL_IDOR_ORDER}'),
    (2, '11111111-1111-1111-1111-111111111111'::uuid, 1299900, 'paid',
     'Санкт-Петербург, ул. Примерная, 7', 'Личный заказ наушников.'),
    (3, '22222222-2222-2222-2222-222222222222'::uuid, 249000, 'paid',
     'Москва, офис 12', 'MV{IDOR_INVENTORY_ORDER}'),
    (4, '11111111-1111-1111-1111-111111111111'::uuid, 149000, 'shipped',
     'Казань, ул. Тестовая, 3', 'Подарок коллеге.')
) AS seed(id, user_id, total, status, address, notes)
WHERE NOT EXISTS (SELECT 1 FROM inventory.orders);

INSERT INTO inventory.order_items (order_id, product_id, title, price, quantity)
SELECT * FROM (VALUES
    (1, 1, 'Смартфон Aurora X 256 ГБ', 3999900, 1),
    (2, 2, 'Наушники Pulse Pro', 1299900, 1),
    (3, 4, 'Книга «Чистый Python»', 249000, 1),
    (4, 7, 'Чехол для смартфона', 149000, 1)
) AS seed(order_id, product_id, title, price, quantity)
WHERE NOT EXISTS (SELECT 1 FROM inventory.order_items);

INSERT INTO inventory.wallets (user_id, balance)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 10000)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO inventory.wallets (user_id, balance)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 500000)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO inventory.files (name, content)
VALUES
    ('readme.txt', 'Inventory service storage.'),
    ('prices.csv', 'sku,title,price\n1,Aurora X,39999\n2,Pulse Pro,12999\n')
ON CONFLICT (name) DO NOTHING;

SELECT setval(pg_get_serial_sequence('inventory.products', 'id'), COALESCE((SELECT MAX(id) FROM inventory.products), 1));
SELECT setval(pg_get_serial_sequence('inventory.orders', 'id'), COALESCE((SELECT MAX(id) FROM inventory.orders), 1));
SELECT setval(pg_get_serial_sequence('inventory.order_items', 'id'), COALESCE((SELECT MAX(id) FROM inventory.order_items), 1));
SELECT setval(pg_get_serial_sequence('inventory.reviews', 'id'), COALESCE((SELECT MAX(id) FROM inventory.reviews), 1));