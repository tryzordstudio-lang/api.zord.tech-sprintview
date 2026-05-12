const { Queue, Worker } = require("bullmq");
const { env } = require("../config/env");
const { getRedisConnection } = require("../config/redis");
const { logger } = require("../config/logger");

class QueueService {
  constructor() {
    this.handlers = new Map();
    this.queue = null;
    this.worker = null;
  }

  registerHandler(jobName, handler) {
    this.handlers.set(jobName, handler);
  }

  async start() {
    const connection = getRedisConnection();

    if (!connection || env.runInlineJobs) {
      logger.info("Queue service running in inline mode");
      return;
    }

    this.queue = new Queue("sprintview", { connection });
    this.worker = new Worker(
      "sprintview",
      async (job) => {
        const handler = this.handlers.get(job.name);
        if (!handler) {
          throw new Error(`No handler registered for job ${job.name}`);
        }
        return handler(job.data);
      },
      { connection }
    );

    this.worker.on("failed", (job, error) => {
      logger.error({ jobId: job?.id, error }, "Queue job failed");
    });
  }

  async enqueue(jobName, payload) {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      throw new Error(`No handler registered for job ${jobName}`);
    }

    if (!this.queue || env.runInlineJobs) {
      return handler(payload);
    }

    return this.queue.add(jobName, payload, {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: 100
    });
  }
}

const queueService = new QueueService();

module.exports = { queueService };
