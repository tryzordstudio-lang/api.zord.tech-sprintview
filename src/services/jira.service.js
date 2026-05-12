const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../models/user.model");
const { Project } = require("../models/project.model");
const { ApiError } = require("../utils/api-error");
const { decrypt, encrypt } = require("../utils/crypto");

class JiraService {
  getConnectUrl(user) {
    if (!env.atlassianClientId || !env.atlassianClientSecret) {
      throw new ApiError(400, "JIRA_NOT_CONFIGURED", "Atlassian OAuth is not configured");
    }

    const state = jwt.sign(
      {
        flow: "jira-connect",
        provider: "atlassian",
        userId: user.id,
        workspaceId: user.workspaceId
      },
      env.jwtAccessSecret,
      { expiresIn: "10m" }
    );

    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: env.atlassianClientId,
      scope: env.atlassianScopes,
      redirect_uri: env.atlassianAuthRedirectUri,
      state,
      response_type: "code",
      prompt: "consent"
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleCallback({ code, state }) {
    if (!code || !state) {
      throw new ApiError(400, "INVALID_CALLBACK", "Missing OAuth code or state");
    }

    let decodedState;
    try {
      decodedState = jwt.verify(state, env.jwtAccessSecret);
    } catch (_error) {
      throw new ApiError(400, "INVALID_STATE", "OAuth state is invalid or expired");
    }

    if (decodedState.flow && decodedState.flow !== "jira-connect") {
      throw new ApiError(400, "INVALID_STATE", "OAuth state does not belong to the Jira connect flow");
    }

    const user = await User.findById(decodedState.userId);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found for Jira callback");
    }

    const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: env.atlassianClientId,
        client_secret: env.atlassianClientSecret,
        code,
        redirect_uri: env.atlassianAuthRedirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new ApiError(400, "JIRA_TOKEN_EXCHANGE_FAILED", "Failed to exchange Jira code");
    }

    const tokenData = await tokenResponse.json();
    const resourcesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json"
      }
    });

    if (!resourcesResponse.ok) {
      throw new ApiError(400, "JIRA_RESOURCES_FAILED", "Failed to load Jira cloud resources");
    }

    const resources = await resourcesResponse.json();
    const primaryResource = resources[0];

    user.jira = {
      connected: true,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: encrypt(tokenData.refresh_token),
      cloudId: primaryResource?.id,
      siteName: primaryResource?.name,
      accountId: tokenData.account_id,
      tokenExpiresAt: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000)
    };

    await user.save();

    return {
      connected: true,
      siteName: primaryResource?.name,
      cloudId: primaryResource?.id
    };
  }

  async listBoards(userId) {
    return this.fetchJira(userId, "/rest/agile/1.0/board");
  }

  async getConnectionStatus(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (!user.jira?.connected) {
      return {
        connected: false,
        siteName: null,
        cloudId: null
      };
    }

    return {
      connected: true,
      siteName: user.jira.siteName || null,
      cloudId: user.jira.cloudId || null
    };
  }

  async listSprints(userId, boardId) {
    return this.fetchJira(userId, `/rest/agile/1.0/board/${boardId}/sprint`);
  }

  async getSprintIssues(userId, sprintId) {
    return this.fetchJira(userId, `/rest/agile/1.0/sprint/${sprintId}/issue`);
  }

  async fetchJira(userId, path) {
    const user = await User.findById(userId);
    if (!user?.jira?.connected) {
      throw new ApiError(400, "JIRA_NOT_CONNECTED", "Connect Jira before using this endpoint");
    }

    const accessToken = await this.getValidAccessToken(user);
    const response = await fetch(`https://api.atlassian.com/ex/jira/${user.jira.cloudId}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new ApiError(response.status, "JIRA_REQUEST_FAILED", "Jira API request failed");
    }

    return response.json();
  }

  async getValidAccessToken(user) {
    if (user.jira.tokenExpiresAt && user.jira.tokenExpiresAt.getTime() > Date.now() + 60_000) {
      return decrypt(user.jira.accessToken);
    }

    const refreshed = await this.refreshAccessToken(user);
    return refreshed;
  }

  async refreshAccessToken(user) {
    const refreshToken = decrypt(user.jira.refreshToken);

    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: env.atlassianClientId,
        client_secret: env.atlassianClientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new ApiError(401, "JIRA_REFRESH_FAILED", "Failed to refresh Jira access token");
    }

    const data = await response.json();
    user.jira.accessToken = encrypt(data.access_token);
    if (data.refresh_token) {
      user.jira.refreshToken = encrypt(data.refresh_token);
    }
    user.jira.tokenExpiresAt = new Date(Date.now() + Number(data.expires_in || 3600) * 1000);
    await user.save();

    return data.access_token;
  }

  async resolveProject({ workspaceId, createdBy, projectName, projectKey, boardId }) {
    let project = await Project.findOne({
      workspaceId,
      jiraBoardId: boardId || null,
      name: projectName
    });

    if (!project) {
      project = await Project.create({
        workspaceId,
        name: projectName || "Imported Jira Project",
        jiraBoardId: boardId,
        jiraProjectKey: projectKey,
        createdBy
      });
    }

    return project;
  }
}

const jiraService = new JiraService();

module.exports = { jiraService };
