const pino = require("pino");
const { env } = require("./env");

const logger = pino({
  level: env.isProduction ? "info" : "debug"
});

module.exports = { logger };
