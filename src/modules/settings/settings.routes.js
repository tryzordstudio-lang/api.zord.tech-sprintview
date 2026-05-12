const express = require("express");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const { updateSettingsSchema } = require("../../validators/settings.validator");
const { getSettings, updateSettings } = require("./settings.controller");

const router = express.Router();

router.get("/", verifyJWT, asyncHandler(getSettings));
router.patch("/", verifyJWT, validate(updateSettingsSchema), asyncHandler(updateSettings));

module.exports = { settingsRouter: router };
