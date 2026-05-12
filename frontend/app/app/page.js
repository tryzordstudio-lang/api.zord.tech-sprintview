"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MetricCard, Surface } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { deriveDashboardMetrics } from "@/lib/view-models";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    latestSprint: null,
    recentSprints: [],
    latestStories: [],
    latestInsights: [],
    reports: []
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sprintData, reportData] = await Promise.all([
          apiGet("/sprints?limit=6&sortBy=createdAt&sortOrder=desc"),
          apiGet("/report?limit=6&sortBy=updatedAt&sortOrder=desc")
        ]);

        const recentSprints = sprintData?.items || [];
        const latestSprintId = recentSprints[0]?.sprint?._id;
        const latestSprintDetail = latestSprintId ? await apiGet(`/sprints/${latestSprintId}`) : null;

        if (!active) return;

        setState({
          loading: false,
          error: "",
          latestSprint: latestSprintDetail?.sprint || null,
          recentSprints,
          latestStories: latestSprintDetail?.stories || [],
          latestInsights: latestSprintDetail?.insights || [],
          reports: reportData?.items || []
        });
      } catch (error) {
        if (!active) return;

        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Unable to load dashboard data."
        }));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const showOnboarding = searchParams.get("welcome") === "1" || !state.latestSprint;
  const onboardingSteps = [
    {
      step: "Step 1",
      title: "Set up your sprint source",
      copy: "Create a manual sprint or upload CSV/Excel data from the Sprints page to bring in your first delivery cycle.",
      actionLabel: "Open Sprints",
      href: "/sprints"
    },
    {
      step: "Step 2",
      title: "Review AI insights",
      copy: "Use the Insights view to understand blockers, delivery risk, and the strongest recommendations for the team.",
      actionLabel: "Open Insights",
      href: "/insights"
    },
    {
      step: "Step 3",
      title: "Generate and publish reports",
      copy: "Open Reports to review the generated report screen, publish stakeholder views, and export PDF or Word files.",
      actionLabel: "Open Reports",
      href: "/reports"
    }
  ];

  const dashboardMetrics = deriveDashboardMetrics(state.latestSprint);
  const publishedReports = state.reports.filter((row) => row.report?.status === "published");
  const blockedStories = Number(state.latestSprint?.metrics?.blocked || 0);
  const currentCompletion = Number(state.latestSprint?.metrics?.completionRate || 0);
  const headerStats = state.latestSprint
    ? [
        {
          label: "Active Sprint",
          value: state.latestSprint.name || "Current sprint",
          detail: state.latestSprint.goal || "No sprint goal recorded"
        },
        {
          label: "Completion",
          value: `${currentCompletion}%`,
          detail: `${state.latestSprint.metrics?.completed || 0} stories completed`
        },
        {
          label: "Blocked",
          value: String(blockedStories),
          detail: blockedStories ? "Needs follow-up before closeout" : "No active blockers detected"
        },
        {
          label: "Published Reports",
          value: String(publishedReports.length),
          detail: publishedReports.length ? "Stakeholder views available" : "No public reports active"
        }
      ]
    : [];

  return (
    <AppShell>
      <section className="dashboard-hero-shell">
        <div className="dashboard-hero-main">
          <p className="eyebrow">Executive Overview</p>
          <h1>Delivery Command Center</h1>
          <p className="dashboard-hero-description">
            {state.latestSprint
              ? `${state.latestSprint.name}${state.latestSprint.goal ? ` • ${state.latestSprint.goal}` : ""}`
              : "Create a manual sprint or connect Jira to start tracking delivery health, AI signals, and stakeholder reporting."}
          </p>
          <div className="page-actions">
            <Link href="/sprints" className="button">
              Create Sprint
            </Link>
            <Link href="/reports" className="button-secondary">
              Open Reports
            </Link>
          </div>
        </div>

        <div className="dashboard-hero-panel">
          {headerStats.length ? (
            <div className="dashboard-hero-stat-grid">
              {headerStats.map((item) => (
                <article key={item.label} className="dashboard-hero-stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-hero-empty">
              <strong>No active sprint yet</strong>
              <p>Bring in your first sprint to unlock AI insights, health metrics, and board-ready reports.</p>
            </div>
          )}
        </div>
      </section>

      {state.error ? <div className="auth-alert">{state.error}</div> : null}

      <section className="surface-grid metrics">
        {dashboardMetrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      {showOnboarding ? (
        <Surface title="Getting Started" subtitle="Use this step-by-step flow to set up your workspace and generate your first sprint report.">
          <div className="dashboard-onboarding-grid">
            {onboardingSteps.map((item) => (
              <article key={item.step} className="onboarding-step-card">
                <span className="onboarding-step-kicker">{item.step}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                <Link href={item.href} className="button-secondary onboarding-step-action">
                  {item.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </Surface>
      ) : null}

      {!state.latestSprint ? (
        <Surface title="No Sprint Data" subtitle="Start with a manual sprint or connect Jira.">
          <div className="simple-dashboard-empty">
            <strong>No sprints yet</strong>
            <p>Create a manual sprint from the Sprints page to generate dashboard metrics and reports.</p>
            <div className="page-actions">
              <Link href="/sprints" className="button">
                Create Manual Sprint
              </Link>
              <Link href="/integrations" className="button-secondary">
                Connect Jira
              </Link>
            </div>
          </div>
        </Surface>
      ) : null}
    </AppShell>
  );
}
