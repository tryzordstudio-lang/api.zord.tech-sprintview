const express = require("express");
const {
  addPublicReportComment,
  getPdf,
  getPublicReport,
  getReportById,
  getWord,
  listReports,
  listPublicReportComments,
  updateReportPreferences,
  updateReportSharing
} = require("./report.controller");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { requireWorkspaceRole } = require("../../middleware/require-workspace-role");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const {
  listReportsQuerySchema,
  publicReportCommentSchema,
  updateReportPreferencesSchema,
  updateReportSharingSchema
} = require("../../validators/report.validator");

const router = express.Router();

router.get("/public/:slug", asyncHandler(getPublicReport));
router.get("/public/:slug/comments", asyncHandler(listPublicReportComments));
router.post("/public/:slug/comments", validate(publicReportCommentSchema), asyncHandler(addPublicReportComment));
router.get("/", verifyJWT, validate(listReportsQuerySchema, "query"), asyncHandler(listReports));
router.get("/internal/:id", verifyJWT, asyncHandler(getReportById));
router.patch(
  "/internal/:id/preferences",
  verifyJWT,
  requireWorkspaceRole(["owner", "admin", "editor"]),
  validate(updateReportPreferencesSchema),
  asyncHandler(updateReportPreferences)
);
router.patch(
  "/internal/:id/sharing",
  verifyJWT,
  requireWorkspaceRole(["owner", "admin", "editor"]),
  validate(updateReportSharingSchema),
  asyncHandler(updateReportSharing)
);
router.get("/:id/pdf", verifyJWT, asyncHandler(getPdf));
router.get("/:id/word", verifyJWT, asyncHandler(getWord));

module.exports = { reportRouter: router };
