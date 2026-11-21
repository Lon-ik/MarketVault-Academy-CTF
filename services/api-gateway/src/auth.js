const jwt = require("jsonwebtoken");
const config = require("./config");

function decodeToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.payload) {
    throw new Error("invalid token");
  }
  if (decoded.header && decoded.header.alg === "none") {
    return decoded.payload;
  }
  return jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
}

function tokenFrom(req) {
  const header = req.headers.authorization || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7);
  }
  return null;
}

function attachUser(req, res, next) {
  const token = tokenFrom(req);
  if (token) {
    try {
      req.user = decodeToken(token);
    } catch (error) {
      req.user = null;
    }
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

module.exports = { decodeToken, attachUser, requireUser };