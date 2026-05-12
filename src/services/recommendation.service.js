class RecommendationService {
  buildRecommendations({ metrics }) {
    const recommendations = [];

    if (metrics.blocked > 0) {
      recommendations.push("Run a focused blocker triage with engineering and product leads, then assign owners to each unblock path.");
    }

    if (metrics.pending > 0) {
      recommendations.push("Reduce carry-over by splitting unfinished work into smaller next-sprint tasks with explicit acceptance criteria.");
    }

    if (metrics.completionRate < 75) {
      recommendations.push("Recalibrate sprint capacity using recent delivery velocity instead of planned scope assumptions.");
    }

    if (!recommendations.length) {
      recommendations.push("Maintain the current execution pattern and monitor cycle-time drift for early warning signals.");
    }

    return recommendations;
  }
}

const recommendationService = new RecommendationService();

module.exports = { recommendationService };
