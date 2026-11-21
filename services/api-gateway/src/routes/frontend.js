const express = require("express");
const config = require("../config");
const { query } = require("../db");
const { flagFor } = require("../flags");

const router = express.Router();

function requireSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function crossSite(req) {
  const origin = req.headers.origin || "";
  const site = req.headers["sec-fetch-site"] || "";
  if (site === "cross-site") {
    return true;
  }
  if (origin && !config.corsOrigins.includes(origin)) {
    return true;
  }
  return false;
}

router.get("/frontend/bootstrap", requireSession, async (req, res) => {
  const page = String(req.query.page || "");
  if (page === "search") {
    const flag = await flagFor("dom-xss", "MV{DOM_XSS_DANGEROUS_HTML}");
    res.cookie("dom_xss_flag", flag, {
      path: "/search",
      httpOnly: false,
      sameSite: "lax",
      encode: (value) => value,
    });
  } else if (page === "support") {
    const flag = await flagFor("postmessage-xss", "MV{POSTMESSAGE_XSS_ORIGIN}");
    res.cookie("pm_xss_flag", flag, {
      path: "/support",
      httpOnly: false,
      sameSite: "lax",
      encode: (value) => value,
    });
  }
  return res.json({ ok: true, page });
});

router.post("/profile/email", requireSession, async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim();
  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }
  await query("UPDATE auth.users SET email = $1 WHERE id = $2", [
    email,
    req.session.user.id,
  ]);
  const flag = crossSite(req)
    ? await flagFor("csrf-profile-change", "MV{CSRF_NO_TOKEN}")
    : null;
  return res.json({ ok: true, email, flag });
});

router.post("/checkout/confirm", requireSession, async (req, res) => {
  const framed =
    req.headers["sec-fetch-dest"] === "iframe" ||
    Boolean(req.body && req.body.framed === true);
  const flag = framed
    ? await flagFor("clickjacking-checkout", "MV{CLICKJACKING_FRAME}")
    : null;
  return res.json({ confirmed: true, flag });
});

module.exports = router;