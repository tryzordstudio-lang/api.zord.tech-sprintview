const mongoose = require("mongoose");
const { env } = require("./env");
const { logger } = require("./logger");

async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri);
  logger.info("MongoDB connected");
}

module.exports = { connectDatabase };
