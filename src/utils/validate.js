const { ApiError } = require("./api-error");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new ApiError(400, "VALIDATION_ERROR", "Request validation failed", result.error.flatten())
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
