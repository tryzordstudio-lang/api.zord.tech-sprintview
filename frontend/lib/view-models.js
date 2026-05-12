export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function deriveDashboardMetrics(sprint) {
  const metrics = sprint?.metrics || {};

  return [
    {
      label: "Sprint Health",
      value: String(sprint?.healthScore || 0),
      unit: "/100",
      tone: sprint?.deliveryRisk === "high" ? "risk" : sprint?.deliveryRisk === "medium" ? "warning" : "healthy",
      detail: sprint?.healthLabel || "No health signal yet"
    },
    {
      label: "Completion",
      value: String(metrics.completionRate || 0),
      unit: "%",
      tone: "default",
      detail: `${metrics.completed || 0} of ${metrics.totalStories || 0} stories closed`
    },
    {
      label: "Blocked Stories",
      value: String(metrics.blocked || 0),
      unit: "",
      tone: "risk",
      detail: `${metrics.inProgress || 0} stories still active`
    },
    {
      label: "Pending Stories",
      value: String(metrics.pending || 0),
      unit: "",
      tone: "warning",
      detail: `${metrics.totalStoryPoints || 0} total story points tracked`
    }
  ];
}

export function mapInsight(insight, index = 0) {
  const categoryMap = {
    risk: "Delivery Risk",
    productivity: "Productivity Insight",
    workload: "Workload Insight",
    velocity: "Velocity Insight",
    recommendation: "Recommendation"
  };

  return {
    id: insight?._id || `insight-${index}`,
    category: categoryMap[insight?.type] || "AI Insight",
    severity: insight?.severity || "medium",
    title: categoryMap[insight?.type] || "AI Insight",
    summary: insight?.content || "No AI content available yet.",
    recommendation: insight?.content || "Review the latest sprint signal."
  };
}

export function buildStoryDistribution(stories = []) {
  const done = stories.filter((story) => /(done|complete|closed|resolved)/i.test(story.status || "")).length;
  const blocked = stories.filter((story) => story.blocked || /block/i.test(story.status || "")).length;
  const inProgress = Math.max(stories.length - done - blocked, 0);

  return [
    { label: "Done", value: done, tone: "healthy" },
    { label: "In Progress", value: inProgress, tone: "default" },
    { label: "Blocked", value: blocked, tone: "risk" }
  ];
}

export function buildAssigneeLoad(stories = []) {
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

export function buildCompletionTrendFromSprints(sprints = []) {
  return sprints.slice(0, 7).map((item, index) => ({
    label: item.sprintNumber ? `S${item.sprintNumber}` : `Sprint ${index + 1}`,
    value: item.metrics?.completionRate || 0
  }));
}

export function buildVelocityTrendFromSprints(sprints = []) {
  return sprints.slice(0, 7).map((item, index) => ({
    label: item.sprintNumber ? `S${item.sprintNumber}` : `Sprint ${index + 1}`,
    value: item.metrics?.completedStoryPoints || item.metrics?.completed || 0
  }));
}

export function deriveAnalyticsCards(sprints = []) {
  if (!sprints.length) {
    return [
      { label: "Delivery Confidence", value: "0%", detail: "No sprint data yet" },
      { label: "AI Coverage", value: "0%", detail: "No processed sprint data yet" },
      { label: "Escalation Risk", value: "0", detail: "No active high-risk sprints" }
    ];
  }

  const completionAverage = Math.round(
    sprints.reduce((sum, sprint) => sum + Number(sprint.metrics?.completionRate || 0), 0) / sprints.length
  );
  const readyCoverage = Math.round((sprints.filter((sprint) => sprint.status === "ready").length / sprints.length) * 100);
  const highRiskCount = sprints.filter((sprint) => sprint.deliveryRisk === "high").length;

  return [
    {
      label: "Delivery Confidence",
      value: `${completionAverage}%`,
      detail: "Average sprint completion rate across recent imports"
    },
    {
      label: "AI Coverage",
      value: `${readyCoverage}%`,
      detail: "Share of recent sprints with completed AI processing"
    },
    {
      label: "Escalation Risk",
      value: String(highRiskCount),
      detail: "Recent sprints currently marked high delivery risk"
    }
  ];
}

export function buildNotifications({ latestSprint, reports = [] }) {
  const notifications = [];

  if (latestSprint?.metrics?.blocked) {
    notifications.push(
      `${latestSprint.metrics.blocked} blocked stories detected in ${latestSprint.name}.`
    );
  }

  const publishedReport = reports.find((entry) => entry.report?.status === "published");
  if (publishedReport?.sprint?.name) {
    notifications.push(`Published report available for ${publishedReport.sprint.name}.`);
  }

  if (latestSprint?.status === "processing") {
    notifications.push(`AI generation is still processing for ${latestSprint.name}.`);
  }

  return notifications;
}

