const IORedis = require("ioredis");
const { env } = require("./env");

let redisConnection = null;

function getRedisConnection() {
  if (!env.redisUrl) {
    return null;
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null
    });
  }

  return redisConnection;
}

async function disconnectRedisConnection() {
  if (!redisConnection) {
    return;
  }

  try {
    await redisConnection.quit();
  } catch (_error) {
    redisConnection.disconnect();
  } finally {
    redisConnection = null;
  }
}

module.exports = { getRedisConnection, disconnectRedisConnection };
