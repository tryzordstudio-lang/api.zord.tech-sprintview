const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["risk", "productivity", "workload", "velocity", "recommendation"],
      required: true
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    content: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

insightSchema.index({ workspaceId: 1, sprintId: 1 });

const Insight = mongoose.model("Insight", insightSchema);

module.exports = { Insight };
