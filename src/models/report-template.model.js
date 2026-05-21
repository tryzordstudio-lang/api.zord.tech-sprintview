const mongoose = require("mongoose");

const widgetPreferenceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: "" },
    page: { type: Number, default: 1 },
    size: { type: String, enum: ["small", "medium", "full"], default: "medium" },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const reportTemplateSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      trim: true,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    themeVariant: {
      type: String,
      enum: ["enterprise", "minimal", "print"],
      default: "enterprise"
    },
    templatePreset: {
      type: String,
      enum: ["executive", "health", "delivery"],
      default: "executive"
    },
    widgetLayout: {
      type: [widgetPreferenceSchema],
      default: []
    },
    scope: {
      type: String,
      enum: ["workspace", "private"],
      default: "workspace"
    }
  },
  { timestamps: true }
);

reportTemplateSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

const ReportTemplate = mongoose.model("ReportTemplate", reportTemplateSchema);

module.exports = { ReportTemplate };
