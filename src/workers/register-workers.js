const { JOB_NAMES } = require("../queues/job-names");
const { queueService } = require("../services/queue.service");
const { reportService } = require("../services/report.service");
const { sprintService } = require("../services/sprint.service");

function registerWorkers() {
  queueService.registerHandler(JOB_NAMES.GENERATE_INTELLIGENCE, async (payload) =>
    sprintService.generateIntelligence(payload)
  );

  queueService.registerHandler(JOB_NAMES.GENERATE_PDF, async (payload) =>
    reportService.generatePdf(payload.reportId, payload.workspaceId)
  );
}

module.exports = { registerWorkers };
