const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { getDb } = require("../mongo");
const { flagFor } = require("../flags");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await getDb()
      .collection("partner_users")
      .findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    let flag = null;
    if (password && typeof password === "object") {
      if (Object.prototype.hasOwnProperty.call(password, "$ne")) {
        flag = await flagFor("nosql-auth-bypass", "MV{NOSQL_NE_BYPASS}");
      } else if (Object.prototype.hasOwnProperty.call(password, "$regex")) {
        flag = await flagFor("nosql-blind", "MV{BLIND_NOSQLI_REGEX}");
      }
    }
    const token = jwt.sign(
      {
        sub: String(user._id),
        username: user.username,
        role: user.role,
        partner: true,
      },
      config.jwtSecret,
      { algorithm: "HS256", expiresIn: "8h" }
    );
    return res.json({
      token,
      user: { username: user.username, role: user.role },
      flag,
    });
  } catch (error) {
    return res.status(503).json({ error: "partner backend unavailable" });
  }
});

module.exports = router;