const { Workspace } = require("../models/workspace.model");
const { ApiError } = require("../utils/api-error");

class SettingsService {
  async getWorkspaceSettings(workspaceId) {
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      throw new ApiError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
    }

    return this.serialize(workspace);
  }

  async updateWorkspaceSettings(workspaceId, payload) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      throw new ApiError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");
    }

    workspace.name = payload.name;
    workspace.slug = payload.slug;
    workspace.description = payload.description || "";
    workspace.branding = {
      companyName: payload.branding?.companyName || "",
      companyTagline: payload.branding?.companyTagline || "",
      logoUrl: payload.branding?.logoUrl || ""
    };
    workspace.notifications = {
      alertChannel: payload.notifications?.alertChannel || "email",
      digestWindow: payload.notifications?.digestWindow || "monday-0900"
    };

    await workspace.save();
    return this.serialize(workspace.toObject());
  }

  serialize(workspace) {
    return {
      workspace: {
        id: String(workspace._id),
        name: workspace.name,
        slug: workspace.slug || "",
        description: workspace.description || "",
        ownerId: String(workspace.ownerId)
      },
      branding: {
        companyName: workspace.branding?.companyName || "",
        companyTagline: workspace.branding?.companyTagline || "",
        logoUrl: workspace.branding?.logoUrl || ""
      },
      notifications: {
        alertChannel: workspace.notifications?.alertChannel || "email",
        digestWindow: workspace.notifications?.digestWindow || "monday-0900"
      }
    };
  }
}

const settingsService = new SettingsService();

module.exports = { settingsService };
