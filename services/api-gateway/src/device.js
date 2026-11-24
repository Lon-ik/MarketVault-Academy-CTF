const crypto = require("crypto");

// Идентификатор устройства (браузера). Живёт в отдельной cookie год и не зависит
// от аккаунта: прогресс по заданиям привязан к устройству, а не к логину.
const COOKIE = "mv_device";
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deviceId(req, res) {
  if (req.deviceId) {
    return req.deviceId;
  }

  let id = req.cookies ? req.cookies[COOKIE] : null;
  if (!UUID_RE.test(String(id || ""))) {
    id = crypto.randomUUID();
  }

  if (res && typeof res.cookie === "function") {
    res.cookie(COOKIE, id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: MAX_AGE,
    });
  }

  req.deviceId = id;
  return id;
}

module.exports = { deviceId, COOKIE };
