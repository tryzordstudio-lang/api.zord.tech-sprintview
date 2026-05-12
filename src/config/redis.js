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

module.exports = { getRedisConnection };
