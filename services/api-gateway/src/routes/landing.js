const express = require("express");
const { client } = require("../redis");
const { flagFor } = require("../flags");

const router = express.Router();

function renderLanding(host) {
  return `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><title>MarketVault Academy</title></head>
<body>
  <h1>MarketVault Academy</h1>
  <p>Партнёрская витрина и обучение безопасности.</p>
  <a href="http://${host}/checkout">Перейти к оформлению</a>
</body>
</html>`;
}

router.get("/", async (req, res) => {
  try {
    const key = "gw:cache:/api/landing";
    const forwarded = req.headers["x-forwarded-host"];
    if (forwarded) {
      await client.set(key, JSON.stringify({ host: forwarded }), { EX: 300 });
      return res.type("html").send(renderLanding(forwarded));
    }
    const currentHost = req.headers.host || "localhost:4000";
    const cached = await client.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      let html = renderLanding(parsed.host);
      if (parsed.host && parsed.host !== currentHost) {
        const flag = await flagFor(
          "cache-poisoning",
          "MV{CACHE_POISONING_HEADER}"
        );
        html += `\n<!-- ${flag} -->`;
      }
      return res.type("html").send(html);
    }
    await client.set(key, JSON.stringify({ host: currentHost }), { EX: 300 });
    return res.type("html").send(renderLanding(currentHost));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;