const express = require("express");
const { getPdf, getPublicReport, getReportById, getWord, listReports, updateReportStatus } = require("./report.controller");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const {
  listReportsQuerySchema,
  updateReportStatusSchema
} = require("../../validators/report.validator");

const router = express.Router();

router.get("/", verifyJWT, validate(listReportsQuerySchema, "query"), asyncHandler(listReports));
router.get("/internal/:id", verifyJWT, asyncHandler(getReportById));
router.get("/:id/pdf", verifyJWT, asyncHandler(getPdf));
router.get("/:id/word", verifyJWT, asyncHandler(getWord));
router.patch("/:id/status", verifyJWT, validate(updateReportStatusSchema), asyncHandler(updateReportStatus));
router.get("/:token", asyncHandler(getPublicReport));

module.exports = { reportRouter: router };
