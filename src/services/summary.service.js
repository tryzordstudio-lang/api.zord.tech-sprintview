class SummaryService {
  buildHeuristicSummary(sprint, metrics) {
    return `${sprint.name} is ${metrics.completionRate}% complete with ${metrics.completed} of ${metrics.totalStories} stories delivered. ${metrics.blocked ? `${metrics.blocked} blocked items are still affecting confidence.` : "No active blockers are currently flagged."} Delivery risk is ${sprint.deliveryRisk} and sprint health is ${sprint.healthLabel}.`;
  }
}

const summaryService = new SummaryService();

module.exports = { summaryService };
