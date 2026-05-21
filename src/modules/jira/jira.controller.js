const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { jiraService } = require("../../services/jira.service");
const { sprintService } = require("../../services/sprint.service");
const { successResponse } = require("../../utils/api-response");

async function connect(req, res) {
  const authUrl = jiraService.getConnectUrl(req.user);
  res.json(successResponse({ authUrl }));
}

function redirectWithFrontendPath(res, path, searchParams = {}) {
  const url = new URL(path, env.frontendUrl);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return res.redirect(url.toString());
}

function getOAuthProviderError(query, fallbackMessage) {
  if (!query?.error && !query?.error_description) {
    return null;
  }

  return query.error_description || query.error || fallbackMessage;
}

async function callback(req, res) {
  try {
    const providerError = getOAuthProviderError(req.query, "Jira connect failed");
    if (providerError) {
      return redirectWithFrontendPath(res, "/integrations", {
        error: providerError
      });
    }

    await jiraService.handleCallback(req.query);
    return redirectWithFrontendPath(res, "/integrations", { connected: "jira" });
  } catch (error) {
    logger.error({ err: error, provider: "jira" }, "Jira OAuth callback failed");
    return redirectWithFrontendPath(res, "/integrations", {
      error: error.message || "Jira connect failed"
    });
  }
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
