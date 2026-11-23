const express = require("express");
const { currentUser } = require("../current-user");
const { one, query } = require("../db");
const { answer } = require("../support/engine");

const router = express.Router();

async function buildContext(user) {
  const context = { user: user, balance: 0, orders: [], products: [], promos: [] };
  if (!user) return context;

  const [wallet, orders, products, promos] = await Promise.all([
    one("SELECT balance FROM inventory.wallets WHERE user_id = $1::uuid", [user.id]).catch(function () {
      return null;
    }),
    query(
      "SELECT id, total, status, created_at FROM inventory.orders WHERE user_id = $1::uuid ORDER BY id DESC LIMIT 3",
      [user.id]
    ).catch(function () {
      return { rows: [] };
    }),
    query("SELECT id, title, price, stock FROM inventory.products WHERE is_listed = TRUE ORDER BY id").catch(
      function () {
        return { rows: [] };
      }
    ),
    query(
      "SELECT code, amount, description FROM inventory.promo_codes" +
        " WHERE is_active = TRUE AND code <> 'DEBUG-ACCESS' ORDER BY amount"
    ).catch(function () {
      return { rows: [] };
    }),
  ]);

  context.balance = wallet ? wallet.balance : 0;
  context.orders = orders.rows;
  context.products = products.rows;
  context.promos = promos.rows;
  return context;
}

function historyOf(req) {
  if (!req.session.support) req.session.support = [];
  return req.session.support;
}

router.post("/support/message", async (req, res) => {
  const text = String(req.body.text || "").trim().slice(0, 600);
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const user = currentUser(req);
    const context = await buildContext(user);
    const history = historyOf(req);
    const result = await answer(text, context, history);

    history.push({ role: "user", text: text, at: new Date().toISOString() });
    history.push({
      role: "operator",
      text: result.reply,
      topic: result.topic,
      at: new Date().toISOString(),
    });
    req.session.support = history.slice(-40);

    return res.json({
      reply: result.reply,
      topic: result.topic,
      intent: result.intent,
      source: result.source,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/support/history", (req, res) => {
  return res.json({
    messages: historyOf(req),
    model: Boolean(process.env.SUPPORT_LLM_URL),
  });
});

router.post("/support/reset", (req, res) => {
  req.session.support = [];
  return res.json({ ok: true });
});

module.exports = router;
