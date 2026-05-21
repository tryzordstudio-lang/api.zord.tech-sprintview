const fs = require("fs");
const { env } = require("../config/env");

class PdfService {
  async generateReportPdf(reportData) {
    const html = this.buildReportHtml(reportData);

    try {
      return await this.generateWithPuppeteer(html, reportData);
    } catch (_error) {
      return this.generateFallbackPdf(reportData);
    }
  }

  buildReportHtml(reportData) {
    const sprint = reportData.sprint || {};
    const project = reportData.project || {};
    const report = reportData.report || {};
    const workspace = reportData.workspace || {};
    const branding = workspace.branding || {};
    const insights = reportData.insights || [];
    const stories = reportData.stories || [];
    const analytics = reportData.analytics || {};
    const metrics = sprint.metrics || {};
    const recommendations = sprint.recommendations || [];

    const companyName = branding.companyName || workspace.name || project.name || "SprintView";
    const teamName = project.name || workspace.name || "Delivery Team";
    const releaseLabel = sprint.sprintNumber ? `Sprint ${sprint.sprintNumber}` : "Current Sprint";
    const completionRate = Number(metrics.completionRate || 0);
    const blocked = Number(metrics.blocked || 0);
    const totalStories = Number(metrics.totalStories || stories.length || 0);
    const completedStories = Number(metrics.completed || 0);
    const pendingStories = Number(metrics.pending || 0);
    const inProgressStories = Number(metrics.inProgress || 0);
    const totalStoryPoints = Number(metrics.totalStoryPoints || 0);
    const completedStoryPoints = Number(metrics.completedStoryPoints || completedStories || 0);
    const healthScore = Number(sprint.healthScore || 0);
    const healthLabel = sprint.healthLabel || "Unknown";
    const sprintWindow = `${this.formatDateShort(sprint.dateRange?.start)} - ${this.formatDateShort(
      sprint.dateRange?.end
    )}`;
    const generatedAt = this.formatDate(report.updatedAt || report.createdAt || sprint.updatedAt || sprint.createdAt);
    const confidenceScore = this.clamp(Math.round(healthScore * 0.55 + completionRate * 0.45 - blocked * 4), 0, 100);
    const confidenceLabel = this.describeConfidence(confidenceScore);
    const bugsCount = stories.filter((story) => /bug/i.test(String(story.issueType || ""))).length;
    const reviewCount = stories.filter((story) => /(review|qa|testing)/i.test(String(story.status || ""))).length;
    const goalAchievement = totalStoryPoints
      ? this.clamp(Math.round((completedStoryPoints / Math.max(totalStoryPoints, 1)) * 100), 0, 100)
      : completionRate;
    const scopeVolatility = totalStories
      ? this.clamp(Math.round(((pendingStories + inProgressStories + blocked) / totalStories) * 100), 0, 100)
      : 0;
    const qaPressure = totalStories ? this.clamp(Math.round((reviewCount / totalStories) * 100), 0, 100) : 0;
    const deliveryConfidence = this.clamp(Math.round(confidenceScore * 0.92), 0, 100);
    const assigneeLoad = analytics.assigneeLoad || [];
    const topOwner = assigneeLoad[0] || null;
    const completionTrend = analytics.completionTrend || [];
    const velocityTrend = analytics.velocityTrend || [];
    const previousCompletion = completionTrend.length > 1
      ? Number(completionTrend[completionTrend.length - 2]?.value || 0)
      : completionRate;
    const completionDelta = completionRate - previousCompletion;
    const previousVelocity = velocityTrend.length > 1
      ? Number(velocityTrend[velocityTrend.length - 2]?.value || 0)
      : completedStoryPoints;
    const velocityDelta = completedStoryPoints - previousVelocity;
    const reportStatusLabel =
      report.reportStatus === "published"
        ? "Ready for review"
        : report.reportStatus === "draft"
          ? "Internal draft"
          : this.capitalize(report.reportStatus || "In progress");
    const deliveryRiskLabel = this.capitalize(sprint.deliveryRisk || "medium");
    const deliveryRiskTone =
      sprint.deliveryRisk === "high" ? "risk" : sprint.deliveryRisk === "medium" ? "warning" : "healthy";
    const healthTone = /healthy/i.test(healthLabel) ? "healthy" : /moderate|watch/i.test(healthLabel) ? "warning" : "risk";
    const qualityLoad = bugsCount || blocked;
    const ownershipSummary = topOwner
      ? `${topOwner.label} carries ${topOwner.value}% of scoped points and is the main ownership concentration.`
      : "Ownership is spread without a single high-concentration assignee.";
    const blockerSummary = blocked
      ? `${blocked} blocker-linked ${blocked === 1 ? "item is" : "items are"} still constraining sprint closeout.`
      : "No blocker-linked items are materially constraining closeout.";
    const deliverySummary = `${completedStories} of ${totalStories} stories are complete with ${completedStoryPoints} story points delivered.`;

    const executiveKpis = [
      {
        label: "Completion",
        value: `${completionRate}%`,
        detail: `${this.formatDelta(completionDelta)} vs prior sprint`,
        tone: completionRate >= 80 ? "healthy" : completionRate >= 60 ? "warning" : "risk"
      },
      {
        label: "Velocity",
        value: `${completedStoryPoints} SP`,
        detail: `${this.formatSignedNumber(velocityDelta)} vs prior sprint`,
        tone: velocityDelta >= 0 ? "healthy" : "warning"
      },
      {
        label: "Confidence",
        value: `${confidenceScore}%`,
        detail: confidenceLabel,
        tone: confidenceScore >= 75 ? "healthy" : confidenceScore >= 55 ? "warning" : "risk"
      },
      {
        label: "Quality",
        value: String(qualityLoad),
        detail: bugsCount ? `${bugsCount} bug-focused items in scope` : `${blocked} blocker-linked items tracked`,
        tone: bugsCount <= 2 && blocked === 0 ? "healthy" : bugsCount <= 4 ? "warning" : "risk"
      },
      {
        label: "Delivered",
        value: String(completedStories),
        detail: `${completedStoryPoints} story points completed`,
        tone: "default"
      },
      {
        label: "Risk",
        value: deliveryRiskLabel,
        detail: healthLabel,
        tone: deliveryRiskTone
      }
    ];

    const goalHighlights = [
      sprint.goal || "No sprint objective was recorded for this cycle.",
      completedStories
        ? `${completedStories} stories closed with ${completedStoryPoints} story points delivered.`
        : "No completed stories have been recorded yet.",
      blocked
        ? `${blocked} blocker-linked items require closeout before full sign-off.`
        : "No active blockers are currently limiting sprint closeout."
    ];

    const deliveryAnalytics = [
      {
        label: "Scope Stability",
        value: `${100 - scopeVolatility}%`,
        detail:
          scopeVolatility > 45
            ? "Scope movement was elevated in the second half of the sprint."
            : "Scope remained comparatively steady through the sprint window.",
        tone: scopeVolatility > 45 ? "risk" : scopeVolatility > 25 ? "warning" : "healthy"
      },
      {
        label: "QA Pressure",
        value: `${qaPressure}%`,
        detail:
          qaPressure > 30
            ? "Review and testing demand exceeded the recommended operating range."
            : "Review workload remained within a manageable range.",
        tone: qaPressure > 30 ? "risk" : qaPressure > 18 ? "warning" : "healthy"
      },
      {
        label: "Delivery Confidence",
        value: `${deliveryConfidence}%`,
        detail:
          deliveryConfidence >= 75
            ? "Forecasted completion confidence is strong for stakeholder communication."
            : "Confidence remains watchlisted and should stay visible during closeout.",
        tone: deliveryConfidence >= 75 ? "healthy" : deliveryConfidence >= 55 ? "warning" : "risk"
      },
      {
        label: "Bottleneck Detection",
        value: blocked ? "Escalated" : qaPressure > 20 ? "Review Cycle" : "Stable Flow",
        detail: blocked
          ? "Blocked work and external dependencies are the primary constraint."
          : qaPressure > 20
            ? "Review throughput is the slowest moving phase in this sprint."
            : topOwner
              ? `${topOwner.label} holds the highest ownership share at ${topOwner.value}%.`
              : "No major bottleneck signal was detected in the current sprint data.",
        tone: blocked ? "risk" : qaPressure > 20 ? "warning" : "healthy"
      }
    ];

    const teamHealthRows = this.buildTeamHealthRows({
      completionRate,
      qaPressure,
      blocked,
      topOwner,
      deliveryConfidence
    });
    const businessImpactRows = this.buildBusinessImpactRows({
      completionDelta,
      bugsCount,
      deliveryConfidence,
      healthLabel
    });
    const riskItems = this.buildRiskHighlights({ insights, blocked, qaPressure, topOwner });
    const nextOutlookItems = this.buildNextOutlookItems({ recommendations, completionRate, blocked, qaPressure });
    const completedWorkRows = this.buildCompletedWorkRows(stories);
    const insightCardsHtml = this.buildInsightCards(insights);
    const completedHighlights = stories
      .filter((story) => this.isDoneStatus(story.status))
      .slice(0, 3)
      .map((story) => ({
        id: story.issueKey || "Story",
        name: story.name || "Untitled task",
        points: Number(story.storyPoints || 0)
      }));

    const progressChartSvg = this.buildTrendLineSvg({
      title: "Sprint Progress",
      data: analytics.completionTrend || []
    });
    const velocityChartSvg = this.buildColumnTrendSvg({
      title: "Velocity Trend",
      data: analytics.velocityTrend || [],
      valueSuffix: " pts"
    });
    const assigneeLoadSvg = this.buildHorizontalBarChartSvg({
      title: "Team Health Load",
      data: analytics.assigneeLoad || [],
      valueSuffix: "%"
    });
    const goalAchievementSvg = this.buildGoalAchievementSvg(goalAchievement);
    const deliverySnapshotSvg = this.buildDeliveryChartSvg({
      completionRate,
      completedStories,
      pendingStories,
      blocked,
      totalStories
    });

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(sprint.name || "Sprint Report")}</title>
    <style>
      :root {
        --bg: #ffffff;
        --surface: #ffffff;
        --surface-soft: #f7f9fc;
        --surface-strong: #eef4ff;
        --text: #0f172a;
        --text-soft: #5b6472;
        --border: #dde4ee;
        --primary: #0f172a;
        --accent: #2453e6;
        --accent-soft: #dbe7ff;
        --neutral-soft: #eef2f7;
        --risk-soft: #fdecec;
        --warn-soft: #fff1d6;
        --success-soft: #e8f7ed;
        --risk: #b42318;
        --warn: #9a6700;
        --success: #166534;
      }

