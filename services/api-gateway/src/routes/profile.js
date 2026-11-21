const express = require("express");
const lodash = require("lodash");

const router = express.Router();
const preferences = {};

router.post("/merge", (req, res) => {
  const profile = {};
  lodash.merge(preferences, req.body || {});
  lodash.merge(profile, req.body || {});
  res.json({ profile, preferences });
});

module.exports = { router, preferences };