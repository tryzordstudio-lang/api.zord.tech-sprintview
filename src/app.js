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

function buildAllowedOrigins() {
  return Array.from(
    new Set(
      [
        env.frontendUrl,
        ...env.frontendUrls,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
      ].filter(Boolean)
    )
  );
}

function createApp() {
  const app = express();
  const basePath = getAppBasePath();
  const rootPrefixes = Array.from(new Set(["", "/sprintview", basePath].filter(Boolean)));
  const apiMountPaths = Array.from(
    new Set(["/api/v1", "/sprintview/api/v1", `${basePath}/api/v1`].map((value) => value.replace(/\/{2,}/g, "/")))
  );
  const docsMountPaths = Array.from(
    new Set(["/docs", "/sprintview/docs", `${basePath}/docs`].map((value) => value.replace(/\/{2,}/g, "/")))
  );
  const generatedMountPaths = Array.from(
    new Set(
      ["/generated", "/sprintview/generated", `${basePath}/generated`].map((value) =>
        value.replace(/\/{2,}/g, "/")
      )
    )
  );
  const allowedOrigins = buildAllowedOrigins();
  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  };

  app.set("trust proxy", env.trustProxy);
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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

  ["/", ...rootPrefixes].forEach((prefix) => {
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

  generatedMountPaths.forEach((mountPath) => {
    app.use(mountPath, generatedMiddleware);
  });

  docsMountPaths.forEach((mountPath) => {
    app.use(mountPath, ...docsMiddleware);
  });

  apiMountPaths.forEach((mountPath) => {
    app.use(mountPath, apiRouter);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
