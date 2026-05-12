const express = require("express");
const { callback, connect, importSprint, listBoards, listSprints, getStatus } = require("./jira.controller");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { validate } = require("../../utils/validate");
const { importJiraSprintSchema, listSprintsQuerySchema } = require("../../validators/jira.validator");

const router = express.Router();

router.get("/connect", verifyJWT, asyncHandler(connect));
router.get("/callback", asyncHandler(callback));
router.get("/status", verifyJWT, asyncHandler(getStatus));
router.get("/boards", verifyJWT, asyncHandler(listBoards));
router.get("/sprints", verifyJWT, validate(listSprintsQuerySchema, "query"), asyncHandler(listSprints));
router.post("/import", verifyJWT, validate(importJiraSprintSchema), asyncHandler(importSprint));

module.exports = { jiraRouter: router };
