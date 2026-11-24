-- Базовые (изначальные) остатки товаров.
-- Шлюз раз в 15 минут возвращает их обратно: витрину нельзя скупить целиком
-- и заблокировать задания другим.
-- Идемпотентно: можно применять и к уже поднятой базе.

CREATE TABLE IF NOT EXISTS inventory.stock_baseline (
    product_id INTEGER PRIMARY KEY REFERENCES inventory.products(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL
);

INSERT INTO inventory.stock_baseline (product_id, stock)
SELECT * FROM (VALUES
    (1, 5),
    (2, 12),
    (3, 8),
    (4, 20),
    (5, 999),
    (6, 10),
    (7, 40),
    (8, 6),
    (9, 1),
    (10, 14),
    (11, 6),
    (12, 4),
    (13, 25),
    (14, 9),
    (15, 11),
    (16, 30),
    (17, 18),
    (18, 7),
    (19, 12),
    (20, 40)
) AS seed(product_id, stock)
ON CONFLICT (product_id) DO UPDATE SET stock = EXCLUDED.stock;

-- Товары, которых нет в списке выше, один раз запоминаются такими, какие есть.
INSERT INTO inventory.stock_baseline (product_id, stock)
SELECT id, stock FROM inventory.products
ON CONFLICT (product_id) DO NOTHING;
