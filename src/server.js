const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { env } = require("./config/env");
const { logger } = require("./config/logger");
const { queueService } = require("./services/queue.service");
const { registerWorkers } = require("./workers/register-workers");

async function bootstrap() {
  await connectDatabase();
  registerWorkers();
  await queueService.start();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Zord SprintView backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
