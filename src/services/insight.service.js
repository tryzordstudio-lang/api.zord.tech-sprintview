class InsightService {
  buildHeuristicInsights({ metrics }) {
    const insights = [];

    if (metrics.blocked > 0) {
      insights.push({
        type: "risk",
        severity: metrics.blocked >= 3 ? "high" : "medium",
        content: `${metrics.blocked} blocked stories are slowing delivery and should be escalated in the next triage.`
      });
    }

    if (metrics.completionRate < 60) {
      insights.push({
        type: "velocity",
        severity: "high",
        content: `Sprint completion is below target at ${metrics.completionRate}%, which suggests a likely carry-over risk.`
      });
    }

    if (metrics.pending > metrics.completed) {
      insights.push({
        type: "workload",
        severity: "medium",
        content: "Pending work exceeds completed work, suggesting scope pressure or slower-than-planned execution."
      });
    }

    if (!insights.length) {
      insights.push({
        type: "productivity",
        severity: "low",
        content: "Sprint execution looks stable with no major delivery-risk signals at the moment."
      });
    }

    return insights;
  }
}

const insightService = new InsightService();

module.exports = { insightService };
