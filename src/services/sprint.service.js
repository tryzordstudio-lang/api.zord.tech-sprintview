const { Insight } = require("../models/insight.model");
const { Project } = require("../models/project.model");
const { Report } = require("../models/report.model");
const { Sprint } = require("../models/sprint.model");
const { Story } = require("../models/story.model");
const { logger } = require("../config/logger");
const { ApiError } = require("../utils/api-error");
const { randomToken } = require("../utils/crypto");
const { aiService } = require("./ai.service");
const { healthService } = require("./health.service");
const { jiraService } = require("./jira.service");
const { queueService } = require("./queue.service");
const { reportService } = require("./report.service");
const { JOB_NAMES } = require("../queues/job-names");

class SprintService {
  async listSprints({ workspaceId, query }) {
    const filters = { workspaceId };

    if (query.status) {
      filters.status = query.status;
    }

    if (query.deliveryRisk) {
      filters.deliveryRisk = query.deliveryRisk;
    }

    if (query.projectId) {
      filters.projectId = query.projectId;
    }

    if (query.createdFrom || query.createdTo) {
      filters.createdAt = {};
      if (query.createdFrom) {
        filters.createdAt.$gte = new Date(query.createdFrom);
      }
      if (query.createdTo) {
        filters.createdAt.$lte = new Date(query.createdTo);
      }
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, "i");
      filters.$or = [{ name: searchRegex }, { goal: searchRegex }, { jiraSprintName: searchRegex }];
    }

