const { sprintService } = require("../../services/sprint.service");
const { successResponse } = require("../../utils/api-response");

async function listSprints(req, res) {
  const result = await sprintService.listSprints({
    workspaceId: req.user.workspaceId,
    query: req.query
  });

  res.json(successResponse(result));
}

async function importSprint(req, res) {
  const result = await sprintService.importManualSprint({
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    payload: req.body
  });

  res.status(201).json(successResponse(result, "Sprint imported"));
}

async function getSprint(req, res) {
  const result = await sprintService.getSprintById({
    sprintId: req.params.id,
    workspaceId: req.user.workspaceId
  });

  res.json(successResponse(result));
}

async function deleteSprint(req, res) {
  const result = await sprintService.deleteSprint({
    sprintId: req.params.id,
    workspaceId: req.user.workspaceId
  });

  res.json(successResponse(result, "Sprint deleted"));
}

async function retryAi(req, res) {
  const result = await sprintService.retryAi({
    sprintId: req.params.id,
    workspaceId: req.user.workspaceId
  });

  res.json(successResponse(result, "AI regeneration queued"));
}

async function updateSprint(req, res) {
  const result = await sprintService.updateSprint({
    sprintId: req.params.id,
    workspaceId: req.user.workspaceId,
    payload: req.body
  });

  res.json(successResponse(result, "Sprint updated"));
}

module.exports = { listSprints, importSprint, getSprint, deleteSprint, retryAi, updateSprint };
