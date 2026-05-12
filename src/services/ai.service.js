const { GoogleGenerativeAI } = require("@google/generative-ai");
const { env } = require("../config/env");
const { insightService } = require("./insight.service");
const { recommendationService } = require("./recommendation.service");
const { summaryService } = require("./summary.service");

class AiService {
  constructor() {
    this.client = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;
  }

  async generateSprintIntelligence({ sprint, stories }) {
    const heuristics = this.buildHeuristicPayload({ sprint, stories });

    if (!this.client) {
      return heuristics;
    }

    try {
      const model = this.client.getGenerativeModel({ model: env.geminiModel });
      const prompt = this.buildPrompt({ sprint, stories });
      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const parsed = JSON.parse(rawText);

      return {
        summary: parsed.summary || heuristics.summary,
        deliveryRisk: this.normalizeRisk(parsed.deliveryRisk) || heuristics.deliveryRisk,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : heuristics.recommendations,
        insights: Array.isArray(parsed.insights) && parsed.insights.length
          ? parsed.insights.map((item) => this.normalizeInsight(item)).filter(Boolean)
          : heuristics.insights
      };
    } catch (_error) {
      return heuristics;
    }
  }

  buildHeuristicPayload({ sprint, stories }) {
    const summary = summaryService.buildHeuristicSummary(sprint, sprint.metrics);
    const insights = insightService.buildHeuristicInsights({ sprint, metrics: sprint.metrics, stories });
    const recommendations = recommendationService.buildRecommendations({
      sprint,
      metrics: sprint.metrics,
      stories
    });

    return {
      summary,
      deliveryRisk: sprint.deliveryRisk,
      recommendations,
      insights
    };
  }

  buildPrompt({ sprint, stories }) {
    const payload = {
      sprint: {
        name: sprint.name,
        goal: sprint.goal,
        metrics: sprint.metrics,
        healthScore: sprint.healthScore,
        healthLabel: sprint.healthLabel,
        deliveryRisk: sprint.deliveryRisk
      },
      stories: stories.map((story) => ({
        key: story.issueKey,
        name: story.name,
        status: story.status,
        assignee: story.assignee,
        storyPoints: story.storyPoints,
        blocked: story.blocked
      }))
    };

    return `
You are generating sprint insights for stakeholders.
Write in clear executive language.
Return strict JSON only with keys:
summary: string
deliveryRisk: "low" | "medium" | "high"
recommendations: string[]
insights: { type: "risk" | "productivity" | "workload" | "velocity" | "recommendation", severity: "low" | "medium" | "high", content: string }[]

Requirements:
- summary must be 2 to 4 crisp sentences
- summary should mention completion, blockers, delivery posture, and next-step framing
- recommendations must be specific and action-oriented
- insight content must be concise and decision-useful

Payload:
${JSON.stringify(payload)}
`;
  }

  normalizeRisk(value) {
    if (["low", "medium", "high"].includes(value)) {
      return value;
    }
    return null;
  }

  normalizeInsight(item) {
    if (!item || typeof item.content !== "string") {
      return null;
    }

    const validType = ["risk", "productivity", "workload", "velocity", "recommendation"].includes(
      item.type
    )
      ? item.type
      : "recommendation";
    const validSeverity = ["low", "medium", "high"].includes(item.severity)
      ? item.severity
      : "medium";

    return {
      type: validType,
      severity: validSeverity,
      content: item.content
    };
  }
}

const aiService = new AiService();

module.exports = { aiService };
