const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { Workspace } = require("../src/models/workspace.model");
const { User } = require("../src/models/user.model");
const { Project } = require("../src/models/project.model");
const { Sprint } = require("../src/models/sprint.model");
const { Story } = require("../src/models/story.model");
const { Insight } = require("../src/models/insight.model");
const { Report } = require("../src/models/report.model");
const { randomToken } = require("../src/utils/crypto");
const { calculateHealthScore } = require("../src/utils/health-score");
const { hashPassword } = require("../src/utils/password");

const DEMO_EMAIL = "demo@sprintview.local";
const DEMO_PASSWORD = "Demo@12345";
const DEMO_NAME = "Demo Workspace Owner";
const DEMO_WORKSPACE = "SprintView Demo Workspace";

function calculateMetrics(stories) {
  const metrics = {
    totalStories: stories.length,
    completed: 0,
    pending: 0,
    blocked: 0,
    inProgress: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    completionRate: 0
  };

  for (const story of stories) {
    const normalizedStatus = String(story.status || "").toLowerCase();
    const points = Number(story.storyPoints || 0);
    metrics.totalStoryPoints += points;

    if (story.blocked || normalizedStatus.includes("block")) {
      metrics.blocked += 1;
    }

    if (/(done|complete|closed|resolved)/.test(normalizedStatus)) {
      metrics.completed += 1;
      metrics.completedStoryPoints += points;
    } else if (/(progress|review|testing)/.test(normalizedStatus)) {
      metrics.inProgress += 1;
    } else {
      metrics.pending += 1;
    }
  }

  metrics.completionRate = metrics.totalStories
    ? Math.round((metrics.completed / metrics.totalStories) * 100)
    : 0;

  return metrics;
}

function computeRisk(metrics) {
  if (metrics.blocked >= 3 || metrics.completionRate < 50) {
    return "high";
  }
  if (metrics.blocked > 0 || metrics.completionRate < 80) {
    return "medium";
  }
  return "low";
}

