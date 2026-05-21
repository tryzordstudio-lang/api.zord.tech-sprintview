const express = require("express");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { requireWorkspaceRole } = require("../../middleware/require-workspace-role");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const { listTemplates, createTemplate, updateTemplate, deleteTemplate } = require("./template.controller");
const { listTemplatesQuerySchema, saveTemplateSchema } = require("../../validators/template.validator");

const router = express.Router();

router.get("/", verifyJWT, validate(listTemplatesQuerySchema, "query"), asyncHandler(listTemplates));
router.post(
  "/",
  verifyJWT,
  requireWorkspaceRole(["owner", "admin", "editor"]),
  validate(saveTemplateSchema),
  asyncHandler(createTemplate)
);
router.patch(
  "/:id",
  verifyJWT,
  requireWorkspaceRole(["owner", "admin", "editor"]),
  validate(saveTemplateSchema),
  asyncHandler(updateTemplate)
);
router.delete("/:id", verifyJWT, requireWorkspaceRole(["owner", "admin", "editor"]), asyncHandler(deleteTemplate));

module.exports = { templateRouter: router };
