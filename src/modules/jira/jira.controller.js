const { jiraService } = require("../../services/jira.service");
const { sprintService } = require("../../services/sprint.service");
const { successResponse } = require("../../utils/api-response");

async function connect(req, res) {
  const authUrl = jiraService.getConnectUrl(req.user);
  res.json(successResponse({ authUrl }));
}

async function callback(req, res) {
  const result = await jiraService.handleCallback(req.query);
  res.json(successResponse(result, "Jira connected"));
}

async function listBoards(req, res) {
  const data = await jiraService.listBoards(req.user.id);
  res.json(successResponse(data));
}

async function getStatus(req, res) {
  const data = await jiraService.getConnectionStatus(req.user.id);
  res.json(successResponse(data));
}

async function listSprints(req, res) {
  const data = await jiraService.listSprints(req.user.id, req.query.boardId);
  res.json(successResponse(data));
}

async function importSprint(req, res) {
  const result = await sprintService.importJiraSprint({
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    ...req.body
  });

  res.status(201).json(successResponse(result, "Jira sprint imported"));
}

module.exports = { connect, callback, listBoards, listSprints, importSprint, getStatus };
