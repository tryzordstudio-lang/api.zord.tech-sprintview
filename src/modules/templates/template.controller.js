const { templateService } = require("../../services/template.service");
const { successResponse } = require("../../utils/api-response");

async function listTemplates(req, res) {
  const result = await templateService.listTemplates({
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    query: req.query
  });

  res.json(successResponse(result));
}

async function createTemplate(req, res) {
  const result = await templateService.saveTemplate({
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    payload: req.body
  });

  res.json(successResponse(result, "Template saved"));
}

async function updateTemplate(req, res) {
  const result = await templateService.saveTemplate({
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    templateId: req.params.id,
    payload: req.body
  });

  res.json(successResponse(result, "Template updated"));
}

async function deleteTemplate(req, res) {
  const result = await templateService.deleteTemplate({
    workspaceId: req.user.workspaceId,
    templateId: req.params.id
  });

  res.json(successResponse(result, "Template deleted"));
}

module.exports = {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
