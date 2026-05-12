const { logger } = require("../config/logger");
const { errorResponse } = require("../utils/api-response");

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || "Something went wrong";

  if (statusCode >= 500) {
    logger.error({ err: error }, "Unhandled server error");
  }

  res.status(statusCode).json(errorResponse(code, message, error.details));
}

module.exports = { errorHandler };
