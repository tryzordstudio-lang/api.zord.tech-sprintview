const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { startupState } = require("./config/runtime-state");
const { queueService } = require("./services/queue.service");
const { registerWorkers } = require("./workers/register-workers");

const STARTUP_RETRY_MS = 5000;

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception");
});

process.on("unhandledRejection", (error) => {
  logger.error({ err: error }, "Unhandled promise rejection");
});

async function initializeServices() {
  try {
    if (!startupState.getState().databaseReady) {
      await connectDatabase();
      startupState.markDatabaseReady();
    }

    registerWorkers();

    if (!startupState.getState().queueReady) {
      await queueService.start();
      startupState.markQueueReady();
    }

    logger.info("Startup dependencies initialized");
  } catch (error) {
    startupState.markStartupError(error);
    logger.error({ err: error }, "Startup dependency initialization failed");

    const retryTimer = setTimeout(() => {
      initializeServices().catch((retryError) => {
        logger.error({ err: retryError }, "Unexpected startup retry failure");
      });
    }, STARTUP_RETRY_MS);

    if (typeof retryTimer.unref === "function") {
      retryTimer.unref();
    }
  }
}

const app = createApp();
const server = app.listen(env.port, "0.0.0.0", () => {
  logger.info(`Zord SprintView backend listening on port ${env.port}`);
  initializeServices().catch((error) => {
    logger.error({ err: error }, "Failed to initialize startup dependencies");
  });
});

server.on("error", (error) => {
  logger.error({ err: error }, "Failed to bind server port");
  process.exit(1);
});
