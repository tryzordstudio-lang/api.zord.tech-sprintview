const { Report } = require("../models/report.model");
const { Insight } = require("../models/insight.model");
const { Sprint } = require("../models/sprint.model");
const { Project } = require("../models/project.model");
const { Story } = require("../models/story.model");
const { Workspace } = require("../models/workspace.model");
const { ApiError } = require("../utils/api-error");
const { hashPassword, verifyPassword } = require("../utils/password");
const { pdfService } = require("./pdf.service");
const { storageService } = require("./storage.service");

class ReportService {
  async listReports({ workspaceId, query }) {
    const filters = { workspaceId };

    const sortFieldMap = {
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    };
    const sortBy = sortFieldMap[query.sortBy] || "updatedAt";
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;
    const skip = (query.page - 1) * query.limit;

    const [reports, total] = await Promise.all([
      Report.find(filters).sort({ [sortBy]: sortDirection }).skip(skip).limit(query.limit).lean(),
      Report.countDocuments(filters)
    ]);

    const sprintIds = reports.map((item) => item.sprintId);
    const sprints = sprintIds.length
      ? await Sprint.find({ _id: { $in: sprintIds }, workspaceId }).lean()
      : [];

    const projectIds = [...new Set(sprints.map((item) => item.projectId).filter(Boolean).map(String))];
    const projects = projectIds.length
      ? await Project.find({ _id: { $in: projectIds }, workspaceId }).lean()
      : [];

    const sprintMap = new Map(sprints.map((item) => [String(item._id), item]));
    const projectMap = new Map(projects.map((item) => [String(item._id), item]));

    return {
      items: reports.map((report) => {
        const sprint = sprintMap.get(String(report.sprintId)) || null;

        return {
          report: this.serializeReportRecord(report),
          sprint,
          project: sprint?.projectId ? projectMap.get(String(sprint.projectId)) || null : null
        };
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total ? Math.ceil(total / query.limit) : 0
      }
    };
  }

  async ensureReport({ workspaceId, sprintId }) {
    const report = await Report.findOneAndUpdate(
      { sprintId, workspaceId },
      {
        workspaceId,
        sprintId
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return report;
  }

  async updateReportPreferences({ reportId, workspaceId, payload }) {
    const report = await Report.findOne({ _id: reportId, workspaceId });
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
    }

    report.title = payload.title || report.title || "";
    report.preferences = {
      themeVariant: payload.themeVariant,
      templatePreset: payload.templatePreset,
      widgetLayout: payload.widgetLayout
    };
    await report.save();

    return {
      reportId: report._id.toString(),
      title: report.title || "",
      preferences: report.preferences
    };
  }

  async updateReportSharing({ reportId, workspaceId, payload }) {
    const report = await Report.findOne({ _id: reportId, workspaceId });
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
    }

    const workspace = await Workspace.findById(workspaceId).lean();
    const workspaceSlug = this.slugify(workspace?.slug || workspace?.name || `workspace-${workspaceId}`);
    const reportSlug = this.slugify(payload.publicSlug || report.title || `report-${report._id}`);
    const publicSlug = payload.mode === "public" || payload.mode === "password"
      ? `${workspaceSlug}--${workspaceId.toString()}--${reportSlug}`
      : "";

    report.sharing = {
      mode: payload.mode,
      publicSlug,
      passwordHash: payload.mode === "password" ? await hashPassword(payload.password) : "",
      allowComments: Boolean(payload.allowComments),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null
    };
    await report.save();

    return {
      reportId: report._id.toString(),
      sharing: this.serializeSharing(report.sharing)
    };
  }

  async getReportById({ reportId, workspaceId }) {
    const report = await Report.findOne({ _id: reportId, workspaceId }).lean();
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
    }

    return this.buildReportPayload({
      sprintId: report.sprintId,
      workspaceId,
      reportId: report._id
    });
  }

