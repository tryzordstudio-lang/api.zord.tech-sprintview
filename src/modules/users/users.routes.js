const express = require("express");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { asyncHandler } = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const { User } = require("../../models/user.model");
const { Workspace } = require("../../models/workspace.model");

const router = express.Router();

router.get(
  "/me",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-passwordHash -refreshTokens").lean();
    const workspace = user?.workspaceId ? await Workspace.findById(user.workspaceId).lean() : null;

    res.json(
      successResponse({
        user: user
          ? {
              id: String(user._id),
              workspaceId: String(user.workspaceId),
              email: user.email,
              name: user.name,
              jiraConnected: Boolean(user.jira?.connected),
              authProviders: [
                ...(user.passwordHash ? ["password"] : []),
                ...(user.google?.id ? ["google"] : []),
                ...(user.atlassianAuth?.id ? ["atlassian"] : [])
              ]
            }
          : req.user,
        workspace: workspace
          ? {
              id: String(workspace._id),
              name: workspace.name,
              ownerId: String(workspace.ownerId),
              slug: workspace.slug || "",
              description: workspace.description || "",
              branding: {
                companyName: workspace.branding?.companyName || "",
                companyTagline: workspace.branding?.companyTagline || "",
                logoUrl: workspace.branding?.logoUrl || ""
              }
            }
          : null,
        jira: user?.jira
          ? {
              connected: Boolean(user.jira.connected),
              siteName: user.jira.siteName || null,
              cloudId: user.jira.cloudId || null
            }
          : {
              connected: false,
              siteName: null,
              cloudId: null
            }
      })
    );
  })
);

module.exports = { usersRouter: router };
