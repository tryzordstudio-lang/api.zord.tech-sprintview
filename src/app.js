const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { startupState } = require("./config/runtime-state");
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

function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "";
  }

  return `/${String(value).replace(/^\/+|\/+$/g, "")}`;
}

function getAppBasePath() {
  try {
    return normalizeBasePath(new URL(env.appUrl).pathname);
  } catch (_error) {
    return "";
  }
}

function createApp() {
  const app = express();
  const basePath = getAppBasePath();
  const routePrefixes = Array.from(new Set(["", "/sprintview", basePath].filter(Boolean)));

  app.set("trust proxy", env.trustProxy);
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

  ["/", ...routePrefixes].forEach((prefix) => {
    const docsPath = `${prefix}/docs`.replace(/\/{2,}/g, "/");
    const apiPath = `${prefix}/api/v1`.replace(/\/{2,}/g, "/");

    app.get(prefix || "/", (_req, res) => {
      res.json({
        name: "Zord SprintView Backend",
        version: "1.0.0",
        status: startupState.getState().status,
        docs: docsPath,
        api: apiPath
      });
    });
  });

  const generatedMiddleware = express.static(path.join(process.cwd(), "generated"));
  const docsMiddleware = [swaggerUi.serve, swaggerUi.setup(buildOpenApiSpec())];

  ["/", ...routePrefixes].forEach((prefix) => {
    const generatedPath = `${prefix}/generated`.replace(/\/{2,}/g, "/");
    const docsPath = `${prefix}/docs`.replace(/\/{2,}/g, "/");
    const apiPath = `${prefix}/api/v1`.replace(/\/{2,}/g, "/");

    app.use(generatedPath, generatedMiddleware);
    app.use(docsPath, ...docsMiddleware);
    app.use(apiPath, apiRouter);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
