const { reportService } = require("../../services/report.service");
const { successResponse } = require("../../utils/api-response");

async function listReports(req, res) {
  const result = await reportService.listReports({
    workspaceId: req.user.workspaceId,
    query: req.query
  });

  res.json(successResponse(result));
}

async function getReportById(req, res) {
  const result = await reportService.getReportById({
    reportId: req.params.id,
    workspaceId: req.user.workspaceId
  });
  res.json(successResponse(result));
}

async function updateReportPreferences(req, res) {
  const result = await reportService.updateReportPreferences({
    reportId: req.params.id,
    workspaceId: req.user.workspaceId,
    payload: req.body
  });

  res.json(successResponse(result, "Report preferences updated"));
}

async function updateReportSharing(req, res) {
  const result = await reportService.updateReportSharing({
    reportId: req.params.id,
    workspaceId: req.user.workspaceId,
    payload: req.body
  });

  res.json(successResponse(result, "Report sharing updated"));
}

async function getPublicReport(req, res) {
  const result = await reportService.getPublicReportBySlug({
    slug: req.params.slug,
    password: req.query.password || req.body?.password || ""
  });

  res.json(successResponse(result));
}

async function listPublicReportComments(req, res) {
  const result = await reportService.listPublicCommentsBySlug({
    slug: req.params.slug,
    password: req.query.password || req.body?.password || ""
  });

  res.json(successResponse(result));
}

async function addPublicReportComment(req, res) {
  const result = await reportService.addPublicCommentBySlug({
    slug: req.params.slug,
    password: req.body?.password || "",
    payload: req.body
  });

  res.json(successResponse(result, "Comment added"));
}

async function getPdf(req, res) {
  const result = await reportService.generatePdf(req.params.id, req.user.workspaceId);
  res.json(successResponse(result, "PDF generated"));
}

async function getWord(req, res) {
  const result = await reportService.generateWord(req.params.id, req.user.workspaceId);
  res.json(successResponse(result, "Word document generated"));
}

module.exports = {
  listReports,
  getReportById,
  updateReportPreferences,
  updateReportSharing,
  getPublicReport,
  listPublicReportComments,
  addPublicReportComment,
  getPdf,
  getWord
};
