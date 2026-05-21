const { ReportTemplate } = require("../models/report-template.model");
const { ApiError } = require("../utils/api-error");

class TemplateService {
  async listTemplates({ workspaceId, userId, query }) {
    const filters = { workspaceId };

    if (query.scope === "private") {
      filters.scope = "private";
      filters.createdBy = userId;
    } else if (query.scope === "workspace") {
      filters.scope = "workspace";
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      ReportTemplate.find(filters).sort({ updatedAt: -1 }).skip(skip).limit(query.limit).lean(),
      ReportTemplate.countDocuments(filters)
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total ? Math.ceil(total / query.limit) : 0
      }
    };
  }

  async saveTemplate({ workspaceId, userId, templateId, payload }) {
    const filters = templateId ? { _id: templateId, workspaceId } : null;
    let template = filters ? await ReportTemplate.findOne(filters) : null;

    if (templateId && !template) {
      throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    }

    if (!template) {
      template = new ReportTemplate({
        workspaceId,
        createdBy: userId
      });
    }

    template.name = payload.name;
    template.description = payload.description || "";
    template.themeVariant = payload.themeVariant;
    template.templatePreset = payload.templatePreset;
    template.widgetLayout = payload.widgetLayout;
    template.scope = payload.scope;
    await template.save();

    return this.serialize(template.toObject());
  }

  async deleteTemplate({ workspaceId, templateId }) {
    const template = await ReportTemplate.findOneAndDelete({ _id: templateId, workspaceId }).lean();
    if (!template) {
      throw new ApiError(404, "TEMPLATE_NOT_FOUND", "Template not found");
    }

    return {
      deleted: true,
      templateId: String(template._id)
    };
  }

  serialize(template) {
    return {
      id: String(template._id),
      workspaceId: String(template.workspaceId),
      createdBy: String(template.createdBy),
      name: template.name,
      description: template.description || "",
      themeVariant: template.themeVariant || "enterprise",
      templatePreset: template.templatePreset || "executive",
      widgetLayout: template.widgetLayout || [],
      scope: template.scope || "workspace",
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }
}

const templateService = new TemplateService();

module.exports = { templateService };