function buildDemoSprints() {
  return [
    {
      projectName: "Neptune Commerce Platform",
      sprintNumber: 22,
      name: "Sprint 22 - Checkout Resilience",
      goal: "Reduce payment drop-offs before the Q2 campaign launch.",
      dateRange: {
        start: new Date("2026-04-01T00:00:00.000Z"),
        end: new Date("2026-04-14T23:59:59.000Z")
      },
      aiSummary:
        "Delivery stayed healthy through the sprint. The team closed most checkout hardening work early and used the remaining capacity for regression fixes.",
      recommendations: [
        "Keep payment retry improvements behind progressive rollout flags.",
        "Document the resolved edge cases before the next campaign sprint."
      ],
      insights: [
        {
          type: "velocity",
          severity: "low",
          content: "Velocity remained stable with strong completion across core checkout stories."
        },
        {
          type: "recommendation",
          severity: "low",
          content: "Carry the same release checklist forward because the final QA pass was efficient."
        }
      ],
      reportStatus: "published",
      createdAt: new Date("2026-04-14T10:00:00.000Z"),
      updatedAt: new Date("2026-04-14T10:00:00.000Z"),
      stories: [
        { issueKey: "NEP-221", name: "Retry card authorization on transient gateway errors", status: "Done", assignee: "Asha", storyPoints: 5, issueType: "Story", blocked: false },
        { issueKey: "NEP-222", name: "Add checkout timeout monitoring", status: "Done", assignee: "Ravi", storyPoints: 3, issueType: "Task", blocked: false },
        { issueKey: "NEP-223", name: "Harden promo-code validation", status: "Done", assignee: "Maya", storyPoints: 3, issueType: "Story", blocked: false },
        { issueKey: "NEP-224", name: "Fix duplicate order edge case", status: "In Review", assignee: "Asha", storyPoints: 2, issueType: "Bug", blocked: false },
        { issueKey: "NEP-225", name: "Clean up payment failure copy", status: "To Do", assignee: "Leo", storyPoints: 1, issueType: "Task", blocked: false }
      ]
    },
    {
      projectName: "Neptune Commerce Platform",
      sprintNumber: 23,
      name: "Sprint 23 - Fulfilment Visibility",
      goal: "Improve warehouse and support visibility into delayed shipments.",
      dateRange: {
        start: new Date("2026-04-15T00:00:00.000Z"),
        end: new Date("2026-04-28T23:59:59.000Z")
      },
      aiSummary:
        "The sprint delivered the core shipment timeline view, but two blocked integrations delayed alert automation and forced support teams to continue manual tracking.",
      recommendations: [
        "Escalate the carrier webhook dependency before the next sprint planning session.",
        "Split reporting work from live alert work so the warehouse team still gets incremental value."
      ],
      insights: [
        {
          type: "risk",
          severity: "high",
          content: "Carrier webhook work is blocked and threatens follow-on automation stories."
        },
        {
          type: "workload",
          severity: "medium",
          content: "Support-focused tasks are concentrated on one assignee, creating a response bottleneck."
        },
        {
          type: "recommendation",
          severity: "medium",
          content: "Move alert automation behind a feature flag and release the timeline dashboard first."
        }
      ],
      reportStatus: "draft",
      createdAt: new Date("2026-04-28T10:00:00.000Z"),
      updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      stories: [
        { issueKey: "NEP-231", name: "Build shipment timeline UI", status: "Done", assignee: "Maya", storyPoints: 5, issueType: "Story", blocked: false },
        { issueKey: "NEP-232", name: "Map warehouse handoff statuses", status: "Done", assignee: "Ravi", storyPoints: 3, issueType: "Task", blocked: false },
        { issueKey: "NEP-233", name: "Wire carrier webhook retry flow", status: "Blocked", assignee: "Asha", storyPoints: 5, issueType: "Story", blocked: true },
        { issueKey: "NEP-234", name: "Send delayed shipment Slack alerts", status: "In Progress", assignee: "Asha", storyPoints: 3, issueType: "Task", blocked: false },
        { issueKey: "NEP-235", name: "Add support dashboard filters", status: "To Do", assignee: "Leo", storyPoints: 2, issueType: "Story", blocked: false },
        { issueKey: "NEP-236", name: "Backfill shipment anomaly report", status: "Blocked", assignee: "Priya", storyPoints: 3, issueType: "Task", blocked: true }
      ]
    },
    {
      projectName: "Neptune Commerce Platform",
      sprintNumber: 24,
      name: "Sprint 24 - Executive Reporting",
      goal: "Prepare a clean delivery and margin narrative for the May steering review.",
      dateRange: {
        start: new Date("2026-04-29T00:00:00.000Z"),
        end: new Date("2026-05-12T23:59:59.000Z")
      },
      aiSummary:
        "The team is close to the steering review target, but reporting work is unevenly distributed and one blocked finance dependency is keeping the sprint at medium risk.",
      recommendations: [
        "Resolve finance data ownership before the next report refresh cycle.",
        "Shift one dashboard story from Priya to Ravi to reduce single-owner risk."
      ],
      insights: [
        {
          type: "productivity",
          severity: "medium",
          content: "Core reporting output is on track, but progress slowed after the finance dataset dependency surfaced."
        },
        {
          type: "risk",
          severity: "medium",
          content: "Margin variance work is blocked on upstream finance exports and could affect steering review accuracy."
        },
        {
          type: "recommendation",
          severity: "medium",
          content: "Freeze non-essential visual polish and focus the team on data quality and executive summary clarity."
        }
      ],
      reportStatus: "published",
      createdAt: new Date("2026-05-12T09:00:00.000Z"),
      updatedAt: new Date("2026-05-12T09:00:00.000Z"),
      stories: [
        { issueKey: "NEP-241", name: "Build margin variance summary card", status: "Done", assignee: "Priya", storyPoints: 5, issueType: "Story", blocked: false },
        { issueKey: "NEP-242", name: "Create executive KPI comparison chart", status: "Done", assignee: "Ravi", storyPoints: 3, issueType: "Story", blocked: false },
        { issueKey: "NEP-243", name: "Validate finance source mapping", status: "Blocked", assignee: "Priya", storyPoints: 5, issueType: "Task", blocked: true },
        { issueKey: "NEP-244", name: "Draft steering review narrative", status: "In Progress", assignee: "Maya", storyPoints: 3, issueType: "Task", blocked: false },
        { issueKey: "NEP-245", name: "Polish report export layout", status: "In Review", assignee: "Leo", storyPoints: 2, issueType: "Task", blocked: false },
        { issueKey: "NEP-246", name: "Add trend footnotes for leadership deck", status: "To Do", assignee: "Asha", storyPoints: 1, issueType: "Task", blocked: false }
      ]
    }
  ];
}

