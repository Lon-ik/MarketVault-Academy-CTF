const { Pool, types } = require("pg");

types.setTypeParser(20, (value) => parseInt(value, 10));
const config = require("./config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (error) => {
  console.error("postgres pool error:", error.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function one(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

module.exports = { pool, query, one };