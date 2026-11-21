const express = require("express");
const { one } = require("../db");
const { flagFor } = require("../flags");
const { preferences } = require("./profile");

const router = express.Router();

function requireSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

router.get("/flag", requireSession, async (req, res) => {
  const flag = await flagFor(
    "cors-wildcard-credentials",
    "MV{CORS_WILDCARD_CREDS}"
  );
  return res.json({
    flag,
    secret: "partner-admin-marker",
    user: req.session.user,
  });
});

router.get("/summary", async (req, res) => {
  const users = await one("SELECT COUNT(*) AS c FROM auth.users");
  const orders = await one("SELECT COUNT(*) AS c FROM inventory.orders");
  const polluted = preferences.isAdmin === true || {}.isAdmin === true;
  let flag = null;
  if (polluted) {
    flag = await flagFor("prototype-pollution", "MV{PROTO_POLLUTION_MERGE}");
  }
  return res.json({
    users: users ? Number(users.c) : 0,
    orders: orders ? Number(orders.c) : 0,
    flag,
  });
});

module.exports = router;