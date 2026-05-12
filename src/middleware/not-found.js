const { errorResponse } = require("../utils/api-response");

function notFoundHandler(req, res) {
  res.status(404).json(errorResponse("NOT_FOUND", `Route ${req.originalUrl} not found`));
}

module.exports = { notFoundHandler };
