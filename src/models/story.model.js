const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
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
    issueKey: String,
    name: { type: String, required: true },
    status: { type: String, required: true },
    assignee: String,
    storyPoints: { type: Number, default: 0 },
    issueType: String,
    blocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

storySchema.index({ workspaceId: 1, sprintId: 1 });

const Story = mongoose.model("Story", storySchema);

module.exports = { Story };
