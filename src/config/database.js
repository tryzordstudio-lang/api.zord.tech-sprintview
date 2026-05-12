const mongoose = require("mongoose");
const { env } = require("./env");
const { logger } = require("./logger");

function buildMongoUri() {
  if (env.mongodbUri) {
    return env.mongodbUri;
  }

  if (!env.mongodbHost) {
    return "";
  }

  const scheme = env.mongodbScheme === "mongodb+srv" ? "mongodb+srv" : "mongodb";
  const databaseName = env.mongodbDatabase || "sprintview";
  const credentials =
    env.mongodbUsername && env.mongodbPassword
      ? `${encodeURIComponent(env.mongodbUsername)}:${encodeURIComponent(env.mongodbPassword)}@`
      : "";
  const hostPort = scheme === "mongodb+srv" ? env.mongodbHost : `${env.mongodbHost}:${env.mongodbPort}`;
  const query = new URLSearchParams();

  if (env.mongodbAuthSource) {
    query.set("authSource", env.mongodbAuthSource);
  }

  const queryString = query.toString();
  return `${scheme}://${credentials}${hostPort}/${databaseName}${queryString ? `?${queryString}` : ""}`;
}

async function connectDatabase() {
  const mongodbUri = buildMongoUri();

  if (!mongodbUri) {
    throw new Error("MONGODB_URI or MONGODB_HOST is required");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongodbUri);
  logger.info("MongoDB connected");
}

module.exports = { connectDatabase };
