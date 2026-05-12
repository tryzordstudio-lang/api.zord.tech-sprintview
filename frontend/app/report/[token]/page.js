import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { BarChart, DonutChart, SparklineChart } from "@/components/charts";
import { HealthRing, InsightCard, MetricCard, Surface, StatusPill } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { buildAssigneeLoad, buildStoryDistribution, deriveDashboardMetrics, formatDate, mapInsight } from "@/lib/view-models";

export default async function PublicReportPage({ params }) {
  const resolvedParams = await params;
  const payload = await apiGet(`/report/${resolvedParams.token}`, { credentials: "omit" });

  const report = payload?.report || null;
  const sprint = payload?.sprint || null;
  const project = payload?.project || null;
  const insights = (payload?.insights || []).map(mapInsight);
  const stories = payload?.stories || [];
  const metrics = deriveDashboardMetrics(sprint);
  const storyDistribution = buildStoryDistribution(stories);
  const assigneeLoad = buildAssigneeLoad(stories);
  const blockedStories = Number(sprint?.metrics?.blocked || 0);
  const topOwner = assigneeLoad[0] || null;
  const featuredStories = stories.slice(0, 6);
  const completionTrend = [
    {
      label: sprint?.sprintNumber ? `S${sprint.sprintNumber}` : "Current",
      value: sprint?.metrics?.completionRate || 0
    }
  ];
  const publicCards = [
    {
      label: "Executive Brief",
      title: sprint?.healthLabel || "Delivery summary pending",
      detail: sprint?.aiSummary || "No sprint summary is available yet."
    },
    {
      label: "Risk Posture",
      title: blockedStories ? `${blockedStories} blockers visible in this sprint` : "No blockers highlighted",
      detail:
        sprint?.deliveryRisk === "high"
          ? "Delivery risk is elevated and requires active stakeholder visibility."
          : sprint?.deliveryRisk === "medium"
            ? "Delivery risk is moderate and should be monitored through the sprint closeout."
            : "Delivery posture is stable based on the current AI review."
    },
    {
      label: "Ownership View",
      title: topOwner ? `${topOwner.label} owns the largest point share` : "Ownership signal unavailable",
      detail: topOwner
        ? `${topOwner.value}% of scoped points sit with the highest-loaded assignee.`
        : "Assignee balance appears once the sprint has assigned work and story points."
    }
  ];
  const heroFacts = [
    { label: "Project", value: project?.name || "Workspace" },
    { label: "Published", value: formatDate(report?.updatedAt || report?.createdAt) },
    { label: "Health", value: `${sprint?.healthScore || 0}/100` },
    { label: "Completion", value: `${sprint?.metrics?.completionRate || 0}%` }
  ];
  const snapshotStats = [
    { label: "Completion", value: `${sprint?.metrics?.completionRate || 0}%` },
    { label: "Blocked Stories", value: String(sprint?.metrics?.blocked || 0) },
    { label: "AI Signals", value: String(insights.length) },
    { label: "Work Items", value: String(stories.length) }
  ];

  return (
    <AppShell requireAuth={false} bare>
      <div className="public-report-back-row">
        <BackButton fallbackHref="/" label="Back" />
        {report?.pdfUrl ? (
          <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="button">
            Download PDF
          </a>
        ) : (
          <span className="button is-disabled">PDF Pending</span>
        )}
      </div>
      <main className="report-layout public-report-layout public-report-layout-full">
            <section id="public-overview" className="report-studio-hero public-report-hero">
              <div className="report-studio-banner public-report-banner">
                <StatusPill tone="published">Published report</StatusPill>
                <span>
                  {project?.name || "Workspace"} / {sprint?.name || "Sprint"}
                </span>
              </div>

              <div className="public-report-hero-grid">
                <div className="public-report-hero-copy">
                  <p className="eyebrow">Stakeholder Report</p>
                  <h1>{sprint?.name || "Sprint report"}</h1>
                  <p className="page-description">{sprint?.aiSummary || "No sprint summary is available yet."}</p>
                </div>

                <aside className="public-report-hero-aside">
                  <span className="public-report-fact-kicker">Report Snapshot</span>
                  <div className="public-report-fact-list">
                    {heroFacts.map((item) => (
                      <div key={item.label} className="public-report-fact-row">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="public-report-fact-note">
                    {blockedStories
                      ? `${blockedStories} blockers need active follow-up before sprint closeout.`
                      : "No blockers are currently highlighted in the published sprint snapshot."}
                  </p>
                </aside>
              </div>

              <div className="enterprise-card-grid public-report-card-grid">
                {publicCards.map((item) => (
                  <article key={item.label} className="enterprise-card public-report-summary-card">
                    <span className="enterprise-card-kicker">{item.label}</span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="public-report-overview-grid">
              <Surface
                className="public-report-health-surface"
                title="Sprint Health"
                subtitle={`Published ${formatDate(report?.updatedAt || report?.createdAt)}`}
              >
                <div className="public-report-health-layout">
                  <HealthRing score={sprint?.healthScore || 0} label={sprint?.healthLabel || "No health label available"} />
                  <div className="public-report-health-copy">
                    <strong>{sprint?.healthLabel || "No health label available"}</strong>
                    <p>
                      {sprint?.deliveryRisk === "high"
                        ? "This sprint carries elevated delivery risk and should stay visible to stakeholders until blockers move."
                        : sprint?.deliveryRisk === "medium"
                          ? "The sprint is progressing, but moderate delivery risk still warrants close follow-up."
                          : "Delivery posture is currently stable based on the published sprint signals."}
                    </p>
                    <div className="public-report-health-note">
                      <span>Lead ownership</span>
                      <strong>{topOwner ? `${topOwner.label} at ${topOwner.value}%` : "Ownership signal unavailable"}</strong>
                    </div>
                  </div>
                </div>
              </Surface>

              <Surface className="public-report-snapshot-surface" title="Executive Snapshot" subtitle="Decision-ready metrics for stakeholders.">
                <div className="report-stat-grid public-report-stat-grid">
                  {snapshotStats.map((item) => (
                    <div key={item.label} className="report-stat">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="public-report-snapshot-note">
                  <strong>{sprint?.goal || "No sprint goal recorded."}</strong>
                  <p>
                    {topOwner
                      ? `${topOwner.label} currently carries the highest story-point concentration, which may affect delivery resilience if priorities shift late.`
                      : "Ownership distribution details become clearer once assignees and story points are fully available."}
                  </p>
                </div>
              </Surface>
            </section>

            <section id="public-metrics" className="surface-grid metrics">
              {metrics.map((item) => (
                <MetricCard key={item.label} {...item} />
              ))}
            </section>

            <section id="public-insights">
              <Surface title="AI Insights" subtitle="Presentation-grade delivery intelligence for stakeholder review.">
                {insights.length ? (
                  <div className="insight-grid public-report-insight-grid">
                    {insights.map((insight) => (
                      <InsightCard key={insight.id} {...insight} />
                    ))}
                  </div>
                ) : (
                  <div className="simple-dashboard-empty public-report-empty">
                    <strong>No insight cards yet</strong>
                    <p>This published report does not currently include additional AI insight items.</p>
                  </div>
                )}
              </Surface>
            </section>

            <section id="public-charts" className="surface-grid three-up public-report-chart-grid">
              <Surface title="Completion Trend">
                <SparklineChart data={completionTrend} />
              </Surface>
              <Surface title="Story Distribution">
                <DonutChart data={storyDistribution} />
              </Surface>
              <Surface title="Assignee Load">
                <BarChart data={assigneeLoad} />
              </Surface>
            </section>

            <section id="public-work-items">
              <Surface title="Key Work Items" subtitle="Representative sprint work items for stakeholder review.">
                {featuredStories.length ? (
                  <div className="public-report-story-grid">
                    {featuredStories.map((story) => (
                      <article key={story._id || story.issueKey} className="public-report-story-card">
                        <div className="public-report-story-top">
                          <strong>{story.issueKey || "Story"}</strong>
                          <StatusPill tone={story.blocked ? "high" : /(done|complete|closed|resolved)/i.test(story.status || "") ? "low" : "medium"}>
                            {story.status}
                          </StatusPill>
                        </div>
                        <p className="public-report-story-title">{story.name}</p>
                        <div className="public-report-story-meta">
                          <div>
                            <span>Assignee</span>
                            <strong>{story.assignee || "Unassigned"}</strong>
                          </div>
                          <div>
                            <span>Points</span>
                            <strong>{story.storyPoints || 0}</strong>
                          </div>
                          <div>
                            <span>Blocked</span>
                            <strong>{story.blocked ? "Yes" : "No"}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="simple-dashboard-empty public-report-empty">
                    <strong>No work items published</strong>
                    <p>Stories will appear here once sprint work items are included in the report payload.</p>
                  </div>
                )}
              </Surface>
            </section>
      </main>
    </AppShell>
  );
}
