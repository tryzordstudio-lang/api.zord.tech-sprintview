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
    const companyTagline = branding.companyTagline || "Enterprise delivery reporting";
    const logoUrl = /^https?:\/\//.test(String(branding.logoUrl || "").trim()) ? String(branding.logoUrl).trim() : "";
    const completionRate = Number(metrics.completionRate || 0);
    const blocked = Number(metrics.blocked || 0);
    const totalStories = Number(metrics.totalStories || stories.length || 0);
    const completedStories = Number(metrics.completed || 0);
    const pendingStories = Number(metrics.pending || 0);
    const totalStoryPoints = Number(metrics.totalStoryPoints || 0);
    const healthScore = Number(sprint.healthScore || 0);
    const healthLabel = sprint.healthLabel || "Unknown";
    const generatedAt = this.formatDate(report.updatedAt || report.createdAt || sprint.updatedAt || sprint.createdAt);
    const sprintWindow = `${this.formatDate(sprint.dateRange?.start)} - ${this.formatDate(sprint.dateRange?.end)}`;
    const completionChartSvg = this.buildDeliveryChartSvg({
      completionRate,
      completedStories,
      pendingStories,
      blocked,
      totalStories
    });
    const statusChartSvg = this.buildStatusChartSvg(stories);
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
    const logoMarkup = logoUrl
      ? `<img class="brand-logo-image" src="${this.escapeHtml(logoUrl)}" alt="${this.escapeHtml(companyName)} logo" />`
      : `<div class="brand-logo-fallback">${this.escapeHtml(this.getBrandInitials(companyName))}</div>`;
    const insightCardsHtml = insights.length
      ? insights
          .map(
            (insight) => `
              <article class="insight-card severity-${this.escapeHtml(insight.severity || "medium")}">
                <div class="insight-card-top">
                  <span class="chip chip-muted">${this.escapeHtml(insight.type || "AI Insight")}</span>
                  <span class="chip chip-${this.escapeHtml(insight.severity || "medium")}">${this.escapeHtml(
                    insight.severity || "medium"
                  )}</span>
                </div>
                <p>${this.escapeHtml(insight.content || "No AI insight content available.")}</p>
              </article>
            `
          )
          .join("")
      : `<article class="empty-state">No AI insights available for this sprint.</article>`;
    const recommendationCardsHtml = recommendations.length
      ? recommendations
          .map(
            (item, index) => `
              <article class="recommendation-card">
                <span class="recommendation-index">${String(index + 1).padStart(2, "0")}</span>
                <p>${this.escapeHtml(item)}</p>
              </article>
            `
          )
          .join("")
      : `<article class="empty-state">No recommendations available for this sprint.</article>`;
    const storyRowsHtml = stories.length
      ? stories
          .map(
            (story) => `
              <tr>
                <td>${this.escapeHtml(story.issueKey || "Story")}</td>
                <td>${this.escapeHtml(story.name || "Untitled story")}</td>
                <td>${this.escapeHtml(story.assignee || "Unassigned")}</td>
                <td>${this.escapeHtml(story.status || "To Do")}</td>
                <td>${this.escapeHtml(String(story.storyPoints || 0))}</td>
                <td>${story.blocked ? "Yes" : "No"}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="6" class="table-empty">No story ledger available.</td></tr>`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(sprint.name || "Sprint Report")}</title>
    <style>
      :root {
        --bg: #f4f7fb;
        --surface: #ffffff;
        --surface-soft: #f8fbff;
        --text: #142033;
        --text-soft: #5d6b82;
        --border: #dce4ef;
        --border-strong: #c8d5e6;
        --primary: #2453e6;
        --primary-soft: rgba(36, 83, 230, 0.1);
        --risk: #b42318;
        --risk-soft: #fff1f0;
        --warn: #9a6700;
        --warn-soft: #fff8e6;
        --success: #166534;
        --success-soft: #effaf3;
      }

      * { box-sizing: border-box; }
      html { background: var(--bg); }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-shell {
        width: 100%;
        padding: 0;
      }

      .page {
        background: var(--surface);
        overflow: hidden;
        page-break-after: always;
        break-after: page;
      }

      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .cover-page {
        min-height: 1040px;
        padding: 48px 46px;
        background:
          radial-gradient(circle at top right, rgba(36, 83, 230, 0.2), transparent 24%),
          linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
      }

      .cover-shell {
        display: grid;
        align-content: space-between;
        min-height: 944px;
      }

      .cover-top,
      .brand-lockup,
      .cover-meta,
      .hero-top,
      .chip-row,
      .footer {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--primary);
      }

      .brand-lockup {
        gap: 14px;
      }

      .brand-logo-image,
      .brand-logo-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: linear-gradient(135deg, #2453e6, #5b6cf0);
        color: #ffffff;
        font-size: 22px;
        font-weight: 700;
        object-fit: cover;
      }

      .brand-mark {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(135deg, #2453e6, #5b6cf0);
      }

      .cover-top {
        justify-content: space-between;
        margin-bottom: 34px;
      }

      .cover-kicker {
        color: var(--text-soft);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .cover-tagline {
        margin: 6px 0 0;
        color: var(--text-soft);
        font-size: 13px;
      }

      .cover-body {
        display: grid;
        gap: 28px;
      }

      .cover-title {
        margin: 0;
        max-width: 760px;
        font-size: 38px;
        line-height: 1.02;
      }

      .cover-summary {
        margin: 0;
        max-width: 760px;
        color: var(--text-soft);
        font-size: 16px;
        line-height: 1.75;
      }

      .cover-metric-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }

      .cover-metric {
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.88);
      }

      .cover-metric span {
        display: block;
        color: var(--text-soft);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .cover-metric strong {
        display: block;
        margin-top: 10px;
        font-size: 22px;
        line-height: 1.12;
      }

      .cover-metric p {
        margin: 8px 0 0;
        color: var(--text-soft);
        font-size: 12px;
        line-height: 1.6;
      }

      .cover-meta {
        flex-wrap: wrap;
        gap: 10px;
      }

      .cover-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 18px;
        padding-top: 26px;
        border-top: 1px solid var(--border);
      }

      .cover-footer-copy strong {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
      }

      .cover-footer-copy p,
      .cover-footer-note {
        margin: 0;
        color: var(--text-soft);
        font-size: 12px;
        line-height: 1.7;
      }

      .report-page {
        margin-top: 0;
        border-top: 1px solid transparent;
      }

      .hero {
        padding: 28px 30px 24px;
        background:
          radial-gradient(circle at top right, rgba(36, 83, 230, 0.16), transparent 28%),
          linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        border-bottom: 1px solid var(--border);
      }

      .hero-top {
        justify-content: space-between;
        margin-bottom: 18px;
      }

      .hero-title {
        margin: 0;
        font-size: 30px;
        line-height: 1.06;
      }

      .hero-subtitle {
        margin: 12px 0 0;
        max-width: 680px;
        color: var(--text-soft);
        font-size: 14px;
        line-height: 1.7;
      }

      .chip-row {
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border: 1px solid transparent;
      }

      .chip-muted { background: #eef4ff; color: var(--primary); }
      .chip-high { background: var(--risk-soft); color: var(--risk); }
      .chip-medium { background: var(--warn-soft); color: var(--warn); }
      .chip-low { background: var(--success-soft); color: var(--success); }
      .chip-published, .chip-ready { background: var(--success-soft); color: var(--success); }
      .chip-draft, .chip-processing { background: #eef2ff; color: #5145cd; }

      .content {
        padding: 26px 30px 30px;
      }

      .section + .section {
        margin-top: 24px;
      }

      .section-title {
        margin: 0 0 4px;
        font-size: 16px;
      }

      .section-copy {
        margin: 0 0 16px;
        color: var(--text-soft);
        font-size: 13px;
        line-height: 1.65;
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .metric-card {
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: var(--surface-soft);
      }

      .metric-card span {
        display: block;
        color: var(--text-soft);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .metric-card strong {
        display: block;
        margin-top: 10px;
        font-size: 22px;
        line-height: 1.1;
      }

      .metric-card p {
        margin: 10px 0 0;
        color: var(--text-soft);
        font-size: 12px;
        line-height: 1.55;
      }

      .split-grid {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 18px;
      }

      .chart-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }

      .panel {
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: var(--surface);
      }

      .chart-svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .info-list {
        display: grid;
        gap: 12px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border);
      }

      .info-row:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }

      .info-row span {
        color: var(--text-soft);
        font-size: 12px;
      }

      .info-row strong {
        text-align: right;
        font-size: 13px;
      }

      .insight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .insight-card,
      .recommendation-card {
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #ffffff;
        padding: 16px;
      }

      .insight-card {
        border-left: 4px solid var(--border-strong);
      }

      .insight-card.severity-high { border-left-color: var(--risk); }
      .insight-card.severity-medium { border-left-color: #eab308; }
      .insight-card.severity-low { border-left-color: var(--success); }

      .insight-card-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }

      .insight-card p,
      .recommendation-card p {
        margin: 0;
        font-size: 13px;
        line-height: 1.65;
      }

      .recommendation-grid {
        display: grid;
        gap: 12px;
      }

      .recommendation-card {
        display: grid;
        grid-template-columns: 36px 1fr;
        gap: 12px;
        align-items: start;
      }

      .recommendation-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: var(--primary-soft);
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
        text-align: left;
        font-size: 12px;
      }

      th {
        color: var(--text-soft);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: #f8fbff;
      }

      tr:last-child td {
        border-bottom: 0;
      }

      .table-wrap {
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
      }

      .table-empty,
      .empty-state {
        color: var(--text-soft);
        font-size: 13px;
      }

      .footer {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        color: var(--text-soft);
        font-size: 11px;
        justify-content: space-between;
        gap: 12px;
      }

      @page {
        margin: 72px 28px 64px;
      }

      @media print {
        .page {
          border: 0;
          border-radius: 0;
        }

        .section,
        .panel,
        .cover-metric,
        .metric-card,
        .insight-card,
        .recommendation-card,
        .table-wrap {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="report-shell">
      <section class="page cover-page">
        <div class="cover-shell">
          <div class="cover-top">
            <div class="brand-lockup">
              ${logoMarkup}
              <div>
                <div class="cover-kicker">${this.escapeHtml(companyName)}</div>
                <p class="cover-tagline">${this.escapeHtml(companyTagline)}</p>
              </div>
            </div>
            <div class="cover-meta">
              <span class="chip chip-${this.escapeHtml(report.status || "draft")}">${this.escapeHtml(report.status || "draft")}</span>
              <span class="chip chip-${this.escapeHtml(sprint.deliveryRisk || "low")}">${this.escapeHtml(
                sprint.deliveryRisk || "low"
              )} risk</span>
            </div>
          </div>

          <div class="cover-body">
            <div class="brand">
              <span class="brand-mark"></span>
              Enterprise Sprint Report
            </div>
            <h1 class="cover-title">${this.escapeHtml(sprint.name || "Sprint Report")}</h1>
            <p class="cover-summary">${this.escapeHtml(sprint.aiSummary || "Summary unavailable.")}</p>

            <div class="cover-metric-strip">
              <article class="cover-metric">
                <span>Health Score</span>
                <strong>${this.escapeHtml(String(healthScore))}/100</strong>
                <p>${this.escapeHtml(healthLabel)}</p>
              </article>
              <article class="cover-metric">
                <span>Completion</span>
                <strong>${this.escapeHtml(String(completionRate))}%</strong>
                <p>${this.escapeHtml(String(completedStories))} of ${this.escapeHtml(String(totalStories))} stories delivered</p>
              </article>
              <article class="cover-metric">
                <span>Blocked</span>
                <strong>${this.escapeHtml(String(blocked))}</strong>
                <p>${blocked ? "Active blockers require leadership attention." : "No active blockers reported."}</p>
              </article>
              <article class="cover-metric">
                <span>Story Points</span>
                <strong>${this.escapeHtml(String(totalStoryPoints))}</strong>
                <p>${this.escapeHtml(String(pendingStories))} pending across the sprint scope</p>
              </article>
            </div>
          </div>

          <div class="cover-footer">
            <div class="cover-footer-copy">
              <strong>${this.escapeHtml(project.name || "Workspace Delivery Review")}</strong>
              <p>${this.escapeHtml(sprintWindow)}</p>
            </div>
            <p class="cover-footer-note">Prepared ${this.escapeHtml(generatedAt)} for executive review, stakeholder distribution, and formal export.</p>
          </div>
        </div>
      </section>

      <main class="page report-page">
        <section class="hero">
          <div class="hero-top">
            <div class="brand">
              <span class="brand-mark"></span>
              ${this.escapeHtml(companyName)} Reporting Pack
            </div>
            <div class="chip-row">
              <span class="chip chip-${this.escapeHtml(report.status || "draft")}">${this.escapeHtml(report.status || "draft")}</span>
              <span class="chip chip-${this.escapeHtml(sprint.deliveryRisk || "low")}">${this.escapeHtml(
                sprint.deliveryRisk || "low"
              )} risk</span>
            </div>
          </div>
          <h1 class="hero-title">${this.escapeHtml(sprint.name || "Sprint Report")}</h1>
          <p class="hero-subtitle">${this.escapeHtml(sprint.aiSummary || "Summary unavailable.")}</p>
        </section>

        <section class="content">
          <section class="section">
            <h2 class="section-title">Executive Metrics</h2>
            <p class="section-copy">A concise delivery snapshot prepared for leadership review and stakeholder reporting.</p>
            <div class="metric-grid">
              <article class="metric-card">
                <span>Health Score</span>
                <strong>${this.escapeHtml(String(sprint.healthScore || 0))}/100</strong>
                <p>${this.escapeHtml(sprint.healthLabel || "No health label available")}</p>
              </article>
              <article class="metric-card">
                <span>Completion</span>
                <strong>${this.escapeHtml(String(completionRate))}%</strong>
                <p>${this.escapeHtml(String(completedStories))} of ${this.escapeHtml(String(totalStories))} stories closed</p>
              </article>
              <article class="metric-card">
                <span>Blocked</span>
                <strong>${this.escapeHtml(String(blocked))}</strong>
                <p>${blocked ? "Requires delivery follow-up before closeout" : "No active blockers detected"}</p>
              </article>
              <article class="metric-card">
                <span>Story Points</span>
                <strong>${this.escapeHtml(String(totalStoryPoints))}</strong>
                <p>${this.escapeHtml(String(pendingStories))} pending across the sprint scope</p>
              </article>
            </div>
          </section>

          <section class="section split-grid">
            <article class="panel">
              <h2 class="section-title">Report Snapshot</h2>
              <p class="section-copy">Key governance and sprint context for this reporting cycle.</p>
              <div class="info-list">
                <div class="info-row"><span>Project</span><strong>${this.escapeHtml(project.name || "Unassigned project")}</strong></div>
                <div class="info-row"><span>Workspace</span><strong>${this.escapeHtml(workspace.name || companyName)}</strong></div>
                <div class="info-row"><span>Generated</span><strong>${this.escapeHtml(generatedAt)}</strong></div>
                <div class="info-row"><span>Sprint Window</span><strong>${this.escapeHtml(sprintWindow)}</strong></div>
                <div class="info-row"><span>Insights</span><strong>${this.escapeHtml(String(insights.length))}</strong></div>
              </div>
            </article>

            <article class="panel">
              <h2 class="section-title">Delivery Commentary</h2>
              <p class="section-copy">Prepared for operational reviews, executive checkpoints, and stakeholder distribution.</p>
              <div class="info-list">
                <div class="info-row"><span>Delivery Risk</span><strong>${this.escapeHtml(sprint.deliveryRisk || "low")}</strong></div>
                <div class="info-row"><span>Report Status</span><strong>${this.escapeHtml(report.status || "draft")}</strong></div>
                <div class="info-row"><span>Stories Tracked</span><strong>${this.escapeHtml(String(totalStories))}</strong></div>
                <div class="info-row"><span>Pending Stories</span><strong>${this.escapeHtml(String(pendingStories))}</strong></div>
              </div>
            </article>
          </section>

          <section class="section chart-grid">
            <article class="panel">
              <h2 class="section-title">Delivery Trend</h2>
              <p class="section-copy">A visual readout of completion, open work, and blocker intensity in the current sprint cycle.</p>
              ${completionChartSvg}
            </article>

            <article class="panel">
              <h2 class="section-title">Story Status Mix</h2>
              <p class="section-copy">Current work distribution across the story ledger included in this reporting pack.</p>
              ${statusChartSvg}
            </article>
          </section>

          <section class="section chart-grid">
            <article class="panel">
              <h2 class="section-title">Completion Trend</h2>
              <p class="section-copy">Completion rates across recent sprints in this workspace.</p>
              ${completionTrendSvg}
            </article>

            <article class="panel">
              <h2 class="section-title">Velocity Trend</h2>
              <p class="section-copy">Completed story-point throughput across recent sprints.</p>
              ${velocityTrendSvg}
            </article>
          </section>

          <section class="section chart-grid">
            <article class="panel">
              <h2 class="section-title">Story Distribution</h2>
              <p class="section-copy">Current delivery-state mix for the sprint included in this export.</p>
              ${storyDistributionSvg}
            </article>

            <article class="panel">
              <h2 class="section-title">Assignee Load</h2>
              <p class="section-copy">Story-point ownership by assignee across the sprint ledger.</p>
              ${assigneeLoadSvg}
            </article>
          </section>

          <section class="section">
            <h2 class="section-title">AI Insights</h2>
            <p class="section-copy">The most material signals extracted from the sprint state and delivery pattern.</p>
            <div class="insight-grid">${insightCardsHtml}</div>
          </section>

          <section class="section">
            <h2 class="section-title">Recommendations</h2>
            <p class="section-copy">Suggested actions for the team before the next reporting checkpoint.</p>
            <div class="recommendation-grid">${recommendationCardsHtml}</div>
          </section>

          <section class="section">
            <h2 class="section-title">Story Ledger</h2>
            <p class="section-copy">Representative work items included in this reporting cycle.</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Story</th>
                    <th>Title</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Points</th>
                    <th>Blocked</th>
                  </tr>
                </thead>
                <tbody>${storyRowsHtml}</tbody>
              </table>
            </div>
          </section>

          <footer class="footer">
            <span>${this.escapeHtml(project.name || "Workspace")} / ${this.escapeHtml(sprint.name || "Sprint Report")}</span>
            <span>Generated by ${this.escapeHtml(companyName)}</span>
          </footer>
        </section>
      </main>
    </div>
  </body>
</html>`;
  }

  async generateWithPuppeteer(html, reportData) {
    const puppeteer = require("puppeteer");
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
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.buildHeaderTemplate(reportData),
        footerTemplate: this.buildFooterTemplate(reportData),
        margin: {
          top: "72px",
          right: "28px",
          bottom: "64px",
          left: "28px"
        }
      });
    } finally {
      await browser.close();
    }
  }

  buildHeaderTemplate(reportData) {
    const companyName = this.escapeHtml(
      reportData?.workspace?.branding?.companyName || reportData?.workspace?.name || reportData?.project?.name || "SprintView"
    );

    return `
      <div style="width:100%; padding:0 28px; font-family:Segoe UI, Helvetica Neue, Arial, sans-serif; font-size:10px; color:#64748b;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; border-bottom:1px solid #dce4ef; padding-bottom:8px;">
          <span style="font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#2453e6;">${companyName} Reporting</span>
          <span>Executive delivery report</span>
        </div>
      </div>
    `;
  }

  buildFooterTemplate(reportData) {
    const sprintName = this.escapeHtml(reportData?.sprint?.name || "Sprint Report");
    const companyName = this.escapeHtml(
      reportData?.workspace?.branding?.companyName || reportData?.workspace?.name || reportData?.project?.name || "SprintView"
    );

    return `
      <div style="width:100%; padding:0 28px; font-family:Segoe UI, Helvetica Neue, Arial, sans-serif; font-size:10px; color:#64748b;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; border-top:1px solid #dce4ef; padding-top:8px;">
          <span>${companyName} • ${sprintName}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      </div>
    `;
  }

  buildDeliveryChartSvg({ completionRate, completedStories, pendingStories, blocked, totalStories }) {
    const safeTotalStories = totalStories > 0 ? totalStories : 1;
    const completedWidth = Math.max(6, Math.min(100, completionRate || 0));
    const openWidth = Math.max(6, Math.min(100, (pendingStories / safeTotalStories) * 100));
    const blockedWidth = blocked ? Math.max(6, Math.min(100, (blocked / safeTotalStories) * 100)) : 0;

    return `
      <svg class="chart-svg" viewBox="0 0 520 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Delivery trend chart">
        <rect x="0" y="0" width="520" height="210" rx="18" fill="#f8fbff" />
        <text x="24" y="34" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#5d6b82">Delivery Performance</text>

        <text x="24" y="74" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#142033">Completion</text>
        <rect x="24" y="88" width="472" height="16" rx="8" fill="#e8eef7" />
        <rect x="24" y="88" width="${(472 * completedWidth) / 100}" height="16" rx="8" fill="#2453e6" />
        <text x="24" y="126" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#5d6b82">${this.escapeHtml(
          String(completedStories)
        )} closed of ${this.escapeHtml(String(totalStories || 0))} stories</text>

        <text x="24" y="154" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#142033">Open Work</text>
        <rect x="24" y="168" width="472" height="16" rx="8" fill="#e8eef7" />
        <rect x="24" y="168" width="${(472 * openWidth) / 100}" height="16" rx="8" fill="#94a3b8" />
        <text x="24" y="202" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#5d6b82">${this.escapeHtml(
          String(pendingStories)
        )} pending | ${this.escapeHtml(String(blocked))} blocked</text>

        ${
          blockedWidth
            ? `<rect x="${24 + (472 * openWidth) / 100 - Math.min((472 * openWidth) / 100, (472 * blockedWidth) / 100)}" y="168" width="${Math.min((472 * openWidth) / 100, (472 * blockedWidth) / 100)}" height="16" rx="8" fill="#b42318" />`
            : ""
        }
      </svg>
    `;
  }

  buildStatusChartSvg(stories) {
    const statusEntries = this.buildStatusBreakdown(stories);
    const maxCount = Math.max(...statusEntries.map((entry) => entry.count), 1);
    const baseY = 54;
    const rowHeight = 34;
    const height = 64 + statusEntries.length * rowHeight;

    const rows = statusEntries
      .map((entry, index) => {
        const y = baseY + index * rowHeight;
        const width = Math.max(10, (280 * entry.count) / maxCount);
        return `
          <text x="24" y="${y}" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="#142033">${this.escapeHtml(entry.label)}</text>
          <rect x="172" y="${y - 12}" width="280" height="14" rx="7" fill="#e8eef7" />
          <rect x="172" y="${y - 12}" width="${width}" height="14" rx="7" fill="${this.getStatusColor(entry.label)}" />
          <text x="466" y="${y}" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="end" fill="#5d6b82">${this.escapeHtml(
            String(entry.count)
          )}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 520 ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Story status mix chart">
        <rect x="0" y="0" width="520" height="${height}" rx="18" fill="#f8fbff" />
        <text x="24" y="34" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#5d6b82">Status Distribution</text>
        ${rows}
      </svg>
    `;
  }

  buildTrendLineSvg({ title, data = [], valueSuffix = "%" }) {
    const points = data.length ? data : [{ label: "Current", value: 0 }];
    const width = 520;
    const height = 210;
    const paddingX = 24;
    const chartTop = 48;
    const chartHeight = 104;
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
        return `
          <circle cx="${x}" cy="${y}" r="4.5" fill="#2453e6" />
          <text x="${x}" y="${y - 12}" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#142033">${this.escapeHtml(String(point.value ?? 0))}${this.escapeHtml(valueSuffix)}</text>
          <text x="${x}" y="188" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="${index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}" fill="#5d6b82">${this.escapeHtml(point.label)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <defs>
          <linearGradient id="${this.escapeHtml(this.slugify(title))}-pdf-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(36, 83, 230, 0.24)" />
            <stop offset="100%" stop-color="rgba(36, 83, 230, 0)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#f8fbff" />
        <text x="${paddingX}" y="30" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#5d6b82">${this.escapeHtml(title)}</text>
        <line x1="${paddingX}" y1="${chartTop + chartHeight}" x2="${paddingX + chartWidth}" y2="${chartTop + chartHeight}" stroke="#dce4ef" />
        <path d="${areaPath}" fill="url(#${this.escapeHtml(this.slugify(title))}-pdf-fill)" />
        <path d="${path}" fill="none" stroke="#2453e6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        ${pointDots}
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
        const x1 = 108 + 56 * Math.cos(startAngle);
        const y1 = 110 + 56 * Math.sin(startAngle);
        const x2 = 108 + 56 * Math.cos(endAngle);
        const y2 = 110 + 56 * Math.sin(endAngle);
        const color = colors[item.tone] || colors.default;
        start = end;

        return `<path d="M ${x1} ${y1} A 56 56 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" />`;
      })
      .join("");
    const legend = items
      .map((item, index) => {
        const color = colors[item.tone] || colors.default;
        const y = 72 + index * 30;
        return `
          <circle cx="298" cy="${y}" r="6" fill="${color}" />
          <text x="314" y="${y + 4}" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#142033">${this.escapeHtml(item.label)}: ${this.escapeHtml(String(item.value || 0))}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="520" height="220" rx="18" fill="#f8fbff" />
        <text x="24" y="30" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#5d6b82">${this.escapeHtml(title)}</text>
        ${segments}
        <circle cx="108" cy="110" r="30" fill="#ffffff" />
        <text x="108" y="106" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#142033">${this.escapeHtml(String(total))}</text>
        <text x="108" y="122" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#5d6b82">items</text>
        ${legend}
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
          <text x="24" y="${y}" font-size="11" font-family="Segoe UI, Arial, sans-serif" fill="#142033">${this.escapeHtml(item.label)}</text>
          <rect x="176" y="${y - 12}" width="278" height="14" rx="7" fill="#e8eef7" />
          <rect x="176" y="${y - 12}" width="${width}" height="14" rx="7" fill="#2453e6" />
          <text x="476" y="${y}" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="end" fill="#5d6b82">${this.escapeHtml(String(item.value || 0))}${this.escapeHtml(valueSuffix)}</text>
        `;
      })
      .join("");

    return `
      <svg class="chart-svg" viewBox="0 0 520 ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${this.escapeHtml(title)}">
        <rect x="0" y="0" width="520" height="${height}" rx="18" fill="#f8fbff" />
        <text x="24" y="30" font-size="12" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#5d6b82">${this.escapeHtml(title)}</text>
        ${rows}
      </svg>
    `;
  }

  buildStatusBreakdown(stories) {
    const counts = new Map();

    for (const story of stories || []) {
      const label = String(story?.status || "To Do").trim() || "To Do";
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    if (!counts.size) {
      return [{ label: "No tracked stories", count: 0 }];
    }

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  getStatusColor(label) {
    const normalized = String(label || "").toLowerCase();

    if (normalized.includes("done")) return "#166534";
    if (normalized.includes("blocked")) return "#b42318";
    if (normalized.includes("review")) return "#7c3aed";
    if (normalized.includes("progress")) return "#2453e6";
    return "#94a3b8";
  }

  getBrandInitials(name) {
    const initials = String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    return initials || "SV";
  }

  slugify(value) {
    return String(value || "chart")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "chart";
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
      reportData.sprint.name,
      `Health: ${reportData.sprint.healthScore} (${reportData.sprint.healthLabel})`,
      "",
      reportData.sprint.aiSummary || "Summary unavailable.",
      "",
      "Insights:"
    ];

    for (const insight of reportData.insights) {
      lines.push(`- ${insight.type}/${insight.severity}: ${insight.content}`);
    }

    lines.push("", "Recommendations:");

    for (const recommendation of reportData.sprint.recommendations) {
      lines.push(`- ${recommendation}`);
    }

    return this.buildSimplePdf(lines);
  }

  buildSimplePdf(lines) {
    const width = 595;
    const height = 842;
    const left = 40;
    let y = 800;
    const content = ["BT", "/F1 11 Tf", "0.11 0.16 0.22 rg"];

    for (const rawLine of lines) {
      const fontSize = rawLine === lines[0] ? 20 : 11;
      const lineHeight = rawLine === "" ? 12 : fontSize === 20 ? 26 : 18;
      const chunks = rawLine === "" ? [""] : this.wrapPdfLine(rawLine, fontSize === 20 ? 52 : 82);

      for (const chunk of chunks) {
        if (y < 60) {
          break;
        }

        content.push(`${fontSize} Tf`);
        content.push(`1 0 0 1 ${left} ${y} Tm`);
        content.push(`(${this.escapePdfText(chunk)}) Tj`);
        y -= lineHeight;
      }

      if (y < 60) {
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
}

const pdfService = new PdfService();

module.exports = { pdfService };
