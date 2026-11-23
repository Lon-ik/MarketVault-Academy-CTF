const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

const config = require("./config");
const { client, connect: connectRedis } = require("./redis");
const { connect: connectMongo } = require("./mongo");
const { attachUser, decodeToken } = require("./auth");
const { proxy } = require("./routes/proxy");
const graphqlRouter = require("./routes/graphql");
const academyRouter = require("./routes/academy");
const partnerRouter = require("./routes/partner");
const imagesRouter = require("./routes/images");
const landingRouter = require("./routes/landing");
const { router: profileRouter } = require("./routes/profile");
const adminRouter = require("./routes/admin");
const frontendRouter = require("./routes/frontend");
const shopRouter = require("./routes/shop");
const supportRouter = require("./routes/support");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await connectRedis();

  let mongoReady = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await connectMongo();
      mongoReady = true;
      break;
    } catch (error) {
      console.error("mongo retry:", error.message);
      await sleep(2000);
    }
  }
  if (!mongoReady) {
    throw new Error("mongo is unavailable");
  }

  const app = express();
  app.set("trust proxy", true);

  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan("tiny"));

  app.use("/api/auth", proxy(config.authServiceUrl, "auth-service", "/api/auth"));
  app.use(
    "/api/inventory",
    proxy(config.inventoryServiceUrl, "inventory-service", "/api/inventory")
  );
  app.use("/legacy", proxy(config.legacyServiceUrl, "legacy-service"));

  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());
  app.use(
    session({
      store: new RedisStore({ client, prefix: "gw:sess:" }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
  app.use(attachUser);

  app.use("/graphql", graphqlRouter);
  app.use("/api/academy", academyRouter);
  app.use("/api/partner", partnerRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/landing", landingRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", frontendRouter);
  app.use("/api", shopRouter);
  app.use("/api", supportRouter);

  app.post("/api/session/login", async (req, res) => {
    try {
      const response = await fetch(`${config.authServiceUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {}),
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      const payload = decodeToken(data.access_token);
      req.session.user = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
      return res.json(data);
    } catch (error) {
      return res.status(502).json({ error: "auth service unavailable" });
    }
  });

  app.get("/api/health", (req, res) => {
    return res.json({
      status: "ok",
      service: "api-gateway",
      uptime: Math.floor(process.uptime()),
    });
  });

  app.use((req, res) => {
    return res.status(404).json({ error: "not found" });
  });

  app.listen(config.port, "0.0.0.0", () => {
    console.log(`api-gateway listening on ${config.port}`);
  });
}

main().catch((error) => {
  console.error("gateway failed to start:", error);
  process.exit(1);
});