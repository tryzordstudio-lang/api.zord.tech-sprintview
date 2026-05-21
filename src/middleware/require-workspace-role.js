const { ApiError } = require("../utils/api-error");

function requireWorkspaceRole(roles = []) {
  const allowed = new Set(roles);

  return (req, _res, next) => {
    const role = req.user?.role;

    if (!role || !allowed.has(role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
    }

    return next();
  };
}

module.exports = { requireWorkspaceRole };
