const { reportService } = require("../../services/report.service");
const { successResponse } = require("../../utils/api-response");

async function listReports(req, res) {
  const result = await reportService.listReports({
    workspaceId: req.user.workspaceId,
    query: req.query
  });

  res.json(successResponse(result));
}

async function getPublicReport(req, res) {
  const result = await reportService.getPublicReport(req.params.token);
  res.json(successResponse(result));
}

async function getReportById(req, res) {
  const result = await reportService.getReportById({
    reportId: req.params.id,
    workspaceId: req.user.workspaceId
  });
  res.json(successResponse(result));
}

async function getPdf(req, res) {
  const result = await reportService.generatePdf(req.params.id, req.user.workspaceId);
  res.json(successResponse(result, "PDF generated"));
}

async function getWord(req, res) {
  const result = await reportService.generateWord(req.params.id, req.user.workspaceId);
  res.json(successResponse(result, "Word document generated"));
}

async function updateReportStatus(req, res) {
  const result = await reportService.updateReportStatus({
    reportId: req.params.id,
    workspaceId: req.user.workspaceId,
    status: req.body.status
  });

  res.json(successResponse(result, "Report status updated"));
}

module.exports = { listReports, getPublicReport, getReportById, getPdf, getWord, updateReportStatus };
