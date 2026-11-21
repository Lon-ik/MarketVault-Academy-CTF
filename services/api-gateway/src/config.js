module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "weak-jwt-secret",
  sessionSecret: process.env.SESSION_SECRET || "weak-session-secret",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://marketvault:marketvault@postgres:5432/marketvault",
  mongoUrl:
    process.env.MONGO_URL ||
    "mongodb://root:marketvault@mongo:27017/marketvault?authSource=admin",
  redisUrl: process.env.REDIS_URL || "redis://:marketvault@redis:6379/3",
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://auth-service:8000",
  inventoryServiceUrl:
    process.env.INVENTORY_SERVICE_URL || "http://inventory-service:8080",
  legacyServiceUrl:
    process.env.LEGACY_SERVICE_URL || "http://legacy-service",
  statsServiceUrl:
    process.env.STATS_SERVICE_URL || "http://stats-service:8000",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
};