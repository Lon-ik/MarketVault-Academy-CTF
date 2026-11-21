const { one } = require("./db");

const cache = new Map();

async function flagFor(slug, fallback) {
  if (cache.has(slug)) {
    return cache.get(slug);
  }
  try {
    const row = await one(
      "SELECT flag FROM academy.challenges WHERE slug = $1",
      [slug]
    );
    const value = row ? row.flag : fallback;
    cache.set(slug, value);
    return value;
  } catch (error) {
    return fallback;
  }
}

module.exports = { flagFor };