const express = require("express");
const { deleteSprint, getSprint, importSprint, listSprints, retryAi, updateSprint } = require("./sprint.controller");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const {
  listSprintsQuerySchema,
  manualImportSprintSchema,
  updateSprintSchema
} = require("../../validators/sprint.validator");

const router = express.Router();

router.use(verifyJWT);
router.get("/", validate(listSprintsQuerySchema, "query"), asyncHandler(listSprints));
router.post("/import", validate(manualImportSprintSchema), asyncHandler(importSprint));
router.get("/:id", asyncHandler(getSprint));
router.patch("/:id", validate(updateSprintSchema), asyncHandler(updateSprint));
router.delete("/:id/delete", asyncHandler(deleteSprint));
router.post("/:id/retry-ai", asyncHandler(retryAi));

module.exports = { sprintRouter: router };
