"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BarChart, DonutChart, SparklineChart } from "@/components/charts";
import { MetricCard, PageIntro, Surface } from "@/components/ui";
import { apiGet } from "@/lib/api";
import {
  buildAssigneeLoad,
  buildCompletionTrendFromSprints,
  buildStoryDistribution,
  buildVelocityTrendFromSprints,
  deriveAnalyticsCards
} from "@/lib/view-models";

export default function AnalyticsPage() {
  const [state, setState] = useState({
    cards: [],
    completionTrend: [],
    velocityTrend: [],
    storyDistribution: [],
    assigneeLoad: [],
    error: ""
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const sprintData = await apiGet("/sprints?limit=12&sortBy=createdAt&sortOrder=desc");
        const sprints = (sprintData?.items || []).map((entry) => entry.sprint);
        const latestSprintId = sprints[0]?._id;
        const latestDetail = latestSprintId ? await apiGet(`/sprints/${latestSprintId}`) : null;

        if (!active) return;

        setState({
          cards: deriveAnalyticsCards(sprints),
          completionTrend: buildCompletionTrendFromSprints([...sprints].reverse()),
          velocityTrend: buildVelocityTrendFromSprints([...sprints].reverse()),
          storyDistribution: buildStoryDistribution(latestDetail?.stories || []),
          assigneeLoad: buildAssigneeLoad(latestDetail?.stories || []),
          error: ""
        });
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, error: error.message || "Unable to load analytics." }));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <PageIntro
        eyebrow="Trend Analytics"
        title="Analytics"
        description="A calm, enterprise-grade analytics layer focused on delivery confidence and sprint system behavior."
        actions={<span className="button-secondary">Live backend data</span>}
      />

      {state.error ? <div className="auth-alert">{state.error}</div> : null}

      <section className="surface-grid three-up">
        {state.cards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} unit="" detail={card.detail} />
        ))}
      </section>

      <section className="surface-grid two-up">
        <Surface title="Completion Trend" subtitle="Completion rates across recent sprints.">
          <SparklineChart data={state.completionTrend} />
        </Surface>
        <Surface title="Velocity Trend" subtitle="Completed story-point throughput across recent sprints.">
          <SparklineChart data={state.velocityTrend} />
        </Surface>
      </section>

      <section className="surface-grid two-up">
        <Surface title="Story Distribution" subtitle="Delivery state mix for the latest sprint.">
          <DonutChart data={state.storyDistribution} />
        </Surface>
        <Surface title="Assignee Workload" subtitle="Story-point ownership by engineer.">
          <BarChart data={state.assigneeLoad} />
        </Surface>
      </section>
    </AppShell>
  );
}