async function ensureDemoUser() {
  let user = await User.findOne({ email: DEMO_EMAIL });
  let workspace = user ? await Workspace.findById(user.workspaceId) : null;

  if (!workspace) {
    workspace = await Workspace.create({
      name: DEMO_WORKSPACE,
      ownerId: new mongoose.Types.ObjectId()
    });
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  if (!user) {
    user = await User.create({
      workspaceId: workspace._id,
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash
    });
  } else {
    user.workspaceId = workspace._id;
    user.name = DEMO_NAME;
    user.passwordHash = passwordHash;
    user.refreshTokens = [];
    await user.save();
  }

  workspace.name = DEMO_WORKSPACE;
  workspace.ownerId = user._id;
  await workspace.save();

  return { user, workspace };
}

async function reseedWorkspace(workspaceId, userId) {
  await Promise.all([
    Insight.deleteMany({ workspaceId }),
    Story.deleteMany({ workspaceId }),
    Report.deleteMany({ workspaceId }),
    Sprint.deleteMany({ workspaceId }),
    Project.deleteMany({ workspaceId })
  ]);

  const sprints = buildDemoSprints();
  const createdProjectNames = new Map();

  for (const sprintSeed of sprints) {
    let project = createdProjectNames.get(sprintSeed.projectName);
    if (!project) {
      project = await Project.create({
        workspaceId,
        name: sprintSeed.projectName,
        jiraProjectKey: "NEP",
        createdBy: userId,
        createdAt: sprintSeed.createdAt,
        updatedAt: sprintSeed.updatedAt
      });
      createdProjectNames.set(sprintSeed.projectName, project);
    }

    const metrics = calculateMetrics(sprintSeed.stories);
    const health = calculateHealthScore(metrics);

    const sprint = await Sprint.create({
      workspaceId,
      projectId: project._id,
      sprintNumber: sprintSeed.sprintNumber,
      name: sprintSeed.name,
      goal: sprintSeed.goal,
      status: "ready",
      dateRange: sprintSeed.dateRange,
      metrics,
      aiSummary: sprintSeed.aiSummary,
      deliveryRisk: computeRisk(metrics),
      healthScore: health.score,
      healthLabel: health.label,
      recommendations: sprintSeed.recommendations,
      shareToken: randomToken(16),
      createdBy: userId,
      createdAt: sprintSeed.createdAt,
      updatedAt: sprintSeed.updatedAt
    });

    await Story.insertMany(
      sprintSeed.stories.map((story) => ({
        workspaceId,
        sprintId: sprint._id,
        issueKey: story.issueKey,
        name: story.name,
        status: story.status,
        assignee: story.assignee,
        storyPoints: story.storyPoints,
        issueType: story.issueType,
        blocked: story.blocked,
        createdAt: sprintSeed.createdAt,
        updatedAt: sprintSeed.updatedAt
      }))
    );

    await Insight.insertMany(
      sprintSeed.insights.map((insight) => ({
        workspaceId,
        sprintId: sprint._id,
        type: insight.type,
        severity: insight.severity,
        content: insight.content,
        createdAt: sprintSeed.createdAt,
        updatedAt: sprintSeed.updatedAt
      }))
    );

    await Report.create({
      workspaceId,
      sprintId: sprint._id,
      shareToken: sprint.shareToken,
      status: sprintSeed.reportStatus,
      createdAt: sprintSeed.createdAt,
      updatedAt: sprintSeed.updatedAt
    });
  }
}

async function main() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(env.mongodbUri);

  const { user, workspace } = await ensureDemoUser();
  await reseedWorkspace(workspace._id, user._id);

  console.log("Demo account ready");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Workspace: ${DEMO_WORKSPACE}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed demo account");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
