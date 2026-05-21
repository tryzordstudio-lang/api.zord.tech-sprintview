const express = require("express");
const { z } = require("zod");
const { verifyJWT } = require("../../middleware/verify-jwt");
const { requireWorkspaceRole } = require("../../middleware/require-workspace-role");
const { asyncHandler } = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const { ApiError } = require("../../utils/api-error");
const { validate } = require("../../utils/validate");
const { User } = require("../../models/user.model");
const { Workspace } = require("../../models/workspace.model");

const router = express.Router();
const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"])
});

function buildAuthProviders(user) {
  return [
    ...(user?.passwordHash ? ["password"] : []),
    ...(user?.google?.id ? ["google"] : []),
    ...(user?.atlassianAuth?.id ? ["atlassian"] : [])
  ];
}

router.get(
  "/me",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-refreshTokens").lean();
    const workspace = user?.workspaceId ? await Workspace.findById(user.workspaceId).lean() : null;

    res.json(
      successResponse({
        user: user
          ? {
              id: String(user._id),
              workspaceId: String(user.workspaceId),
              email: user.email,
              name: user.name,
              role: user.role || "owner",
              status: user.status || "active",
              jiraConnected: Boolean(user.jira?.connected),
              authProviders: buildAuthProviders(user)
            }
          : req.user,
        workspace: workspace
          ? {
              id: String(workspace._id),
              name: workspace.name,
              ownerId: String(workspace.ownerId),
              slug: workspace.slug || "",
              description: workspace.description || "",
              timezone: workspace.timezone || "UTC",
              branding: {
                companyName: workspace.branding?.companyName || "",
                companyTagline: workspace.branding?.companyTagline || "",
                logoUrl: workspace.branding?.logoUrl || ""
              },
              accessControl: {
                defaultShareMode: workspace.accessControl?.defaultShareMode || "team",
                allowPublicLinks: workspace.accessControl?.allowPublicLinks !== false
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

router.get(
  "/workspace/members",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const members = await User.find({ workspaceId: req.user.workspaceId })
      .select("name email role status createdAt")
      .sort({ createdAt: 1 })
      .lean();

    res.json(
      successResponse({
        items: members.map((member) => ({
          id: String(member._id),
          name: member.name,
          email: member.email,
          role: member.role || "owner",
          status: member.status || "active",
          createdAt: member.createdAt
        }))
      })
    );
  })
);

router.patch(
  "/workspace/members/:id/role",
  verifyJWT,
  requireWorkspaceRole(["owner", "admin"]),
  validate(updateMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const target = await User.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId });

    if (!target) {
      throw new ApiError(404, "MEMBER_NOT_FOUND", "Workspace member not found");
    }

    if (String(target._id) === req.user.id && req.user.role === "owner") {
      throw new ApiError(400, "OWNER_ROLE_LOCKED", "Workspace owner role cannot be changed here");
    }

    target.role = req.body.role;
    await target.save();

    res.json(
      successResponse(
        {
          id: String(target._id),
          role: target.role
        },
        "Member role updated"
      )
    );
  })
);

module.exports = { usersRouter: router };
