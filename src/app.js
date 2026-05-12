const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { buildOpenApiSpec } = require("./config/swagger");
const { errorHandler } = require("./middleware/error-handler");
const { notFoundHandler } = require("./middleware/not-found");
const { apiRateLimit } = require("./middleware/rate-limit");
const { apiRouter } = require("./routes");

let pinoHttp = null;
try {
  pinoHttp = require("pino-http");
} catch (_error) {
  pinoHttp = null;
}

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (pinoHttp) {
    app.use(pinoHttp({ logger }));
  } else {
    app.use((req, _res, next) => {
      req.log = logger;
      next();
    });
  }
  app.use(apiRateLimit);

  app.get("/", (_req, res) => {
    res.json({
      name: "Zord SprintView Backend",
      version: "1.0.0",
      docs: "/docs",
      api: "/api/v1"
    });
  });

  app.use("/generated", express.static(path.join(process.cwd(), "generated")));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(buildOpenApiSpec()));
  app.use("/api/v1", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
