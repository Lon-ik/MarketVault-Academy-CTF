const { query } = require("./db");

// Возврат витрины в исходное состояние: остатки товаров берутся из
// inventory.stock_baseline. Иначе один покупатель может скупить всё
// и заблокировать задания остальным.
const MINUTES = Number(process.env.STOCK_RESET_MINUTES || 15);
const INTERVAL_MS = Math.max(5000, Math.round(MINUTES * 60) * 1000);

async function restoreStock() {
  const result = await query(
    `UPDATE inventory.products p
        SET stock = b.stock
       FROM inventory.stock_baseline b
      WHERE p.id = b.product_id
        AND p.stock IS DISTINCT FROM b.stock`
  );
  return result.rowCount;
}

function startStockReset() {
  const timer = setInterval(function () {
    restoreStock()
      .then(function (rows) {
        if (rows > 0) {
          console.log("stock reset: restored " + rows + " product(s)");
        }
      })
      .catch(function (error) {
        console.error("stock reset failed:", error.message);
      });
  }, INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  console.log("stock reset: every " + MINUTES + " min");
  return timer;
}

module.exports = { restoreStock, startStockReset, INTERVAL_MS };
