const mongoose = require("mongoose");

const metricsSchema = new mongoose.Schema(
  {
    totalStories: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    blocked: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    totalStoryPoints: { type: Number, default: 0 },
    completedStoryPoints: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  },
  { _id: false }
);

const sprintSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    },
    jiraBoardId: String,
    jiraSprintId: String,
    jiraSprintName: String,
    sprintNumber: Number,
    name: { type: String, required: true },
    goal: String,
    status: {
      type: String,
      enum: ["imported", "processing", "ready", "failed"],
      default: "imported"
    },
    dateRange: {
      start: Date,
      end: Date
    },
    metrics: {
      type: metricsSchema,
      default: () => ({})
    },
    aiSummary: String,
    deliveryRisk: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    healthScore: { type: Number, default: 0 },
    healthLabel: { type: String, default: "High Risk" },
    recommendations: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

sprintSchema.index({ workspaceId: 1, createdBy: 1, createdAt: -1 });

const Sprint = mongoose.model("Sprint", sprintSchema);

module.exports = { Sprint };
