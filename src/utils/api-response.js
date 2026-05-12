function successResponse(data, message = "Operation successful") {
  return {
    success: true,
    data,
    message
  };
}

function errorResponse(code, message, details) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

module.exports = { successResponse, errorResponse };