    const sortFieldMap = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      name: "name",
      healthScore: "healthScore",
      completionRate: "metrics.completionRate"
    };
    const sortBy = sortFieldMap[query.sortBy] || "createdAt";
    const sortDirection = query.sortOrder === "asc" ? 1 : -1;
    const skip = (query.page - 1) * query.limit;

    const [sprints, total] = await Promise.all([
      Sprint.find(filters).sort({ [sortBy]: sortDirection }).skip(skip).limit(query.limit).lean(),
      Sprint.countDocuments(filters)
    ]);

    const projectIds = [...new Set(sprints.map((item) => item.projectId).filter(Boolean).map(String))];
    const sprintIds = sprints.map((item) => item._id);

    const [projects, reports] = await Promise.all([
      projectIds.length
        ? Project.find({ _id: { $in: projectIds }, workspaceId }).lean()
        : Promise.resolve([]),
      sprintIds.length ? Report.find({ sprintId: { $in: sprintIds }, workspaceId }).lean() : Promise.resolve([])
    ]);

    const projectMap = new Map(projects.map((item) => [String(item._id), item]));
    const reportMap = new Map(reports.map((item) => [String(item.sprintId), item]));

    return {
      items: sprints.map((sprint) => ({
        sprint,
        project: sprint.projectId ? projectMap.get(String(sprint.projectId)) || null : null,
        report: reportMap.get(String(sprint._id)) || null
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total ? Math.ceil(total / query.limit) : 0
      }
    };
  }

  async importManualSprint({ workspaceId, userId, payload }) {
    const project = await this.resolveProject({
      workspaceId,
      userId,
      projectName: payload.projectName,
      projectKey: payload.projectKey,
      boardId: payload.jiraBoardId
    });

    const sprint = await Sprint.create({
      workspaceId,
      projectId: project._id,
      jiraBoardId: payload.jiraBoardId,
      name: payload.name,
      goal: payload.goal,
      sprintNumber: payload.sprintNumber,
      dateRange: payload.dateRange
        ? {
            start: payload.dateRange.start ? new Date(payload.dateRange.start) : undefined,
            end: payload.dateRange.end ? new Date(payload.dateRange.end) : undefined
          }
        : undefined,
      status: "processing",
      shareToken: randomToken(16),
      createdBy: userId
    });

    const stories = await Story.insertMany(
      payload.stories.map((story) => ({
        workspaceId,
        sprintId: sprint._id,
        issueKey: story.issueKey,
        name: story.name,
        status: story.status,
        assignee: story.assignee,
        storyPoints: story.storyPoints,
        issueType: story.issueType,
        blocked: story.blocked || false
      }))
    );

    const metrics = this.calculateMetrics(stories);
    const health = healthService.score(metrics);

    sprint.metrics = metrics;
    sprint.healthScore = health.score;
    sprint.healthLabel = health.label;
    sprint.deliveryRisk = this.computeRisk(metrics);
    await sprint.save();

    await reportService.ensureReport({
      workspaceId,
      sprintId: sprint._id,
      shareToken: sprint.shareToken
    });

    await queueService.enqueue(JOB_NAMES.GENERATE_INTELLIGENCE, {
      sprintId: sprint._id.toString(),
      workspaceId
    });

    return this.getSprintById({ sprintId: sprint._id, workspaceId });
  }

  async importJiraSprint({ workspaceId, userId, boardId, sprintId, projectName, projectKey }) {
    const sprintResponse = await jiraService.listSprints(userId, boardId);
    const sprintItem = (sprintResponse.values || []).find((item) => String(item.id) === String(sprintId));
    const issuesResponse = await jiraService.getSprintIssues(userId, sprintId);
    const issues = issuesResponse.issues || [];

    if (!sprintItem) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Jira sprint not found");
    }

    const payload = {
      projectName: projectName || "Imported Jira Project",
      projectKey,
      jiraBoardId: String(boardId),
      sprintNumber: sprintItem.sequence || undefined,
      name: sprintItem.name,
      goal: sprintItem.goal || undefined,
      dateRange: {
        start: sprintItem.startDate || undefined,
        end: sprintItem.endDate || undefined
      },
      stories: issues.map((issue) => ({
        issueKey: issue.key,
        name: issue.fields.summary,
        status: issue.fields.status?.name || "Unknown",
        assignee: issue.fields.assignee?.displayName || "Unassigned",
        storyPoints:
          issue.fields.customfield_10016 ||
          issue.fields.customfield_10020 ||
          issue.fields.storyPoints ||
          0,
        issueType: issue.fields.issuetype?.name,
        blocked: /blocked/i.test(issue.fields.status?.name || "")
      }))
    };

    const sprint = await this.importManualSprint({ workspaceId, userId, payload });
    await Sprint.findByIdAndUpdate(sprint.sprint._id, {
      jiraSprintId: String(sprintId),
      jiraSprintName: sprintItem.name
    });

    return this.getSprintById({ sprintId: sprint.sprint._id, workspaceId });
  }

  async generateIntelligence({ sprintId, workspaceId }) {
    const sprint = await Sprint.findOne({ _id: sprintId, workspaceId });
    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint not found");
    }

    const stories = await Story.find({ sprintId: sprint._id, workspaceId }).lean();
    const intelligence = await aiService.generateSprintIntelligence({
      sprint: sprint.toObject(),
      stories
    });

    sprint.aiSummary = intelligence.summary;
    sprint.deliveryRisk = intelligence.deliveryRisk;
    sprint.recommendations = intelligence.recommendations;
    sprint.status = "ready";
    await sprint.save();

    await Insight.deleteMany({ sprintId: sprint._id, workspaceId });
    if (intelligence.insights.length) {
      await Insight.insertMany(
        intelligence.insights.map((item) => ({
          workspaceId,
          sprintId: sprint._id,
          type: item.type,
          severity: item.severity,
          content: item.content
        }))
      );
    }

    const report = await reportService.ensureReport({
      workspaceId,
      sprintId: sprint._id,
      shareToken: sprint.shareToken
    });

    if (report?._id) {
      try {
        await queueService.enqueue(JOB_NAMES.GENERATE_PDF, {
          reportId: report._id.toString(),
          workspaceId
        });
      } catch (error) {
        logger.error({ err: error, sprintId: sprint._id, reportId: report._id }, "Failed to auto-generate report PDF");
      }
    }

    return this.getSprintById({ sprintId: sprint._id, workspaceId });
  }

  async retryAi({ sprintId, workspaceId }) {
    await Sprint.findOneAndUpdate({ _id: sprintId, workspaceId }, { status: "processing" });
    await queueService.enqueue(JOB_NAMES.GENERATE_INTELLIGENCE, {
      sprintId,
      workspaceId
    });

    return this.getSprintById({ sprintId, workspaceId });
  }

  async getSprintById({ sprintId, workspaceId }) {
    const sprint = await Sprint.findOne({ _id: sprintId, workspaceId }).lean();
    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint does not exist");
    }

    const [stories, insights, report, project] = await Promise.all([
      Story.find({ sprintId, workspaceId }).lean(),
      Insight.find({ sprintId, workspaceId }).sort({ createdAt: 1 }).lean(),
      Report.findOne({ sprintId, workspaceId }).lean(),
      sprint.projectId ? Project.findById(sprint.projectId).lean() : null
    ]);

    return {
      sprint,
      project,
      report,
      stories,
      insights
    };
  }

  async deleteSprint({ sprintId, workspaceId }) {
    const sprint = await Sprint.findOne({ _id: sprintId, workspaceId });
    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint does not exist");
    }

    await Promise.all([
      Story.deleteMany({ sprintId, workspaceId }),
      Insight.deleteMany({ sprintId, workspaceId }),
      Report.deleteOne({ sprintId, workspaceId }),
      Sprint.deleteOne({ _id: sprintId, workspaceId })
    ]);

    return { deleted: true };
  }

  async updateSprint({ sprintId, workspaceId, payload }) {
    const sprint = await Sprint.findOne({ _id: sprintId, workspaceId });
    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint does not exist");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      sprint.name = payload.name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "goal")) {
      sprint.goal = payload.goal || undefined;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sprintNumber")) {
      sprint.sprintNumber = payload.sprintNumber;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "dateRange")) {
      sprint.dateRange = payload.dateRange
        ? {
            start: payload.dateRange.start ? new Date(payload.dateRange.start) : undefined,
            end: payload.dateRange.end ? new Date(payload.dateRange.end) : undefined
          }
        : undefined;
    }

    await sprint.save();

    return this.getSprintById({ sprintId, workspaceId });
  }

  calculateMetrics(stories) {
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

  computeRisk(metrics) {
    if (metrics.blocked >= 3 || metrics.completionRate < 50) {
      return "high";
    }
    if (metrics.blocked > 0 || metrics.completionRate < 80) {
      return "medium";
    }
    return "low";
  }

  async resolveProject({ workspaceId, userId, projectName, projectKey, boardId }) {
    let project = await Project.findOne({
      workspaceId,
      name: projectName
    });

    if (!project) {
      project = await jiraService.resolveProject({
        workspaceId,
        createdBy: userId,
        projectName,
        projectKey,
        boardId
      });
    }

    return project;
  }
}

const sprintService = new SprintService();

module.exports = { sprintService };
