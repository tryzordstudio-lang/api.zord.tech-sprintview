const express = require("express");
const {
  checkEmailAvailability,
  signup,
  login,
  refresh,
  logout,
  changePassword,
  deleteAccount,
  me,
  googleConnect,
  googleCallback,
  atlassianConnect,
  atlassianCallback
} = require("./auth.controller");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const {
  emailAvailabilityQuerySchema,
  loginSchema,
  signupSchema,
  changePasswordSchema,
  deleteAccountSchema
} = require("../../validators/auth.validator");

const router = express.Router();

router.get("/check-email", validate(emailAvailabilityQuerySchema, "query"), asyncHandler(checkEmailAvailability));
router.post("/signup", validate(signupSchema), asyncHandler(signup));
router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", verifyJWT, asyncHandler(logout));
router.patch("/password", verifyJWT, validate(changePasswordSchema), asyncHandler(changePassword));
router.delete("/account", verifyJWT, validate(deleteAccountSchema), asyncHandler(deleteAccount));
router.get("/me", verifyJWT, asyncHandler(me));
router.get("/oauth/google/connect", asyncHandler(googleConnect));
router.get("/oauth/google/callback", asyncHandler(googleCallback));
router.get("/oauth/atlassian/connect", asyncHandler(atlassianConnect));
router.get("/oauth/atlassian/callback", asyncHandler(atlassianCallback));

module.exports = { authRouter: router };
