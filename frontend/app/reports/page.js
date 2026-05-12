"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog, MetricCard, PageIntro, StatusPill, Surface } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/view-models";

function truncate(value, maxLength = 120) {
  const normalized = String(value || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

export default function ReportsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  async function load() {
    try {
      setError("");
      const result = await apiGet("/report?limit=20&sortBy=updatedAt&sortOrder=desc");
      setRows(result?.items || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load reports.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePdf(reportId) {
    const result = await apiGet(`/report/${reportId}/pdf`);
    if (result?.pdfUrl) {
      window.open(result.pdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleWord(reportId) {
    const result = await apiGet(`/report/${reportId}/word`);
    if (result?.wordUrl) {
      window.open(result.wordUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleStatusConfirm() {
    if (!statusTarget?.reportId || !statusTarget?.nextStatus) {
      return;
    }

    try {
      setStatusBusy(true);
      await apiPatch(`/report/${statusTarget.reportId}/status`, { status: statusTarget.nextStatus });
      setStatusTarget(null);
      await load();
    } finally {
      setStatusBusy(false);
    }
  }

  const publishedCount = rows.filter((row) => row.report?.status === "published").length;
  const draftCount = rows.filter((row) => row.report?.status !== "published").length;
  const averageHealth = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + Number(row.sprint?.healthScore || 0), 0) / rows.length)
    : 0;
  const attentionCount = rows.filter(
    (row) =>
      row.sprint?.deliveryRisk === "high" ||
      Number(row.sprint?.metrics?.blocked || 0) > 0 ||
      row.report?.status !== "published"
  ).length;
  const latestReport = rows[0] || null;
  const latestPublished = rows.find((row) => row.report?.status === "published") || null;
  const libraryMetrics = [
    {
      label: "Published Reports",
      value: String(publishedCount),
      detail: publishedCount ? "Stakeholder links currently active" : "No public reports available yet",
      tone: publishedCount ? "healthy" : "default"
    },
    {
      label: "Draft Reports",
      value: String(draftCount),
      detail: draftCount ? "Internal reviews waiting on publish approval" : "No reports waiting in draft",
      tone: draftCount ? "warning" : "healthy"
    },
    {
      label: "Average Health",
      value: String(averageHealth),
      unit: "/100",
      detail: rows.length ? "Cross-report delivery posture snapshot" : "No sprint health data available",
      tone: averageHealth >= 75 ? "healthy" : averageHealth >= 55 ? "warning" : "risk"
    },
    {
      label: "Attention Required",
      value: String(attentionCount),
      detail: attentionCount ? "Reports with risk, blockers, or pending publication" : "No immediate report escalations",
      tone: attentionCount ? "risk" : "healthy"
    }
  ];
  const controlCards = [
    {
      label: "Executive Narrative",
      title: latestReport?.sprint?.name || "No active sprint report",
      detail: truncate(latestReport?.sprint?.aiSummary || "AI-generated board summaries appear here after sprint analysis completes.")
    },
    {
      label: "Governance",
      title: latestPublished ? "Stakeholder distribution active" : "Internal-only review mode",
      detail: latestPublished
        ? `${latestPublished.sprint?.name || "Latest report"} is currently shareable with stakeholders.`
        : "Publish a report to expose a stakeholder link and external review surface."
    },
    {
      label: "Export Pack",
      title: rows.length ? "PDF and Word export workflow ready" : "No export pack generated yet",
      detail: rows.length
        ? "Use each report card to open, publish, and export formal reporting packs."
        : "Generated report exports appear after the first sprint report is created."
    }
  ];

  return (
    <AppShell>
      <PageIntro
        eyebrow="AI Report Studio"
        title="Reports"
        description="Modern, AI-generated sprint reporting for internal review, stakeholder distribution, and enterprise-ready export workflows."
        actions={
          <>
            {latestReport?.report?._id ? (
              <Link href={`/reports/${latestReport.report._id}`} className="button">
                Open Latest Report
              </Link>
            ) : null}
            <button className="button-secondary" onClick={load}>Refresh</button>
          </>
        }
      />

      {error ? <div className="auth-alert">{error}</div> : null}

      <section className="surface-grid metrics">
        {libraryMetrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <Surface
        title="Report Control Center"
        subtitle="AI-generated executive summaries, governance controls, and stakeholder-ready distribution in one workspace."
      >
        <div className="report-control-grid">
          <article className="report-control-hero-card">
            <span className="report-control-kicker">Board-ready reporting</span>
            <strong>Turn sprint telemetry into a clean executive reporting stream.</strong>
            <p>
              Each report converts sprint metrics, blockers, and AI signals into a concise narrative that can be reviewed
              internally, published externally, and exported as a formal reporting pack.
            </p>
            <div className="report-control-actions">
              {latestPublished?.report?.shareToken ? (
                <Link href={`/report/${latestPublished.report.shareToken}`} className="button-secondary">
                  Open Public Report
                </Link>
              ) : null}
              {latestReport?.report?._id ? (
                <Link href={`/reports/${latestReport.report._id}`} className="button-secondary">
                  Review AI Brief
                </Link>
              ) : null}
            </div>
          </article>

          <div className="report-control-side">
            <article className="report-control-side-card">
              <span className="report-control-kicker">{controlCards[0].label}</span>
              <strong>{controlCards[0].title}</strong>
              <p>{controlCards[0].detail}</p>
            </article>

            <div className="report-control-side-stack">
              {controlCards.slice(1).map((item) => (
                <article key={item.label} className="report-control-card">
                  <span className="report-control-kicker">{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <Surface title="Report Library" subtitle="Published and draft report states with clean governance-ready actions.">
        {rows.length ? (
          <div className="report-library-list">
            {rows.map((row, index) => (
              <article key={row.report?._id || `${row.sprint?.name}-${index}`} className="report-library-row">
                <div className="report-library-row-copy">
                  <div className="table-badge-row">
                    <StatusPill tone={row.report?.status || "draft"}>{row.report?.status || "draft"}</StatusPill>
                    <StatusPill tone={row.sprint?.deliveryRisk || "default"}>
                      {row.sprint?.deliveryRisk ? `${row.sprint.deliveryRisk} risk` : "signal pending"}
                    </StatusPill>
                  </div>
                  <strong>{row.sprint?.name || "Untitled sprint"}</strong>
                  <span>{row.project?.name || "No project"}</span>
                  <p className="report-summary-snippet">
                    {truncate(row.sprint?.aiSummary || "AI summary is still being generated for this report.", 96)}
                  </p>
                </div>

                <div className="report-library-strip">
                  <div className="report-library-mini">
                    <span>Generated</span>
                    <strong>{formatDate(row.report?.updatedAt || row.report?.createdAt)}</strong>
                  </div>
                  <div className="report-library-mini">
                    <span>Health</span>
                    <strong>{row.sprint?.healthScore || 0}/100</strong>
                  </div>
                  <div className="report-library-mini">
                    <span>Completion</span>
                    <strong>{row.sprint?.metrics?.completionRate || 0}%</strong>
                  </div>
                  <div className="report-library-mini">
                    <span>Stories</span>
                    <strong>{row.sprint?.metrics?.totalStories || 0}</strong>
                  </div>
                </div>

                <div className="report-library-row-actions">
                  <Link href={`/reports/${row.report?._id}`} className="table-action">
                    Open
                  </Link>
                  {row.report?.status === "published" ? (
                    <Link href={`/report/${row.report.shareToken}`} className="table-action">
                      Public View
                    </Link>
                  ) : null}
                  <button className="table-action" onClick={() => handlePdf(row.report?._id)}>
                    Export PDF
                  </button>
                  <button className="table-action" onClick={() => handleWord(row.report?._id)}>
                    Export Word
                  </button>
                  <button
                    className="table-action"
                    onClick={() =>
                      setStatusTarget({
                        reportId: row.report?._id,
                        sprintName: row.sprint?.name || "this report",
                        nextStatus: row.report?.status === "published" ? "draft" : "published"
                      })
                    }
                  >
                    {row.report?.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="simple-dashboard-empty">
            <strong>No reports yet</strong>
            <p>Create or import a sprint first to generate AI reporting and stakeholder export packs.</p>
          </div>
        )}
      </Surface>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.nextStatus === "published" ? "Publish Report" : "Move Report To Draft"}
        description={
          statusTarget
            ? statusTarget.nextStatus === "published"
              ? `Publish the report for ${statusTarget.sprintName}? Stakeholders with the share link will be able to access it.`
              : `Move the report for ${statusTarget.sprintName} back to draft? The public link will no longer be available.`
            : ""
        }
        confirmLabel={statusTarget?.nextStatus === "published" ? "Publish Report" : "Move To Draft"}
        busy={statusBusy}
        onCancel={() => !statusBusy && setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
      />
    </AppShell>
  );
}
