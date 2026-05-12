"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BarChart, DonutChart, SparklineChart } from "@/components/charts";
import { InsightCard, KeyValueList, MetricCard, StatusPill, Surface } from "@/components/ui";
import { apiGet } from "@/lib/api";
import {
  buildAssigneeLoad,
  buildCompletionTrendFromSprints,
  buildStoryDistribution,
  buildVelocityTrendFromSprints,
  deriveDashboardMetrics,
  formatDate,
  mapInsight
} from "@/lib/view-models";

function tabClass(active, value) {
  return `report-tab ${active === value ? "is-active" : ""}`;
}

export default function GeneratedReportPage({ params }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [state, setState] = useState({
    loading: true,
    error: "",
    payload: null,
    recentSprints: []
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const resolvedParams = await params;
        const [payload, sprintData] = await Promise.all([
          apiGet(`/report/internal/${resolvedParams.id}`),
          apiGet("/sprints?limit=7&sortBy=createdAt&sortOrder=desc").catch(() => null)
        ]);

        if (!active) return;

        setState({
          loading: false,
          error: "",
          payload,
          recentSprints: (sprintData?.items || []).map((entry) => entry.sprint).reverse()
        });
      } catch (error) {
        if (!active) return;
        setState({
          loading: false,
          error: error.message || "Unable to load report.",
          payload: null,
          recentSprints: []
        });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [params]);

  const report = state.payload?.report || null;
  const sprint = state.payload?.sprint || null;
  const project = state.payload?.project || null;
  const stories = state.payload?.stories || [];
  const insights = useMemo(() => (state.payload?.insights || []).map(mapInsight), [state.payload]);
  const metrics = deriveDashboardMetrics(sprint);
  const storyDistribution = buildStoryDistribution(stories);
  const assigneeLoad = buildAssigneeLoad(stories);
  const blockedStories = Number(sprint?.metrics?.blocked || 0);
  const topOwner = assigneeLoad[0] || null;
  const completedStories = Number(sprint?.metrics?.completed || 0);
  const completionLabel = sprint?.sprintNumber ? `S${sprint.sprintNumber}` : "Current";
  const totalStories = Number(sprint?.metrics?.totalStories || stories.length || 0);
  const completionTrend = state.recentSprints.length
    ? buildCompletionTrendFromSprints(state.recentSprints)
    : [{ label: completionLabel, value: sprint?.metrics?.completionRate || 0 }];
  const velocityTrend = state.recentSprints.length
    ? buildVelocityTrendFromSprints(state.recentSprints)
    : [{ label: completionLabel, value: sprint?.metrics?.completedStoryPoints || completedStories }];
  const heroStats = [
    {
      label: "Status",
      value: report?.status === "published" ? "Published" : "Draft",
      detail: report?.shareToken ? "Stakeholder share link available" : "Internal review surface"
    },
    {
      label: "Health",
      value: `${sprint?.healthScore || 0}/100`,
      detail: sprint?.healthLabel || "No health label available"
    },
    {
      label: "Completion",
      value: `${sprint?.metrics?.completionRate || 0}%`,
      detail: `${completedStories} of ${stories.length} stories closed`
    },
    {
      label: "AI Signals",
      value: String(insights.length),
      detail: blockedStories ? `${blockedStories} blocker-linked signals surfaced` : "No blocker-linked AI signals"
    }
  ];
  const summaryCards = [
    {
      label: "Delivery Posture",
      title: sprint?.healthLabel || "Delivery narrative pending",
      detail:
        sprint?.deliveryRisk === "high"
          ? "Escalation risk is elevated and leadership review is recommended."
          : sprint?.deliveryRisk === "medium"
            ? "Delivery risk is watchlisted and should be monitored through closeout."
            : "Delivery posture is stable for standard stakeholder reporting."
    },
    {
      label: "Ownership",
      title: topOwner ? `${topOwner.label} carries ${topOwner.value}% of scoped points` : "No ownership concentration available",
      detail: topOwner
        ? "Review ownership balance before publishing to stakeholders if concentration looks unusually high."
        : "Ownership balance appears after story assignment and point allocation are available."
    },
    {
      label: "Report Timestamp",
      title: formatDate(report?.updatedAt || report?.createdAt),
      detail: project?.name || "Unassigned project"
    }
  ];

  async function handleDownload(kind) {
    if (!report?._id) return;
    const result = await apiGet(`/report/${report._id}/${kind}`);
    const url = kind === "pdf" ? result?.pdfUrl : result?.wordUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <AppShell>
      <section className="report-studio-hero">
        <div className="report-studio-banner">
          <StatusPill tone={report?.status || "draft"}>{report?.status || "draft"}</StatusPill>
          <span>
            {project?.name || "Workspace"} / {sprint?.name || "Sprint report"}
          </span>
        </div>
        <div className="report-studio-heading">
          <div>
            <p className="eyebrow">AI Report Workspace</p>
            <h1>{sprint?.name || "Report"}</h1>
            <p className="page-description">
              {sprint?.aiSummary || "Generated sprint reporting for internal review, executive briefing, and stakeholder sharing."}
            </p>
          </div>
          <div className="page-actions">
            <button className="button-secondary" onClick={() => handleDownload("word")} disabled={!report?._id}>
              Download Word
            </button>
            <button className="button" onClick={() => handleDownload("pdf")} disabled={!report?._id}>
              Download PDF
            </button>
          </div>
        </div>
        <div className="report-hero-stat-grid">
          {heroStats.map((item) => (
            <article key={item.label} className="report-hero-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {state.error ? <div className="auth-alert">{state.error}</div> : null}

      <section className="report-executive-grid">
        <Surface title="Executive Summary" subtitle={sprint?.goal || "No sprint goal recorded."}>
          <div className="report-summary-stack">
            <div className="simple-dashboard-highlight">
              <strong>{sprint?.name || "Current sprint"}</strong>
              <p>{sprint?.aiSummary || "AI summary is still being generated for this sprint."}</p>
            </div>
            <div className="report-summary-card-grid">
              {summaryCards.map((item) => (
                <article key={item.label} className="report-summary-card">
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </Surface>

        <Surface title="Report Snapshot" subtitle="Core governance and delivery context for this report.">
          <KeyValueList
            items={[
              { label: "Project", value: project?.name || "Unassigned project" },
              { label: "Status", value: <StatusPill tone={report?.status || "draft"}>{report?.status || "draft"}</StatusPill> },
              { label: "Generated", value: formatDate(report?.updatedAt || report?.createdAt) },
              { label: "Stories", value: String(stories.length) },
              { label: "AI Signals", value: String(insights.length) },
              { label: "Blocked", value: String(blockedStories) }
            ]}
          />
          <div className="report-snapshot-metrics">
            {metrics.map((item) => (
              <MetricCard key={item.label} {...item} />
            ))}
          </div>
        </Surface>
      </section>

      <Surface
        title="Report Workspace"
        subtitle="Switch between the summary view, AI signals, and story-level delivery ledger."
        actions={
          <div className="report-tabs">
            <button className={tabClass(activeTab, "summary")} type="button" onClick={() => setActiveTab("summary")}>
              Summary
            </button>
            <button className={tabClass(activeTab, "insights")} type="button" onClick={() => setActiveTab("insights")}>
              AI Signals
            </button>
            <button className={tabClass(activeTab, "stories")} type="button" onClick={() => setActiveTab("stories")}>
              Work Ledger
            </button>
          </div>
        }
      >
        {activeTab === "summary" ? (
          <div className="report-tab-panel">
            <section className="surface-grid two-up">
              <Surface title="Leadership Recommendations" subtitle="Immediate actions surfaced by the AI reporting layer.">
                <div className="simple-insight-list">
                  {(sprint?.recommendations || []).length ? (
                    sprint.recommendations.map((item, index) => (
                      <article key={`${item}-${index}`} className="simple-insight-item">
                        <strong>Recommendation {index + 1}</strong>
                        <p>{item}</p>
                      </article>
                    ))
                  ) : (
                    <p className="page-description">No recommendations are available yet.</p>
                  )}
                </div>
              </Surface>

              <Surface title="Health Snapshot" subtitle={sprint?.healthLabel || "No health label available."}>
                <div className="report-health-card">
                  <div className="report-health-header">
                    <div className="report-health-copy">
                      <span className="report-health-kicker">Sprint Health</span>
                      <strong>{sprint?.healthLabel || "Healthy"}</strong>
                      <p>
                        {blockedStories
                          ? `${blockedStories} blocker-linked signals are shaping the current delivery posture.`
                          : "No blocker-linked signals are currently dragging the sprint posture."}
                      </p>
                    </div>
                    <div className="report-health-score">
                      <span>Health Score</span>
                      <strong>{sprint?.healthScore || 0}</strong>
                    </div>
                  </div>

                  <div className="report-health-metrics">
                    <div className="report-health-metric">
                      <span>Completion</span>
                      <strong>{sprint?.metrics?.completionRate || 0}%</strong>
                    </div>
                    <div className="report-health-metric">
                      <span>Done</span>
                      <strong>{completedStories}</strong>
                    </div>
                    <div className="report-health-metric">
                      <span>Blocked</span>
                      <strong>{blockedStories}</strong>
                    </div>
                  </div>

                  <div className="report-health-chart-grid">
                    <div className="report-health-chart-card">
                      <div className="report-health-chart-copy">
                        <strong>Completion Trend</strong>
                        <span>Current sprint progression</span>
                      </div>
                      <div className="report-health-progress">
                        <div className="report-health-progress-top">
                          <strong>{completionLabel}</strong>
                          <span>{sprint?.metrics?.completionRate || 0}%</span>
                        </div>
                        <div className="report-health-progress-track">
                          <div
                            className="report-health-progress-fill"
                            style={{ width: `${Math.max(6, Number(sprint?.metrics?.completionRate || 0))}%` }}
                          />
                        </div>
                        <div className="report-health-progress-foot">
                          <span>{completedStories} delivered</span>
                          <span>{Math.max(totalStories - completedStories, 0)} remaining</span>
                        </div>
                      </div>
                    </div>
                    <div className="report-health-chart-card">
                      <div className="report-health-chart-copy">
                        <strong>Story Distribution</strong>
                        <span>Execution mix across tracked work</span>
                      </div>
                      <div className="report-health-distribution">
                        {storyDistribution.map((item) => {
                          const share = totalStories ? Math.round((item.value / totalStories) * 100) : 0;
                          return (
                            <div key={item.label} className="report-health-distribution-row">
                              <div className="report-health-distribution-copy">
                                <strong>{item.label}</strong>
                                <span>{item.value}</span>
                              </div>
                              <div className="report-health-distribution-track">
                                <div
                                  className={`report-health-distribution-fill tone-${item.tone || "default"}`}
                                  style={{ width: `${Math.max(item.value ? 10 : 0, share)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Surface>
            </section>

            <section className="surface-grid three-up">
              <Surface title="Completion Trend" subtitle="Completion rates across recent sprints in this workspace.">
                <SparklineChart data={completionTrend} />
              </Surface>

              <Surface title="Velocity Trend" subtitle="Completed story-point throughput across recent sprints.">
                <SparklineChart data={velocityTrend} />
              </Surface>

              <Surface title="Story Distribution" subtitle="Current delivery-state mix for this sprint.">
                <DonutChart data={storyDistribution} />
              </Surface>
            </section>

            <section className="surface-grid two-up">
              <Surface title="Ownership Balance" subtitle="Current assignee distribution by story points.">
                <BarChart data={assigneeLoad} />
              </Surface>

              <Surface title="Distribution Guidance" subtitle="How this report should be used operationally.">
                <div className="report-note-card">
                  <strong>Use this view for internal and stakeholder reviews</strong>
                  <p>
                    This report is structured for sprint reviews, executive checkpoints, and client-facing delivery summaries that
                    need concise status, risks, and ownership visibility.
                  </p>
                </div>
              </Surface>
            </section>
          </div>
        ) : null}

        {activeTab === "insights" ? (
          <div className="report-tab-panel">
            <section className="surface-grid two-up">
              {insights.length ? (
                insights.map((insight) => <InsightCard key={insight.id} {...insight} />)
              ) : (
                <p className="page-description">No AI insights are available yet.</p>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "stories" ? (
          <div className="report-tab-panel">
            <Surface
              title="Work Ledger"
              subtitle="Story-level delivery context presented in a responsive layout without horizontal scrolling."
            >
              {stories.length ? (
                <div className="report-work-ledger">
                  {stories.map((story, index) => (
                    <article key={story._id || story.issueKey || index} className="report-work-row">
                      <div className="report-work-main">
                        <div className="report-work-title">
                          <strong>{story.issueKey || `Story ${index + 1}`}</strong>
                          <span>{story.name || "Untitled story"}</span>
                        </div>
                        <div className="report-work-meta">
                          <StatusPill
                            tone={
                              story.blocked ? "high" : /(done|complete|closed|resolved)/i.test(story.status || "") ? "low" : "medium"
                            }
                          >
                            {story.status || "To Do"}
                          </StatusPill>
                          <span>{story.assignee || "Unassigned"}</span>
                          <span>{story.storyPoints || 0} pts</span>
                          {story.blocked ? <span className="report-work-flag">Blocked</span> : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="page-description">No story ledger entries are available yet.</p>
              )}
            </Surface>
          </div>
        ) : null}
      </Surface>

      {report?.status === "published" && report?.shareToken ? (
        <Surface title="Public Access" subtitle="Open the published stakeholder view for this report.">
          <div className="page-actions">
            <Link href={`/report/${report.shareToken}`} className="button-secondary">
              Open Public Report
            </Link>
          </div>
        </Surface>
      ) : null}
    </AppShell>
  );
}
