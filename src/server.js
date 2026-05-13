const { createApp } = require("./app");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { startupState } = require("./config/runtime-state");
const { queueService } = require("./services/queue.service");
const { registerWorkers } = require("./workers/register-workers");

const STARTUP_RETRY_MS = 5000;
let shuttingDown = false;

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception");
});

process.on("unhandledRejection", (error) => {
  logger.error({ err: error }, "Unhandled promise rejection");
});

async function initializeServices() {
  try {
    if (!startupState.getState().databaseReady) {
      startupState.markDependencyPending("database");
      await connectDatabase();
      startupState.markDatabaseReady();
    }

    registerWorkers();

    if (!startupState.getState().queueReady) {
      startupState.markDependencyPending("queue");
      await queueService.start();
      startupState.markQueueReady();
    }

    startupState.clearRetrySchedule();
    logger.info("Startup dependencies initialized");
  } catch (error) {
    startupState.markStartupError(error, startupState.getState().currentDependency);
    startupState.markRetryScheduled(STARTUP_RETRY_MS);
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

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info({ signal }, "Shutting down backend");

  const forceExitTimer = setTimeout(() => {
    logger.error({ signal }, "Forced shutdown after timeout");
    process.exit(1);
  }, 10000);

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await queueService.stop();
    await disconnectDatabase();
    clearTimeout(forceExitTimer);
    logger.info({ signal }, "Backend shutdown complete");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    logger.error({ err: error, signal }, "Backend shutdown failed");
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    logger.error({ err: error }, "SIGTERM shutdown handler failed");
    process.exit(1);
  });
});

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    logger.error({ err: error }, "SIGINT shutdown handler failed");
    process.exit(1);
  });
});