      * { box-sizing: border-box; }
      html, body { background: var(--bg); }
      body {
        margin: 0;
        color: var(--text);
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: #eef3f9;
      }

      .header-title,
      .summary-title,
      .section-title,
      .summary-panel-title,
      .card-title,
      .meta-card strong,
      .summary-meta-row strong,
      .summary-list-item strong,
      .story-item strong,
      .kpi-card strong,
      .analytics-card strong,
      .impact-card strong,
      .health-row span,
      .health-status,
      .goal-pill,
      .status-pill,
      .summary-panel-label,
      .section-copy,
      .summary-copy,
      .summary-panel-copy,
      .card-copy,
      .bullet-list li,
      .footer {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .report-shell {
        padding: 14px 16px 10px;
      }

      .header {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
        gap: 16px;
        padding: 20px 22px;
        border: 1px solid #cfdaf0;
        border-radius: 20px;
        background:
          radial-gradient(circle at top right, rgba(36, 83, 230, 0.12), transparent 30%),
          linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
      }

      .header-label,
      .section-label {
        display: block;
        margin-bottom: 8px;
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .header-title {
        margin: 0;
        font-size: 28px;
        line-height: 1.08;
        font-weight: 800;
        letter-spacing: -0.03em;
      }

      .header-subtitle {
        margin: 8px 0 0;
        max-width: 62ch;
        font-size: 14px;
        color: var(--text-soft);
        line-height: 1.6;
      }

      .brandline {
        margin-top: 12px;
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .header-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .meta-card {
        border: 1px solid var(--border);
        background: #fff;
        padding: 12px 13px;
        min-height: 72px;
        border-radius: 14px;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
      }

      .meta-card span,
      .kpi-card span,
      .analytics-card span,
      .impact-card span {
        display: block;
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .meta-card strong {
        display: block;
        margin-top: 8px;
        font-size: 16px;
        line-height: 1.2;
      }

      .section {
        margin-top: 16px;
        padding: 16px 18px 18px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 8px 22px rgba(15, 23, 42, 0.025);
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .section-copy {
        margin: 7px 0 0;
        color: var(--text-soft);
        font-size: 11px;
        line-height: 1.6;
      }

      .summary-shell {
        margin-top: 14px;
        padding: 16px;
        border: 1px solid #cfdaf0;
        border-radius: 18px;
        background:
          linear-gradient(135deg, rgba(36, 83, 230, 0.06), rgba(36, 83, 230, 0)),
          #ffffff;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
      }

      .summary-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        gap: 16px;
        align-items: start;
      }

      .summary-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }

      .status-pill,
      .summary-panel-label {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border: 1px solid var(--border);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .status-pill.tone-default,
      .summary-panel-label { background: var(--neutral-soft); color: var(--text-soft); }
      .status-pill.tone-healthy { background: var(--success-soft); color: var(--success); border-color: #bfdec8; }
      .status-pill.tone-warning { background: var(--warn-soft); color: var(--warn); border-color: #ead6ab; }
      .status-pill.tone-risk { background: var(--risk-soft); color: var(--risk); border-color: #efc3bf; }

      .summary-title {
        margin: 0;
        font-size: 22px;
        line-height: 1.12;
        font-weight: 800;
      }

      .summary-copy {
        margin: 10px 0 0;
        max-width: 76ch;
        color: var(--text-soft);
        font-size: 12px;
        line-height: 1.65;
      }

      .summary-meta {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid #dce5f4;
        background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%);
        border-radius: 16px;
      }

      .summary-meta-row {
        display: grid;
        gap: 4px;
      }

      .summary-meta-row span {
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .summary-meta-row strong {
        font-size: 13px;
        line-height: 1.45;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .kpi-card,
      .analytics-card,
      .impact-card,
      .card,
      .chart-card,
      .insight-card,
      .risk-card {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 16px;
      }

      .kpi-card {
        padding: 14px 14px 12px;
        background: linear-gradient(180deg, rgba(238, 244, 255, 0.55), #ffffff 58%);
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.03);
      }

      .kpi-card strong {
        display: block;
        margin-top: 10px;
        font-size: 24px;
        line-height: 1;
      }

      .kpi-card p,
      .analytics-card p,
      .impact-card p,
      .card-copy,
      .insight-card p,
      .risk-card p {
        margin: 8px 0 0;
        font-size: 11px;
        color: var(--text-soft);
        line-height: 1.5;
      }

      .tone-healthy strong { color: var(--success); }
      .tone-warning strong { color: var(--warn); }
      .tone-risk strong { color: var(--risk); }
      .tone-default strong { color: var(--primary); }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .summary-panel {
        padding: 14px;
        border: 1px solid var(--border);
        background: #ffffff;
        border-radius: 16px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .summary-panel-title {
        margin: 10px 0 0;
        font-size: 13px;
        font-weight: 800;
      }

      .summary-panel-copy {
        margin: 8px 0 0;
        color: var(--text-soft);
        font-size: 11px;
        line-height: 1.55;
      }

      .summary-list,
      .story-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .summary-list-item,
      .story-item {
        display: grid;
        gap: 4px;
      }

      .summary-list-item strong,
      .story-item strong {
        font-size: 11px;
        line-height: 1.45;
      }

      .summary-list-item span,
      .story-item span {
        color: var(--text-soft);
        font-size: 11px;
        line-height: 1.5;
      }

      .story-item {
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border);
      }

      .story-item:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }

      .story-points {
        display: inline-flex;
        width: fit-content;
        padding: 3px 7px;
        border: 1px solid var(--border);
        background: var(--surface-soft);
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 700;
      }

      .two-up {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
      }

      .split {
        display: grid;
        grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr);
        gap: 18px;
        margin-top: 14px;
      }

      .chart-card,
      .card,
      .insight-card,
      .risk-card {
        padding: 14px;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .card-title {
        margin: 0 0 4px;
        font-size: 13px;
        font-weight: 800;
      }

      .chart-svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .goal-shell {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 250px;
        border: 1px solid var(--border);
        background: var(--surface-soft);
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      .goal-summary {
        display: grid;
        gap: 10px;
      }

      .goal-pill {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 5px 10px;
        border: 1px solid var(--border);
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .bullet-list {
        margin: 0;
        padding-left: 18px;
      }

      .bullet-list li {
        margin: 0 0 8px;
        font-size: 12px;
        line-height: 1.55;
      }

      .analytics-grid,
      .impact-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .analytics-card,
      .impact-card {
        padding: 13px 14px;
        border-radius: 14px;
        min-width: 0;
      }

      .analytics-card strong,
      .impact-card strong {
        display: block;
        margin-top: 8px;
        font-size: 20px;
        line-height: 1.1;
      }

      .insight-stack,
      .risk-stack {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }

      .insight-card.tone-risk,
      .risk-card.tone-risk { border-left: 4px solid var(--risk); }

      .insight-card.tone-warning,
      .risk-card.tone-warning { border-left: 4px solid var(--warn); }

      .insight-card.tone-healthy,
      .risk-card.tone-healthy { border-left: 4px solid var(--success); }

      .severity-label {
        display: block;
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .health-grid {
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
        gap: 14px;
        margin-top: 14px;
      }

      .health-list {
        display: grid;
        gap: 10px;
      }

      .health-row {
        display: grid;
        grid-template-columns: 150px 1fr auto;
        gap: 10px;
        align-items: center;
      }

      .health-row span {
        font-size: 12px;
        font-weight: 600;
      }

      .health-bar {
        position: relative;
        height: 10px;
        background: #edf2f7;
        overflow: hidden;
      }

      .health-bar-fill {
        position: absolute;
        inset: 0 auto 0 0;
        height: 10px;
      }

      .health-status {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .table-shell {
        margin-top: 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        break-inside: avoid-page;
        page-break-inside: avoid;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        text-align: left;
        font-size: 11px;
        vertical-align: top;
      }

      th {
        background: var(--surface-soft);
        color: var(--text-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      tr:last-child td { border-bottom: 0; }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 18px;
        padding: 12px 2px 0;
        border-top: 1px solid var(--border);
        color: var(--text-soft);
        font-size: 10px;
      }

      .empty-state {
        color: var(--text-soft);
        font-size: 12px;
      }

      @page {
        size: A4 landscape;
        margin: 11mm 10mm 10mm;
      }
    </style>
  </head>
  <body>
    <div class="report-shell">
      <header class="header">
        <div>
          <span class="header-label">SprintView Printable Report</span>
          <h1 class="header-title">Sprint Report</h1>
          <p class="header-subtitle">${this.escapeHtml(sprint.name || releaseLabel)}</p>
          <div class="brandline">Generated by SprintView • Powered by Zord</div>
        </div>
        <div>
          <div class="header-meta">
            <div class="meta-card"><span>Team</span><strong>${this.escapeHtml(teamName)}</strong></div>
            <div class="meta-card"><span>Date Range</span><strong>${this.escapeHtml(sprintWindow)}</strong></div>
            <div class="meta-card"><span>Release</span><strong>${this.escapeHtml(releaseLabel)}</strong></div>
            <div class="meta-card"><span>Generated</span><strong>${this.escapeHtml(generatedAt)}</strong></div>
          </div>
        </div>
      </header>

      <section class="section">
        <span class="section-label">Executive Summary</span>
        <h2 class="section-title">Executive delivery card for steering review and closeout decisions.</h2>
        <p class="section-copy">Condensed for fast review: headline metrics, current delivery posture, AI risk readout, completed work, and immediate follow-up actions.</p>
        <div class="summary-shell">
          <div class="summary-hero">
            <div>
              <div class="summary-badges">
                <span class="status-pill tone-${this.escapeHtml(healthTone)}">${this.escapeHtml(`Status: ${healthLabel}`)}</span>
                <span class="status-pill tone-${this.escapeHtml(deliveryRiskTone)}">${this.escapeHtml(`Risk: ${deliveryRiskLabel}`)}</span>
                <span class="status-pill tone-default">${this.escapeHtml(reportStatusLabel)}</span>
              </div>
              <h3 class="summary-title">${this.escapeHtml(sprint.name || releaseLabel)}</h3>
              <p class="summary-copy">${this.escapeHtml(
                sprint.aiSummary || "Sprint health is being evaluated from the available delivery signals."
              )}</p>
            </div>
            <aside class="summary-meta">
              <div class="summary-meta-row">
                <span>Project</span>
                <strong>${this.escapeHtml(teamName)}</strong>
              </div>
              <div class="summary-meta-row">
                <span>Sprint Goal</span>
                <strong>${this.escapeHtml(
                  sprint.goal || "No sprint objective was explicitly recorded for this reporting cycle."
                )}</strong>
              </div>
              <div class="summary-meta-row">
                <span>Last Updated</span>
                <strong>${this.escapeHtml(generatedAt)}</strong>
              </div>
            </aside>
          </div>

          <div class="kpi-grid">
            ${executiveKpis
              .map(
                (item) => `
                  <article class="kpi-card tone-${this.escapeHtml(item.tone)}">
                    <span>${this.escapeHtml(item.label)}</span>
                    <strong>${this.escapeHtml(item.value)}</strong>
                    <p>${this.escapeHtml(item.detail)}</p>
                  </article>
                `
              )
              .join("")}
          </div>

          <div class="summary-grid">
            <article class="summary-panel">
              <span class="summary-panel-label">Delivery Brief</span>
              <h3 class="summary-panel-title">What leadership needs to know now</h3>
              <div class="summary-list">
                <div class="summary-list-item">
                  <strong>${this.escapeHtml(deliverySummary)}</strong>
                  <span>${this.escapeHtml(`Goal achievement is ${goalAchievement}% against the scoped story points.`)}</span>
                </div>
                <div class="summary-list-item">
                  <strong>${this.escapeHtml(blockerSummary)}</strong>
                  <span>${this.escapeHtml(
                    blocked ? "Escalation should stay visible until unblock ownership is explicit." : "No active blocker escalation is currently required."
                  )}</span>
                </div>
                <div class="summary-list-item">
                  <strong>${this.escapeHtml(ownershipSummary)}</strong>
                  <span>${this.escapeHtml(
                    topOwner?.value > 45 ? "Review concentration before publishing if this work mix remains owner-dependent." : "Current distribution is within a manageable range."
                  )}</span>
                </div>
              </div>
            </article>

            <article class="summary-panel">
              <span class="summary-panel-label">Risk Watch</span>
              <h3 class="summary-panel-title">Primary delivery constraints</h3>
              <div class="summary-list">
                ${riskItems
                  .map(
                    (item) => `
                      <div class="summary-list-item">
                        <strong>${this.escapeHtml(`${item.severity} priority`)}</strong>
                        <span>${this.escapeHtml(item.content)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </article>

            <article class="summary-panel">
              <span class="summary-panel-label">Completed Work</span>
              <h3 class="summary-panel-title">Delivered items contributing to closeout</h3>
              <div class="story-list">
                ${
                  completedHighlights.length
                    ? completedHighlights
                        .map(
                          (item) => `
                            <div class="story-item">
                              <strong>${this.escapeHtml(`${item.id} · ${item.name}`)}</strong>
                              <span class="story-points">${this.escapeHtml(`${item.points} pts`)}</span>
                            </div>
                          `
                        )
                        .join("")
                    : `<div class="empty-state">No completed work has been recorded yet.</div>`
                }
              </div>
            </article>

            <article class="summary-panel">
              <span class="summary-panel-label">Next Actions</span>
              <h3 class="summary-panel-title">Recommended follow-through</h3>
              <div class="summary-list">
                ${nextOutlookItems
                  .slice(0, 3)
                  .map(
                    (item, index) => `
                      <div class="summary-list-item">
                        <strong>${this.escapeHtml(`Action ${index + 1}`)}</strong>
                        <span>${this.escapeHtml(item)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <span class="section-label">Sprint Performance</span>
        <h2 class="section-title">Execution pacing across the current sprint and recent throughput history.</h2>
        <p class="section-copy">This section prioritizes the visual story behind sprint closure and momentum rather than raw backlog detail.</p>
        <div class="two-up">
          <article class="chart-card">
            <h3 class="card-title">Burndown Signal</h3>
            <p class="card-copy">Progress against the sprint closeout trajectory.</p>
            ${progressChartSvg}
          </article>
          <article class="chart-card">
            <h3 class="card-title">Velocity Trend</h3>
            <p class="card-copy">Completed story-point performance with the current sprint highlighted.</p>
            ${velocityChartSvg}
          </article>
        </div>
        <div class="two-up" style="margin-top:12px;">
          <article class="chart-card">
            <h3 class="card-title">Delivery Snapshot</h3>
            <p class="card-copy">Current completion, open work, and blocker intensity.</p>
            ${deliverySnapshotSvg}
          </article>
          <article class="chart-card">
            <h3 class="card-title">Operational Readout</h3>
            <p class="card-copy">Delivery status translated into a printable executive summary.</p>
            <div class="card">
              <ul class="bullet-list">
                <li>${this.escapeHtml(`${completedStories} of ${totalStories} tracked issues are complete in the current sprint.`)}</li>
                <li>${this.escapeHtml(
                  blocked ? `${blocked} blocker-linked issues are constraining the current closeout path.` : "No blocker-heavy constraint is active right now."
                )}</li>
                <li>${this.escapeHtml(
                  topOwner
                    ? `${topOwner.label} carries the highest ownership concentration at ${topOwner.value}% of scoped points.`
                    : "Ownership distribution remains balanced across the tracked work items."
                )}</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <span class="section-label">Goal Achievement</span>
        <h2 class="section-title">Sprint objective performance and milestone delivery clarity.</h2>
        <div class="split">
          <div class="goal-shell">${goalAchievementSvg}</div>
          <div class="goal-summary">
            <div class="goal-pill">Goal Summary</div>
            <p class="section-copy" style="margin-top:0;">${this.escapeHtml(
              sprint.goal || "No sprint objective was explicitly recorded for this reporting cycle."
            )}</p>
            <ul class="bullet-list">
              ${goalHighlights.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </section>

      <section class="section">
        <span class="section-label">Delivery Analytics</span>
        <h2 class="section-title">Operational signals around scope control, QA pressure, and completion confidence.</h2>
        <div class="analytics-grid">
          ${deliveryAnalytics
            .map(
              (item) => `
                <article class="analytics-card tone-${this.escapeHtml(item.tone)}">
                  <span>${this.escapeHtml(item.label)}</span>
                  <strong>${this.escapeHtml(item.value)}</strong>
                  <p>${this.escapeHtml(item.detail)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section">
        <span class="section-label">SprintView Insights</span>
        <h2 class="section-title">AI-powered sprint intelligence prepared for executive review.</h2>
        <p class="section-copy">Powered by Zord, these insights prioritize the highest-signal delivery conditions over raw operational noise.</p>
        <div class="insight-stack">${insightCardsHtml}</div>
      </section>

      <section class="section">
        <span class="section-label">Team Health</span>
        <h2 class="section-title">Team load, review balance, and release readiness at a glance.</h2>
        <div class="health-grid">
          <div class="card">
            <div class="health-list">
              ${teamHealthRows
                .map(
                  (row) => `
                    <div class="health-row">
                      <span>${this.escapeHtml(row.label)}</span>
                      <div class="health-bar">
                        <div class="health-bar-fill" style="width:${this.escapeHtml(String(row.value))}%; background:${this.escapeHtml(
                          row.color
                        )};"></div>
                      </div>
                      <div class="health-status" style="color:${this.escapeHtml(row.color)};">${this.escapeHtml(row.status)}</div>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
          <article class="chart-card">
            <h3 class="card-title">Assignee Load Distribution</h3>
            <p class="card-copy">Horizontal ownership view across the sprint scope.</p>
            ${assigneeLoadSvg}
          </article>
        </div>
      </section>

      <section class="section">
        <span class="section-label">Business Impact</span>
        <h2 class="section-title">Business-facing delivery outcomes expressed as clean operational signals.</h2>
        <div class="impact-grid">
          ${businessImpactRows
            .map(
              (item) => `
                <article class="impact-card tone-${this.escapeHtml(item.tone)}">
                  <span>${this.escapeHtml(item.label)}</span>
                  <strong>${this.escapeHtml(item.value)}</strong>
                  <p>${this.escapeHtml(item.detail)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section">
        <span class="section-label">Completed Work</span>
        <h2 class="section-title">Compact sprint closeout table for printable review.</h2>
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Status</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>${completedWorkRows}</tbody>
          </table>
        </div>
      </section>

      <section class="section">
        <span class="section-label">Risks & Blockers</span>
        <h2 class="section-title">The constraints most likely to affect sprint closeout or next-sprint carry-over.</h2>
        <div class="risk-stack">
          ${riskItems
            .map(
              (item) => `
                <article class="risk-card tone-${this.escapeHtml(item.tone)}">
                  <span class="severity-label">${this.escapeHtml(item.severity)}</span>
                  <p>${this.escapeHtml(item.content)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section">
        <span class="section-label">Next Sprint Outlook</span>
        <h2 class="section-title">Recommended focus areas for the next sprint planning cycle.</h2>
        <ul class="bullet-list" style="margin-top:14px;">
          ${nextOutlookItems.map((item) => `<li>${this.escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <footer class="footer">
        <span>Generated by SprintView • Powered by Zord</span>
        <span>Confidential Internal Report • ${this.escapeHtml(teamName)}</span>
      </footer>
    </div>
  </body>
</html>`;
  }

  async generateWithPuppeteer(html, reportData) {
    const puppeteer = require("puppeteer-core");
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: this.resolvePuppeteerExecutablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      return await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.buildHeaderTemplate(reportData),
        footerTemplate: this.buildFooterTemplate(),
        margin: {
          top: "52px",
          right: "24px",
          bottom: "44px",
          left: "24px"
        }
      });
    } finally {
      await browser.close();
    }
  }

  buildHeaderTemplate(reportData) {
    const sprintName = this.escapeHtml(reportData?.sprint?.name || "Sprint Report");
    const teamName = this.escapeHtml(
      reportData?.project?.name || reportData?.workspace?.name || "Delivery Team"
    );
    const sprintWindow = this.escapeHtml(
      `${this.formatDateShort(reportData?.sprint?.dateRange?.start)} - ${this.formatDateShort(
        reportData?.sprint?.dateRange?.end
      )}`
    );

    return `
      <div style="width:100%; padding:0 18px; font-family:Segoe UI, Helvetica Neue, Arial, sans-serif; font-size:10px; color:#5b6472;">
        <div style="display:flex; align-items:flex-end; justify-content:space-between; width:100%; border-bottom:1px solid #dde4ee; padding-bottom:8px;">
          <div>
            <div style="font-size:9px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#2453e6;">SprintView Report</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${sprintName}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; font-weight:700; color:#0f172a;">${teamName}</div>
            <div>${sprintWindow}</div>
          </div>
        </div>
      </div>
    `;
  }

  buildFooterTemplate() {
    return `
      <div style="width:100%; padding:0 18px; font-family:Segoe UI, Helvetica Neue, Arial, sans-serif; font-size:10px; color:#5b6472;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; border-top:1px solid #dde4ee; padding-top:8px;">
          <span>SprintView • Professional Sprint Reporting</span>
          <span>Page <span class="pageNumber"></span></span>
        </div>
      </div>
    `;
  }

  buildInsightCards(insights = []) {
    if (!insights.length) {
      return `<article class="insight-card tone-healthy"><span class="severity-label">Low Impact</span><p>No major AI risk signals were identified from the sprint snapshot.</p></article>`;
    }

    return insights
      .slice(0, 3)
      .map((insight) => {
        const tone =
          insight.severity === "high" ? "risk" : insight.severity === "medium" ? "warning" : "healthy";
        const severityLabel =
          insight.severity === "high" ? "High Impact" : insight.severity === "medium" ? "Medium Impact" : "Low Impact";

        return `
          <article class="insight-card tone-${this.escapeHtml(tone)}">
            <span class="severity-label">${this.escapeHtml(severityLabel)}</span>
            <p>${this.escapeHtml(insight.content || "No insight content available.")}</p>
          </article>
        `;
      })
      .join("");
  }

  buildTeamHealthRows({ completionRate, qaPressure, blocked, topOwner, deliveryConfidence }) {
    const blockerLoad = this.clamp(blocked * 18, 0, 100);
    const ownershipLoad = this.clamp(Number(topOwner?.value || 0), 0, 100);

    return [
      {
        label: "Delivery Flow",
        value: completionRate,
        status: completionRate >= 80 ? "Stable" : completionRate >= 60 ? "Medium Load" : "High Load",
        color: completionRate >= 80 ? "#166534" : completionRate >= 60 ? "#9a6700" : "#b42318"
      },
      {
        label: "QA Review",
        value: qaPressure,
        status: qaPressure > 30 ? "High Load" : qaPressure > 18 ? "Medium Load" : "Stable",
        color: qaPressure > 30 ? "#b42318" : qaPressure > 18 ? "#9a6700" : "#166534"
      },
      {
        label: "Blocker Pressure",
        value: blockerLoad,
        status: blocked ? "Elevated" : "Low Risk",
        color: blocked ? "#b42318" : "#166534"
      },
      {
        label: "Release Readiness",
        value: deliveryConfidence,
        status: deliveryConfidence >= 75 ? "Ready" : deliveryConfidence >= 55 ? "Watch" : "Risk",
        color: deliveryConfidence >= 75 ? "#166534" : deliveryConfidence >= 55 ? "#9a6700" : "#b42318"
      },
      {
        label: "Ownership Balance",
        value: ownershipLoad,
        status: ownershipLoad > 45 ? "Concentrated" : ownershipLoad > 30 ? "Watch" : "Balanced",
        color: ownershipLoad > 45 ? "#b42318" : ownershipLoad > 30 ? "#9a6700" : "#166534"
      }
    ];
  }

  buildBusinessImpactRows({ completionDelta, bugsCount, deliveryConfidence, healthLabel }) {
    return [
      {
        label: "Performance Improvement",
        value: this.formatDelta(completionDelta),
        detail: "Measured against the previous sprint completion rate.",
        tone: completionDelta >= 0 ? "healthy" : "warning"
      },
      {
        label: "Critical Bugs",
        value: bugsCount ? `${bugsCount} in scope` : "0 active",
        detail: bugsCount ? "Bug-oriented work remains visible in the sprint mix." : "No active critical bug workload is highlighted.",
        tone: bugsCount > 3 ? "risk" : bugsCount > 0 ? "warning" : "healthy"
      },
      {
        label: "Delivery Confidence",
        value: `${deliveryConfidence}%`,
        detail: "Confidence score for executive stakeholder communication.",
        tone: deliveryConfidence >= 75 ? "healthy" : deliveryConfidence >= 55 ? "warning" : "risk"
      },
      {
        label: "Release Stability",
        value: healthLabel,
        detail: "Sprint health translated into release readiness language.",
        tone: /healthy/i.test(healthLabel) ? "healthy" : /moderate/i.test(healthLabel) ? "warning" : "risk"
      }
    ];
  }

  buildRiskHighlights({ insights = [], blocked, qaPressure, topOwner }) {
    const items = [];

    if (blocked) {
      items.push({
        severity: "High",
        content: `${blocked} blocker-linked work items require active escalation before sprint closeout.`,
        tone: "risk"
      });
    }

    const rankedInsights = insights
      .filter((insight) => insight?.content)
      .sort((left, right) => {
        const order = { high: 3, medium: 2, low: 1 };
        return (order[right.severity] || 0) - (order[left.severity] || 0);
      });

    for (const insight of rankedInsights) {
      const tone =
        insight.severity === "high" ? "risk" : insight.severity === "medium" ? "warning" : "healthy";
      const severity = insight.severity === "high" ? "High" : insight.severity === "medium" ? "Medium" : "Low";

      items.push({
        severity,
        content: insight.content,
        tone
      });
    }

    if (qaPressure > 24) {
      items.push({
        severity: "Medium",
        content: "QA and review pressure is elevated and may delay final closeout confidence.",
        tone: "warning"
      });
    }

    if (topOwner?.value > 50) {
      items.push({
        severity: "Low",
        content: `${topOwner.label} holds a disproportionately high ownership share, which may affect delivery resilience.`,
        tone: "warning"
      });
    }

    if (!items.length) {
      items.push({
        severity: "Low",
        content: "No material blocker pattern is currently affecting sprint delivery.",
        tone: "healthy"
      });
    }

    return items.slice(0, 3);
  }

  buildNextOutlookItems({ recommendations = [], completionRate, blocked, qaPressure }) {
    if (recommendations.length) {
      return recommendations.slice(0, 4);
    }

    const defaults = [];

    if (blocked) {
      defaults.push("Resolve open blockers early in the next sprint planning window and assign explicit owners.");
    }

    if (qaPressure > 18) {
      defaults.push("Rebalance review and testing capacity to avoid a late-cycle quality bottleneck.");
    }

    if (completionRate < 75) {
      defaults.push("Reduce carry-over by sizing work more conservatively against recent delivery velocity.");
    }

    defaults.push("Preserve the clearest completed work patterns and repeat them in the next sprint plan.");
    defaults.push("Keep sprint reporting focused on delivery confidence, risk movement, and visible stakeholder outcomes.");

    return defaults.slice(0, 4);
  }

  buildCompletedWorkRows(stories = []) {
    const completed = stories.filter((story) => this.isDoneStatus(story.status)).slice(0, 10);

    if (!completed.length) {
      return `<tr><td colspan="4" class="empty-state">No completed work has been recorded yet.</td></tr>`;
    }

    return completed
      .map(
        (story) => `
          <tr>
            <td>${this.escapeHtml(story.issueKey || "Story")}</td>
            <td>${this.escapeHtml(story.name || "Untitled task")}</td>
            <td>${this.escapeHtml(story.status || "Done")}</td>
            <td>${this.escapeHtml(String(story.storyPoints || 0))}</td>
          </tr>
        `
      )
      .join("");
  }

  buildDeliveryChartSvg({ completionRate, completedStories, pendingStories, blocked, totalStories }) {
    const safeTotalStories = totalStories > 0 ? totalStories : 1;
    const completedWidth = Math.max(6, Math.min(100, completionRate || 0));
    const openWidth = Math.max(6, Math.min(100, (pendingStories / safeTotalStories) * 100));
    const blockedWidth = blocked ? Math.max(6, Math.min(100, (blocked / safeTotalStories) * 100)) : 0;

    return `
      <svg class="chart-svg" viewBox="0 0 520 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Delivery snapshot chart">
        <rect x="0" y="0" width="520" height="210" fill="#ffffff" />
        <text x="24" y="30" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="#5b6472">Sprint Snapshot</text>

        <text x="24" y="66" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#0f172a">Completion</text>
        <rect x="24" y="80" width="472" height="14" rx="7" fill="#edf2f7" />
        <rect x="24" y="80" width="${(472 * completedWidth) / 100}" height="14" rx="7" fill="#166534" />
        <text x="24" y="110" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#5b6472">${this.escapeHtml(
          `${completedStories} of ${totalStories || 0} issues are complete`
        )}</text>

        <text x="24" y="144" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#0f172a">Open Work</text>
        <rect x="24" y="158" width="472" height="14" rx="7" fill="#edf2f7" />
        <rect x="24" y="158" width="${(472 * openWidth) / 100}" height="14" rx="7" fill="#9aa5b1" />
        ${
          blockedWidth
            ? `<rect x="${24 + (472 * openWidth) / 100 - Math.min((472 * openWidth) / 100, (472 * blockedWidth) / 100)}" y="158" width="${Math.min((472 * openWidth) / 100, (472 * blockedWidth) / 100)}" height="14" rx="7" fill="#b42318" />`
            : ""
        }
        <text x="24" y="188" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#5b6472">${this.escapeHtml(
          `${pendingStories} pending • ${blocked} blocked`
        )}</text>
      </svg>
    `;
  }

  buildTrendLineSvg({ title, data = [], valueSuffix = "%" }) {
    const points = data.length ? data : [{ label: "Current", value: 0 }];
    const width = 520;
    const height = 210;
    const paddingX = 24;
    const chartTop = 44;
    const chartHeight = 108;
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
    const pointDots = points
      .map((point, index) => {
        const x = paddingX + index * stepX;
        const y = chartTop + chartHeight - (Number(point.value || 0) / max) * chartHeight;
        const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
        return `
          <circle cx="${x}" cy="${y}" r="4.5" fill="#2453e6" />
          <text x="${x}" y="${y - 12}" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#0f172a">${this.escapeHtml(String(point.value ?? 0))}${this.escapeHtml(valueSuffix)}</text>
          <text x="${x}" y="186" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="${anchor}" fill="#5b6472">${this.escapeHtml(point.label)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <defs>
          <linearGradient id="${this.escapeHtml(this.slugify(title))}-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36, 83, 230, 0.18)" />
            <stop offset="100%" stop-color="rgba(36, 83, 230, 0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
        <text x="${paddingX}" y="28" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="#5b6472">${this.escapeHtml(title)}</text>
        <line x1="${paddingX}" y1="${chartTop + chartHeight}" x2="${paddingX + chartWidth}" y2="${chartTop + chartHeight}" stroke="#dde4ee" />
        <path d="${areaPath}" fill="url(#${this.escapeHtml(this.slugify(title))}-fill)" />
        <path d="${path}" fill="none" stroke="#2453e6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pointDots}
      </svg>
    `;
  }

  buildColumnTrendSvg({ title, data = [], valueSuffix = "" }) {
    const points = data.length ? data : [{ label: "Current", value: 0 }];
    const width = 520;
    const height = 210;
    const chartTop = 46;
    const chartHeight = 112;
    const chartBottom = chartTop + chartHeight;
    const max = Math.max(...points.map((point) => Number(point.value || 0)), 1);
    const columnWidth = Math.min(60, Math.max(28, 360 / points.length));
    const gap = Math.max(16, (440 - columnWidth * points.length) / Math.max(points.length - 1, 1));
    const startX = 34;

    const bars = points
      .map((point, index) => {
        const value = Number(point.value || 0);
        const barHeight = (value / max) * chartHeight;
        const x = startX + index * (columnWidth + gap);
        const y = chartBottom - barHeight;
        const isCurrent = index === points.length - 1;
        const fill = isCurrent ? "#2453e6" : "#c8d1df";
        return `
          <rect x="${x}" y="${y}" width="${columnWidth}" height="${barHeight}" rx="8" fill="${fill}" />
          <text x="${x + columnWidth / 2}" y="${y - 10}" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#0f172a">${this.escapeHtml(String(value))}${this.escapeHtml(valueSuffix)}</text>
          <text x="${x + columnWidth / 2}" y="188" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#5b6472">${this.escapeHtml(point.label)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
        <text x="24" y="28" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="#5b6472">${this.escapeHtml(title)}</text>
        <line x1="24" y1="${chartBottom}" x2="${width - 24}" y2="${chartBottom}" stroke="#dde4ee" />
        ${bars}
      </svg>
    `;
  }

  buildHorizontalBarChartSvg({ title, data = [], valueSuffix = "%" }) {
    const items = data.length ? data : [{ label: "Unassigned", value: 0 }];
    const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
    const height = 72 + items.length * 34;
    const rows = items
      .map((item, index) => {
        const y = 62 + index * 34;
        const width = Math.max(12, (278 * Number(item.value || 0)) / max);
        return `
          <text x="24" y="${y}" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#0f172a">${this.escapeHtml(item.label)}</text>
          <rect x="176" y="${y - 12}" width="278" height="14" rx="7" fill="#edf2f7" />
          <rect x="176" y="${y - 12}" width="${width}" height="14" rx="7" fill="#2453e6" />
          <text x="476" y="${y}" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="end" fill="#5b6472">${this.escapeHtml(String(item.value || 0))}${this.escapeHtml(valueSuffix)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 520 ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="520" height="${height}" fill="#ffffff" />
        <text x="24" y="28" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="#5b6472">${this.escapeHtml(title)}</text>
        ${rows}
      </svg>
    `;
  }

  buildGoalAchievementSvg(percent) {
    const safePercent = this.clamp(Number(percent || 0), 0, 100);
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - safePercent / 100);

    return `
      <svg class="chart-svg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Goal achievement">
        <circle cx="120" cy="120" r="${radius}" fill="none" stroke="#edf2f7" stroke-width="18" />
        <circle
          cx="120"
          cy="120"
          r="${radius}"
          fill="none"
          stroke="#2453e6"
          stroke-width="18"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 120 120)"
        />
        <text x="120" y="112" text-anchor="middle" font-size="38" font-family="Segoe UI, Arial, sans-serif" font-weight="800" fill="#0f172a">${this.escapeHtml(String(safePercent))}%</text>
        <text x="120" y="138" text-anchor="middle" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="#5b6472">Achieved</text>
      </svg>
    `;
  }

  resolvePuppeteerExecutablePath() {
    const candidates = [
      env.puppeteerExecutablePath,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  async generateFallbackPdf(reportData) {
    const lines = [
      reportData.sprint?.name || "Sprint Report",
      `Completion: ${reportData.sprint?.metrics?.completionRate || 0}%`,
      `Health: ${reportData.sprint?.healthScore || 0} (${reportData.sprint?.healthLabel || "Unknown"})`,
      "",
      reportData.sprint?.aiSummary || "Summary unavailable.",
      "",
      "Insights:"
    ];

    for (const insight of reportData.insights || []) {
      lines.push(`- ${insight.type}/${insight.severity}: ${insight.content}`);
    }

    lines.push("", "Next Sprint Outlook:");

    for (const recommendation of reportData.sprint?.recommendations || []) {
      lines.push(`- ${recommendation}`);
    }

    return this.buildSimplePdf(lines);
  }

  buildSimplePdf(lines) {
    const width = 842;
    const height = 595;
    const left = 40;
    let y = 540;
    const content = ["BT", "/F1 11 Tf", "0.11 0.16 0.22 rg"];

    for (const rawLine of lines) {
      const fontSize = rawLine === lines[0] ? 20 : 11;
      const lineHeight = rawLine === "" ? 12 : fontSize === 20 ? 26 : 18;
      const chunks = rawLine === "" ? [""] : this.wrapPdfLine(rawLine, fontSize === 20 ? 90 : 120);

      for (const chunk of chunks) {
        if (y < 40) {
          break;
        }

        content.push(`${fontSize} Tf`);
        content.push(`1 0 0 1 ${left} ${y} Tm`);
        content.push(`(${this.escapePdfText(chunk)}) Tj`);
        y -= lineHeight;
      }

      if (y < 40) {
        break;
      }

      if (rawLine === "") {
        y -= 4;
      }
    }

    content.push("ET");

    const stream = content.join("\n");
    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj`,
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
      `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
  }

  wrapPdfLine(value, maxLength) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [""];
    }

    const lines = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxLength) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  isDoneStatus(status) {
    return /(done|complete|closed|resolved)/i.test(String(status || ""));
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value || 0)));
  }

  formatDelta(value) {
    const numeric = Number(value || 0);
    const rounded = Math.round(numeric);
    return `${rounded >= 0 ? "+" : ""}${rounded}%`;
  }

  formatSignedNumber(value) {
    const numeric = Math.round(Number(value || 0));
    return `${numeric >= 0 ? "+" : ""}${numeric}`;
  }

  describeConfidence(score) {
    if (score >= 80) return "High confidence";
    if (score >= 60) return "Measured confidence";
    return "Watchlisted confidence";
  }

  capitalize(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  slugify(value) {
    return (
      String(value || "chart")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "chart"
    );
  }

  escapePdfText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  formatDateShort(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }
}

const pdfService = new PdfService();

module.exports = { pdfService };
