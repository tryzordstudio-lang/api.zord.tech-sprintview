"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { InsightCard, PageIntro, Surface } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import { mapInsight } from "@/lib/view-models";

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [latestSprintId, setLatestSprintId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const sprints = await apiGet("/sprints?limit=4&sortBy=createdAt&sortOrder=desc");
      const entries = sprints?.items || [];
      setLatestSprintId(entries[0]?.sprint?._id || null);

      const details = await Promise.all(entries.map((entry) => apiGet(`/sprints/${entry.sprint._id}`)));
      const allInsights = details.flatMap((detail) =>
        (detail?.insights || []).map((insight, index) => ({
          ...mapInsight(insight, index),
          id: insight._id,
          title: `${detail?.sprint?.name || "Sprint"} • ${mapInsight(insight, index).category}`
        }))
      );

      setInsights(allInsights);
    } catch (loadError) {
      setError(loadError.message || "Unable to load AI insights.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRegenerate() {
    if (!latestSprintId) return;
    await apiPost(`/sprints/${latestSprintId}/retry-ai`, {});
    await load();
  }

  return (
    <AppShell>
      <PageIntro
        eyebrow="AI Insight Layer"
        title="Insights"
        description="Concentrated AI signals grouped for rapid delivery review, triage, and stakeholder action."
        actions={<button className="button" onClick={handleRegenerate}>Regenerate Insight Pack</button>}
      />

      {error ? <div className="auth-alert">{error}</div> : null}

      <Surface title="Prioritized Signals" subtitle="The highest-value recommendations across velocity, risk, and workload.">
        <div className="insight-grid">
          {insights.length ? insights.map((item) => <InsightCard key={item.id} {...item} />) : <p className="page-description">No AI insights are available yet.</p>}
        </div>
      </Surface>
    </AppShell>
  );
}
