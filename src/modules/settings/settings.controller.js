const { settingsService } = require("../../services/settings.service");
const { successResponse } = require("../../utils/api-response");

async function getSettings(req, res) {
  const result = await settingsService.getWorkspaceSettings(req.user.workspaceId);
  res.json(successResponse(result));
}

async function updateSettings(req, res) {
  const result = await settingsService.updateWorkspaceSettings(req.user.workspaceId, req.body);
  res.json(successResponse(result, "Workspace settings updated"));
}

module.exports = { getSettings, updateSettings };
