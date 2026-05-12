const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
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
      unique: true
    },
    shareToken: {
      type: String,
      required: true,
      index: true
    },
    pdfUrl: String,
    htmlSnapshotUrl: String,
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published"
    }
  },
  { timestamps: true }
);

reportSchema.index({ workspaceId: 1, shareToken: 1 });

const Report = mongoose.model("Report", reportSchema);

module.exports = { Report };
