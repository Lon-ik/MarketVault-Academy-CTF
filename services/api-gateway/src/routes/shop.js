const express = require("express");
const { currentUser } = require("../current-user");
const { one, query } = require("../db");

const router = express.Router();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serializeProduct(row) {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    seller: row.seller,
    stock: row.stock,
    category: row.category,
    description: row.description,
    image_url: row.image_url,
    specs: row.specs || {},
    shop: row.shop_title ? { id: row.shop_id, title: row.shop_title, slug: row.shop_slug } : null,
  };
}

const PRODUCT_COLUMNS =
  "p.id, p.title, p.price, p.seller, p.stock, p.category, p.description, p.image_url, p.specs, " +
  "p.shop_id, s.title AS shop_title, s.slug AS shop_slug";

const PRODUCT_FROM =
  "FROM inventory.products p LEFT JOIN inventory.shops s ON s.id = p.shop_id";

router.get("/shops", async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.slug, s.title, s.description, u.username AS owner,
              COUNT(p.id) FILTER (WHERE p.is_listed) AS products
       FROM inventory.shops s
       LEFT JOIN auth.users u ON u.id = s.owner_id
       LEFT JOIN inventory.products p ON p.shop_id = s.id
       GROUP BY s.id, s.slug, s.title, s.description, u.username
       ORDER BY s.title`
    );
    return res.json({
      shops: result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        owner: row.owner,
        products: Number(row.products),
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const result = await query(
      `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM}
       WHERE p.is_listed = TRUE
       ORDER BY p.category, p.price DESC`
    );
    const categories = Array.from(new Set(result.rows.map((row) => row.category)));
    return res.json({ products: result.rows.map(serializeProduct), categories });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const row = await one(
      `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM}
       WHERE p.id = $1 AND p.is_listed = TRUE`,
      [req.params.id]
    );
    if (!row) {
      return res.status(404).json({ error: "product not found" });
    }
    return res.json(serializeProduct(row));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

async function reviewsFor(productId, viewerId) {
  const result = await query(
    `SELECT r.id, r.rating, r.body, r.created_at,
            COALESCE(u.username, r.author_name, 'guest') AS author,
            COUNT(v.id) FILTER (WHERE v.vote = 'like') AS likes,
            COUNT(v.id) FILTER (WHERE v.vote = 'dislike') AS dislikes,
            COALESCE(BOOL_OR(v.voter_id = $2), FALSE) AS voted
     FROM inventory.reviews r
     LEFT JOIN auth.users u ON u.id = r.author_id
     LEFT JOIN inventory.review_votes v ON v.review_id = r.id
     WHERE r.product_id = $1
     GROUP BY r.id, u.username, r.author_name
     ORDER BY r.created_at DESC, r.id DESC`,
    [productId, viewerId || ""]
  );
  return result.rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    author: row.author,
    created_at: row.created_at,
    likes: Number(row.likes),
    dislikes: Number(row.dislikes),
    voted: Boolean(row.voted),
  }));
}

router.get("/products/:id/reviews", async (req, res) => {
  try {
    const user = currentUser(req);
    return res.json({ reviews: await reviewsFor(req.params.id, user ? user.id : null) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/products/:id/reviews", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const rating = Number(req.body.rating);
  const body = String(req.body.body || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be 1..5" });
  }
  if (!body) {
    return res.status(400).json({ error: "body is required" });
  }

  // Автор берётся из тела запроса, если он там есть: отзыв можно подписать чужим именем.
  let authorId = user.id;
  let authorName = user.username;
  const claimed = req.body.author || req.body.authorId;
  if (claimed) {
    authorName = String(claimed).slice(0, 64);
    authorId = UUID_RE.test(String(claimed)) ? String(claimed) : null;
  }

  try {
    const row = await one(
      `INSERT INTO inventory.reviews (product_id, rating, body, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.params.id, rating, body, authorId, authorName]
    );
    return res.status(201).json({ status: "created", id: row.id, author: authorName });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/products/:product_id/reviews/:review_id/vote", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const vote = String(req.body.vote || "").toLowerCase();
  if (vote !== "like" && vote !== "dislike") {
    return res.status(400).json({ error: "vote must be like or dislike" });
  }

  // Личность голосующего по-прежнему берётся из тела, если она там есть.
  const voter = String(req.body.voter || req.body.voterId || user.id).slice(0, 64);

  try {
    const review = await one(
      "SELECT id FROM inventory.reviews WHERE id = $1 AND product_id = $2",
      [req.params.review_id, req.params.product_id]
    );
    if (!review) {
      return res.status(404).json({ error: "review not found" });
    }

    // Один голос на пользователя: проверка есть, но выполняется до записи.
    const existing = await one(
      "SELECT id FROM inventory.review_votes WHERE review_id = $1 AND voter_id = $2 LIMIT 1",
      [review.id, voter]
    );
    if (existing) {
      return res.status(403).json({ error: "already voted", voter, vote: null });
    }

    // Небольшая задержка перед записью: окно для параллельных запросов.
    await sleep(150);

    await query(
      "INSERT INTO inventory.review_votes (review_id, voter_id, vote) VALUES ($1, $2, $3)",
      [review.id, voter, vote]
    );

    const counts = await one(
      `SELECT COUNT(*) FILTER (WHERE vote = 'like') AS likes,
              COUNT(*) FILTER (WHERE vote = 'dislike') AS dislikes
       FROM inventory.review_votes WHERE review_id = $1`,
      [review.id]
    );

    return res.json({
      reviewId: review.id,
      voter,
      vote,
      likes: Number(counts.likes),
      dislikes: Number(counts.dislikes),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/checkout", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const productId = Number(req.body.productId);
  const quantity = Math.max(1, Number(req.body.quantity) || 1);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId is required" });
  }

  try {
    const product = await one(
      "SELECT id, title, price, stock FROM inventory.products WHERE id = $1 AND is_listed = TRUE",
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: "product not found" });
    }

    // Остаток проверяется до задержки и без блокировки строки.
    if (product.stock <= 0) {
      return res.status(409).json({ error: "out of stock", stock: product.stock });
    }

    await sleep(1500);

    await query("UPDATE inventory.products SET stock = stock - $2 WHERE id = $1", [
      productId,
      quantity,
    ]);

    const order = await one(
      `INSERT INTO inventory.orders (user_id, total, status, address, notes)
       VALUES ($1::uuid, $2, 'paid', '', 'web checkout') RETURNING id`,
      [user.id, product.price * quantity]
    );

    const after = await one("SELECT stock FROM inventory.products WHERE id = $1", [productId]);
    return res.json({
      status: "paid",
      orderId: order.id,
      product: product.title,
      quantity,
      stock: after.stock,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------- корзина ----------

async function cartFor(userId) {
  const result = await query(
    `SELECT c.product_id, c.quantity, p.title, p.price, p.stock, p.image_url, p.category
     FROM inventory.cart_items c
     JOIN inventory.products p ON p.id = c.product_id
     WHERE c.user_id = $1
     ORDER BY c.added_at, c.product_id`,
    [userId]
  );
  const items = result.rows.map((row) => ({
    productId: row.product_id,
    quantity: row.quantity,
    title: row.title,
    price: row.price,
    stock: row.stock,
    image_url: row.image_url,
    category: row.category,
    sum: row.price * row.quantity,
  }));
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.sum, 0),
  };
}

router.get("/cart", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    return res.json(await cartFor(user.id));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/cart/items", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const productId = Number(req.body.productId);
  const quantity = Math.min(99, Math.max(1, Number(req.body.quantity) || 1));
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId is required" });
  }
  try {
    const product = await one(
      "SELECT id FROM inventory.products WHERE id = $1 AND is_listed = TRUE",
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: "product not found" });
    }
    await query(
      `INSERT INTO inventory.cart_items (user_id, product_id, quantity)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = LEAST(99, inventory.cart_items.quantity + EXCLUDED.quantity)`,
      [user.id, productId, quantity]
    );
    return res.status(201).json(await cartFor(user.id));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/cart/items/:productId", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity)) {
    return res.status(400).json({ error: "quantity must be an integer" });
  }
  try {
    if (quantity <= 0) {
      await query("DELETE FROM inventory.cart_items WHERE user_id = $1::uuid AND product_id = $2", [
        user.id,
        req.params.productId,
      ]);
    } else {
      await query(
        "UPDATE inventory.cart_items SET quantity = $3 WHERE user_id = $1::uuid AND product_id = $2",
        [user.id, req.params.productId, Math.min(99, quantity)]
      );
    }
    return res.json(await cartFor(user.id));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/cart/items/:productId", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    await query("DELETE FROM inventory.cart_items WHERE user_id = $1::uuid AND product_id = $2", [
      user.id,
      req.params.productId,
    ]);
    return res.json(await cartFor(user.id));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/cart/checkout", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const cart = await cartFor(user.id);
    if (!cart.items.length) {
      return res.status(400).json({ error: "cart is empty" });
    }

    const wallet = await one(
      "SELECT balance FROM inventory.wallets WHERE user_id = $1::uuid",
      [user.id]
    );
    if (!wallet) {
      return res.status(404).json({ error: "wallet not found" });
    }
    if (wallet.balance < cart.total) {
      return res.status(402).json({ error: "insufficient funds", balance: wallet.balance, total: cart.total });
    }

    for (const item of cart.items) {
      const updated = await one(
        "UPDATE inventory.products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING stock",
        [item.productId, item.quantity]
      );
      if (!updated) {
        return res.status(409).json({ error: "out of stock", product: item.title });
      }
    }

    const order = await one(
      `INSERT INTO inventory.orders (user_id, total, status, address, notes)
       VALUES ($1::uuid, $2, 'paid', '', 'cart checkout') RETURNING id`,
      [user.id, cart.total]
    );

    for (const item of cart.items) {
      await query(
        `INSERT INTO inventory.order_items (order_id, product_id, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.productId, item.title, item.price, item.quantity]
      );
    }

    const balance = await one(
      "UPDATE inventory.wallets SET balance = balance - $2 WHERE user_id = $1::uuid RETURNING balance",
      [user.id, cart.total]
    );

    await query("DELETE FROM inventory.cart_items WHERE user_id = $1::uuid", [user.id]);

    return res.json({
      status: "paid",
      orderId: order.id,
      total: cart.total,
      balance: balance.balance,
      items: cart.items.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ---------- кошелёк и промокоды ----------

router.get("/wallet", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const wallet = await one(
      "SELECT balance FROM inventory.wallets WHERE user_id = $1::uuid",
      [user.id]
    );
    const redeemed = await query(
      `SELECT r.code, r.redeemed_at, c.amount
       FROM inventory.promo_redemptions r
       JOIN inventory.promo_codes c ON c.code = r.code
       WHERE r.user_id = $1::uuid
       ORDER BY r.redeemed_at DESC`,
      [user.id]
    );
    return res.json({
      balance: wallet ? wallet.balance : 0,
      redeemed: redeemed.rows.map((row) => ({
        code: row.code,
        amount: row.amount,
        redeemedAt: row.redeemed_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/wallet/promo", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ error: "code is required" });
  }
  try {
    const promo = await one(
      "SELECT code, amount, max_uses, used_count, is_active FROM inventory.promo_codes WHERE code = $1",
      [code]
    );
    if (!promo || !promo.is_active) {
      return res.status(404).json({ error: "promo code not found" });
    }
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return res.status(409).json({ error: "promo code is exhausted" });
    }

    const already = await one(
      "SELECT code FROM inventory.promo_redemptions WHERE user_id = $1::uuid AND code = $2",
      [user.id, code]
    );
    if (already) {
      return res.status(409).json({ error: "promo code already used" });
    }

    await query(
      "INSERT INTO inventory.promo_redemptions (user_id, code) VALUES ($1::uuid, $2)",
      [user.id, code]
    );
    await query("UPDATE inventory.promo_codes SET used_count = used_count + 1 WHERE code = $1", [code]);
    const balance = await one(
      "UPDATE inventory.wallets SET balance = balance + $2 WHERE user_id = $1::uuid RETURNING balance",
      [user.id, promo.amount]
    );

    return res.json({ code, amount: promo.amount, balance: balance.balance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/wallet/topup", async (req, res) => {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ error: "only admin can top up" });
  }
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100000000) {
    return res.status(400).json({ error: "invalid amount" });
  }
  try {
    const balance = await one(
      "UPDATE inventory.wallets SET balance = balance + $2 WHERE user_id = $1::uuid RETURNING balance",
      [user.id, amount]
    );
    return res.json({ balance: balance.balance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