  async getPublicReportBySlug({ slug, password }) {
    const report = await this.resolvePublicReportBySlug({ slug, password });

    const payload = await this.buildReportPayload({
      sprintId: report.sprintId,
      workspaceId: report.workspaceId,
      reportId: report._id
    });

    return {
      ...payload,
      public: true,
      sharing: this.serializeSharing(report.sharing),
      comments: (report.comments || []).map((comment, index) => ({
        id: `${report._id.toString()}-${index}`,
        authorName: comment.authorName || "Anonymous",
        message: comment.message,
        createdAt: comment.createdAt || report.updatedAt || report.createdAt
      }))
    };
  }

  async listPublicCommentsBySlug({ slug, password }) {
    const report = await this.resolvePublicReportBySlug({ slug, password });

    return {
      reportId: report._id.toString(),
      comments: (report.comments || []).map((comment, index) => ({
        id: `${report._id.toString()}-${index}`,
        authorName: comment.authorName || "Anonymous",
        message: comment.message,
        createdAt: comment.createdAt || report.updatedAt || report.createdAt
      }))
    };
  }

  async addPublicCommentBySlug({ slug, password, payload }) {
    const report = await Report.findOne({ "sharing.publicSlug": slug });
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Shared report not found");
    }

    await this.resolvePublicReportBySlug({ slug, password });

    if (!report.sharing?.allowComments) {
      throw new ApiError(403, "COMMENTS_DISABLED", "Comments are disabled for this report");
    }

    report.comments = report.comments || [];
    report.comments.push({
      authorName: payload.authorName || "Anonymous",
      message: payload.message
    });
    await report.save();

