const { User } = require("../models/user.model");
const { ApiError } = require("../utils/api-error");
const { verifyAccessToken } = require("../utils/token");

async function verifyJWT(req, _res, next) {
  const token =
    req.cookies.accessToken ||
    (req.headers.authorization && req.headers.authorization.replace("Bearer ", ""));

  if (!token) {
    return next(new ApiError(401, "UNAUTHORIZED", "Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select("-passwordHash -refreshTokens");

    if (!user) {
      return next(new ApiError(401, "UNAUTHORIZED", "User no longer exists"));
    }

    req.user = {
      id: user._id.toString(),
      workspaceId: user.workspaceId.toString(),
      email: user.email,
      role: user.role || "owner",
      status: user.status || "active"
    };

    return next();
  } catch (error) {
    return next(new ApiError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}

module.exports = { verifyJWT };