    const latest = report.comments[report.comments.length - 1];
    return {
      id: `${report._id.toString()}-${report.comments.length - 1}`,
      authorName: latest.authorName || "Anonymous",
      message: latest.message,
      createdAt: latest.createdAt || new Date()
    };
  }

  async resolvePublicReportBySlug({ slug, password }) {
    const report = await Report.findOne({ "sharing.publicSlug": slug }).lean();

    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Shared report not found");
    }

    const mode = report.sharing?.mode || "private";
    if (mode === "private") {
      throw new ApiError(403, "REPORT_PRIVATE", "This report is private");
    }

    const expiresAt = report.sharing?.expiresAt ? new Date(report.sharing.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      throw new ApiError(410, "REPORT_LINK_EXPIRED", "This shared report link has expired");
    }

    if (mode === "password") {
      const isValid = report.sharing?.passwordHash
        ? await verifyPassword(String(password || ""), report.sharing.passwordHash)
        : false;
      if (!isValid) {
        throw new ApiError(401, "REPORT_PASSWORD_REQUIRED", "Valid report password is required");
      }
    }

    return report;
  }

  async buildReportPayload({ sprintId, workspaceId, reportId }) {
    const sprint = await Sprint.findOne({ _id: sprintId, workspaceId }).lean();
    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint not found");
    }

    const [insights, project, report, stories, workspace, recentSprints] = await Promise.all([
      Insight.find({ sprintId, workspaceId }).sort({ createdAt: 1 }).lean(),
      sprint.projectId ? Project.findOne({ _id: sprint.projectId, workspaceId }).lean() : null,
      reportId
        ? Report.findOne({ _id: reportId, sprintId, workspaceId }).lean()
        : Report.findOne({ sprintId, workspaceId }).lean(),
      Story.find({ sprintId, workspaceId }).sort({ createdAt: 1 }).lean(),
      Workspace.findById(workspaceId).lean(),
      Sprint.find({ workspaceId }).sort({ createdAt: -1 }).limit(7).lean()
    ]);

    const orderedRecentSprints = [...recentSprints].reverse();

    return {
      report: this.serializeReportRecord(report),
      project,
      sprint,
      workspace,
      insights,
      stories,
      analytics: {
        completionTrend: this.buildCompletionTrendFromSprints(orderedRecentSprints, sprint),
        velocityTrend: this.buildVelocityTrendFromSprints(orderedRecentSprints, sprint),
        storyDistribution: this.buildStoryDistribution(stories),
        assigneeLoad: this.buildAssigneeLoad(stories)
      }
    };
  }

  async generatePdf(reportId, workspaceId) {
    const report = await Report.findOne({ _id: reportId, workspaceId });
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
    }

    const payload = await this.buildReportPayload({
      sprintId: report.sprintId,
      workspaceId,
      reportId: report._id
    });
    const pdfBuffer = await pdfService.generateReportPdf(payload);
    const pdfUrl = await storageService.uploadBuffer({
      key: `pdfs/report-${report._id}.pdf`,
      buffer: Buffer.from(pdfBuffer),
      contentType: "application/pdf"
    });

    report.pdfUrl = pdfUrl;
    await report.save();

    return {
      reportId: report._id,
      pdfUrl
    };
  }

  async generateWord(reportId, workspaceId) {
    const report = await Report.findOne({ _id: reportId, workspaceId });
    if (!report) {
      throw new ApiError(404, "REPORT_NOT_FOUND", "Report not found");
    }

    const payload = await this.buildReportPayload({
      sprintId: report.sprintId,
      workspaceId,
      reportId: report._id
    });

    const wordHtml = this.buildWordDocument(payload);
    const wordUrl = await storageService.uploadBuffer({
      key: `docs/report-${report._id}.doc`,
      buffer: Buffer.from(wordHtml, "utf8"),
      contentType: "application/msword"
    });

    return {
      reportId: report._id,
      wordUrl
    };
  }

  buildWordDocument(payload) {
    const sprint = payload.sprint || {};
    const project = payload.project || {};
    const insights = payload.insights || [];
    const stories = payload.stories || [];
    const analytics = payload.analytics || {};
    const recommendations = sprint.recommendations || [];
    const completionTrendSvg = this.buildTrendLineSvg({
      title: "Completion Trend",
      data: analytics.completionTrend || []
    });
    const velocityTrendSvg = this.buildTrendLineSvg({
      title: "Velocity Trend",
      data: analytics.velocityTrend || [],
      valueSuffix: " pts"
    });
    const storyDistributionSvg = this.buildDonutChartSvg({
      title: "Story Distribution",
      data: analytics.storyDistribution || []
    });
    const assigneeLoadSvg = this.buildHorizontalBarChartSvg({
      title: "Assignee Load",
      data: analytics.assigneeLoad || [],
      valueSuffix: "%"
    });

    const metricsRows = [
      ["Health score", `${sprint.healthScore || 0} (${sprint.healthLabel || "Unknown"})`],
      ["Completion", `${sprint.metrics?.completionRate || 0}%`],
      ["Blocked stories", `${sprint.metrics?.blocked || 0}`],
      ["Pending stories", `${sprint.metrics?.pending || 0}`]
    ]
      .map(
        ([label, value]) =>
          `<tr><td><strong>${this.escapeHtml(label)}</strong></td><td>${this.escapeHtml(value)}</td></tr>`
      )
      .join("");

    const insightRows = insights.length
      ? insights
          .map(
            (insight) =>
              `<tr><td>${this.escapeHtml(insight.type)}</td><td>${this.escapeHtml(
                insight.severity
              )}</td><td>${this.escapeHtml(insight.content)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="3">No AI insights available.</td></tr>`;

    const storyRows = stories.length
      ? stories
          .map(
            (story) =>
              `<tr><td>${this.escapeHtml(story.issueKey || "Story")}</td><td>${this.escapeHtml(
                story.name
              )}</td><td>${this.escapeHtml(story.status || "To Do")}</td><td>${this.escapeHtml(
                story.assignee || "Unassigned"
              )}</td><td>${this.escapeHtml(String(story.storyPoints || 0))}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5">No stories available.</td></tr>`;

    const recommendationList = recommendations.length
      ? recommendations.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")
      : "<li>No recommendations available.</li>";

    return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(sprint.name || "Report")}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
      h1, h2, h3 { margin: 0 0 12px; }
      p { line-height: 1.6; }
      .meta { color: #475569; margin-bottom: 28px; }
      .section { margin-top: 28px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #d8e2f0; padding: 10px 12px; text-align: left; vertical-align: top; }
      th { background: #eef3ff; }
      ul { margin: 12px 0 0; padding-left: 18px; }
      .chart-grid { margin-top: 12px; }
      .chart-row { font-size: 0; white-space: nowrap; }
      .chart-cell { display: inline-block; width: 48.5%; vertical-align: top; }
      .chart-cell + .chart-cell { margin-left: 3%; }
      .chart-card { border: 1px solid #d8e2f0; border-radius: 16px; padding: 14px; background: #f8fbff; }
      .chart-card h3 { font-size: 15px; margin-bottom: 6px; }
      .chart-card p { margin: 0 0 10px; color: #475569; font-size: 12px; }
      .chart-svg { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <h1>${this.escapeHtml(sprint.name || "Sprint report")}</h1>
    <p class="meta">${this.escapeHtml(project.name || "Workspace")} | ${this.escapeHtml(
      sprint.goal || "No sprint goal recorded."
    )}</p>
    <div class="section">
      <h2>Executive Summary</h2>
      <p>${this.escapeHtml(sprint.aiSummary || "No AI summary available.")}</p>
    </div>
    <div class="section">
      <h2>Key Metrics</h2>
      <table>
        <tbody>${metricsRows}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Recommendations</h2>
      <ul>${recommendationList}</ul>
    </div>
    <div class="section">
      <h2>Delivery Charts</h2>
      <div class="chart-grid">
        <div class="chart-row">
          <div class="chart-cell">
            <div class="chart-card">
              <h3>Completion Trend</h3>
              <p>Completion rates across recent sprints.</p>
              ${completionTrendSvg}
            </div>
          </div>
          <div class="chart-cell">
            <div class="chart-card">
              <h3>Velocity Trend</h3>
              <p>Completed story-point throughput across recent sprints.</p>
              ${velocityTrendSvg}
            </div>
          </div>
        </div>
      </div>
      <div class="chart-grid" style="margin-top:16px;">
        <div class="chart-row">
          <div class="chart-cell">
            <div class="chart-card">
              <h3>Story Distribution</h3>
              <p>Current delivery-state mix for this sprint.</p>
              ${storyDistributionSvg}
            </div>
          </div>
          <div class="chart-cell">
            <div class="chart-card">
              <h3>Assignee Load</h3>
              <p>Story-point ownership by assignee.</p>
              ${assigneeLoadSvg}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <h2>AI Insights</h2>
      <table>
        <thead><tr><th>Type</th><th>Severity</th><th>Insight</th></tr></thead>
        <tbody>${insightRows}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Stories</h2>
      <table>
        <thead><tr><th>Key</th><th>Name</th><th>Status</th><th>Assignee</th><th>Points</th></tr></thead>
        <tbody>${storyRows}</tbody>
      </table>
    </div>
  </body>
</html>`;
  }

  buildStoryDistribution(stories = []) {
    const done = stories.filter((story) => /(done|complete|closed|resolved)/i.test(story.status || "")).length;
    const blocked = stories.filter((story) => story.blocked || /block/i.test(story.status || "")).length;
    const inProgress = Math.max(stories.length - done - blocked, 0);

    return [
      { label: "Done", value: done, tone: "healthy" },
      { label: "In Progress", value: inProgress, tone: "default" },
      { label: "Blocked", value: blocked, tone: "risk" }
    ];
  }

  buildAssigneeLoad(stories = []) {
    const totals = new Map();
    const totalPoints = stories.reduce((sum, story) => sum + Number(story.storyPoints || 0), 0) || 1;

    for (const story of stories) {
      const key = story.assignee || "Unassigned";
      totals.set(key, (totals.get(key) || 0) + Number(story.storyPoints || 0));
    }

    return [...totals.entries()]
      .map(([label, value]) => ({
        label,
        value: Math.round((value / totalPoints) * 100)
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }

  buildCompletionTrendFromSprints(sprints = [], sprint) {
    const points = sprints
      .slice(0, 7)
      .map((item, index) => ({
        label: item.sprintNumber ? `S${item.sprintNumber}` : `Sprint ${index + 1}`,
        value: Number(item.metrics?.completionRate || 0)
      }))
      .filter((item) => item.label);

    if (points.length) {
      return points;
    }

    return [
      {
        label: sprint?.sprintNumber ? `S${sprint.sprintNumber}` : "Current",
        value: Number(sprint?.metrics?.completionRate || 0)
      }
    ];
  }

  buildVelocityTrendFromSprints(sprints = [], sprint) {
    const points = sprints
      .slice(0, 7)
      .map((item, index) => ({
        label: item.sprintNumber ? `S${item.sprintNumber}` : `Sprint ${index + 1}`,
        value: Number(item.metrics?.completedStoryPoints || item.metrics?.completed || 0)
      }))
      .filter((item) => item.label);

    if (points.length) {
      return points;
    }

    return [
      {
        label: sprint?.sprintNumber ? `S${sprint.sprintNumber}` : "Current",
        value: Number(sprint?.metrics?.completedStoryPoints || sprint?.metrics?.completed || 0)
      }
    ];
  }

  buildTrendLineSvg({ title, data = [], valueSuffix = "%" }) {
    const points = data.length ? data : [{ label: "Current", value: 0 }];
    const width = 480;
    const height = 190;
    const paddingX = 28;
    const chartTop = 44;
    const chartHeight = 98;
    const chartWidth = width - paddingX * 2;
    const max = Math.max(...points.map((point) => Number(point.value || 0)), 1);
    const stepX = chartWidth / Math.max(points.length - 1, 1);
    const path = points
      .map((point, index) => {
        const x = paddingX + index * stepX;
        const y = chartTop + chartHeight - (Number(point.value || 0) / max) * chartHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    const areaPath = `${path} L ${paddingX + chartWidth} ${chartTop + chartHeight} L ${paddingX} ${chartTop + chartHeight} Z`;
    const axisLabels = points
      .map((point, index) => {
        const x = paddingX + index * stepX;
        return `<text x="${x}" y="${height - 18}" font-size="11" font-family="Arial, sans-serif" text-anchor="${index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}" fill="#64748b">${this.escapeHtml(point.label)}</text>`;
      })
      .join("");
    const pointDots = points
      .map((point, index) => {
        const x = paddingX + index * stepX;
        const y = chartTop + chartHeight - (Number(point.value || 0) / max) * chartHeight;
        return `
          <circle cx="${x}" cy="${y}" r="4.5" fill="#2453e6" />
          <text x="${x}" y="${y - 12}" font-size="10" font-family="Arial, sans-serif" text-anchor="middle" fill="#142033">${this.escapeHtml(String(point.value ?? 0))}${this.escapeHtml(valueSuffix)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <defs>
          <linearGradient id="${this.escapeHtml(this.slugify(title))}-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36, 83, 230, 0.28)" />
            <stop offset="100%" stop-color="rgba(36, 83, 230, 0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#f8fbff" />
        <text x="${paddingX}" y="26" font-size="12" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">${this.escapeHtml(title)}</text>
        <line x1="${paddingX}" y1="${chartTop + chartHeight}" x2="${paddingX + chartWidth}" y2="${chartTop + chartHeight}" stroke="#dce4ef" />
        <path d="${areaPath}" fill="url(#${this.escapeHtml(this.slugify(title))}-fill)" />
        <path d="${path}" fill="none" stroke="#2453e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        ${pointDots}
        ${axisLabels}
      </svg>
    `;
  }

  buildDonutChartSvg({ title, data = [] }) {
    const items = data.length ? data : [{ label: "No data", value: 1, tone: "default" }];
    const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
    const colors = {
      healthy: "#166534",
      risk: "#b42318",
      default: "#60a5fa"
    };

    let start = 0;
    const segments = items
      .map((item) => {
        const value = Number(item.value || 0) / total;
        const end = start + value;
        const largeArc = value > 0.5 ? 1 : 0;
        const startAngle = start * Math.PI * 2 - Math.PI / 2;
        const endAngle = end * Math.PI * 2 - Math.PI / 2;
        const x1 = 78 + 44 * Math.cos(startAngle);
        const y1 = 78 + 44 * Math.sin(startAngle);
        const x2 = 78 + 44 * Math.cos(endAngle);
        const y2 = 78 + 44 * Math.sin(endAngle);
        const color = colors[item.tone] || colors.default;
        start = end;

        return `<path d="M ${x1} ${y1} A 44 44 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" />`;
      })
      .join("");

    const legend = items
      .map((item, index) => {
        const color = colors[item.tone] || colors.default;
        const y = 46 + index * 28;
        return `
          <circle cx="196" cy="${y}" r="5" fill="${color}" />
          <text x="210" y="${y + 4}" font-size="11" font-family="Arial, sans-serif" fill="#142033">${this.escapeHtml(item.label)}: ${this.escapeHtml(String(item.value || 0))}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 360 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="360" height="170" rx="18" fill="#f8fbff" />
        <text x="20" y="24" font-size="12" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">${this.escapeHtml(title)}</text>
        ${segments}
        <circle cx="78" cy="78" r="24" fill="#ffffff" />
        <text x="78" y="74" font-size="11" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#142033">${this.escapeHtml(String(total))}</text>
        <text x="78" y="88" font-size="10" font-family="Arial, sans-serif" text-anchor="middle" fill="#64748b">items</text>
        ${legend}
      </svg>
    `;
  }

  buildHorizontalBarChartSvg({ title, data = [], valueSuffix = "%" }) {
    const items = data.length ? data : [{ label: "Unassigned", value: 0 }];
    const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
    const width = 480;
    const rowHeight = 34;
    const height = 62 + items.length * rowHeight;
    const rows = items
      .map((item, index) => {
        const y = 52 + index * rowHeight;
        const fillWidth = Math.max(12, (250 * Number(item.value || 0)) / max);
        return `
          <text x="20" y="${y}" font-size="11" font-family="Arial, sans-serif" fill="#142033">${this.escapeHtml(item.label)}</text>
          <rect x="170" y="${y - 11}" width="250" height="14" rx="7" fill="#e8eef7" />
          <rect x="170" y="${y - 11}" width="${fillWidth}" height="14" rx="7" fill="#2453e6" />
          <text x="438" y="${y}" font-size="11" font-family="Arial, sans-serif" text-anchor="end" fill="#64748b">${this.escapeHtml(String(item.value || 0))}${this.escapeHtml(valueSuffix)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#f8fbff" />
        <text x="20" y="26" font-size="12" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">${this.escapeHtml(title)}</text>
        ${rows}
      </svg>
    `;
  }

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  slugify(value) {
    return String(value || "chart")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "chart";
  }

  serializeSharing(sharing = {}) {
    return {
      mode: sharing.mode || "team",
      publicSlug: sharing.publicSlug || "",
      allowComments: Boolean(sharing.allowComments),
      hasPassword: Boolean(sharing.passwordHash),
      expiresAt: sharing.expiresAt || null
    };
  }

  serializeReportRecord(report) {
    if (!report) {
      return null;
    }

    return {
      _id: report._id,
      workspaceId: report.workspaceId,
      sprintId: report.sprintId,
      title: report.title || "",
      preferences: {
        themeVariant: report.preferences?.themeVariant || "enterprise",
        templatePreset: report.preferences?.templatePreset || "executive",
        widgetLayout: report.preferences?.widgetLayout || []
      },
      sharing: this.serializeSharing(report.sharing),
      comments: Array.isArray(report.comments)
        ? report.comments.map((comment, index) => ({
            id: `${report._id.toString()}-${index}`,
            authorName: comment.authorName || "Anonymous",
            message: comment.message,
            createdAt: comment.createdAt || report.updatedAt || report.createdAt
          }))
        : [],
      pdfUrl: report.pdfUrl || "",
      htmlSnapshotUrl: report.htmlSnapshotUrl || "",
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  }
}

const reportService = new ReportService();

module.exports = { reportService };
