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

const reportPreferencesSchema = new mongoose.Schema(
  {
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
    }
  },
  { _id: false }
);

const reportSharingSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["private", "team", "public", "password"],
      default: "team"
    },
    publicSlug: {
      type: String,
      trim: true,
      default: ""
    },
    passwordHash: {
      type: String,
      default: ""
    },
    allowComments: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const reportCommentSchema = new mongoose.Schema(
  {
    authorName: {
      type: String,
      trim: true,
      default: "Anonymous"
    },
    message: {
      type: String,
      trim: true,
      required: true
    }
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

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
    title: {
      type: String,
      trim: true,
      default: ""
    },
    preferences: {
      type: reportPreferencesSchema,
      default: () => ({})
    },
    sharing: {
      type: reportSharingSchema,
      default: () => ({})
    },
    comments: {
      type: [reportCommentSchema],
      default: []
    },
    pdfUrl: String,
    htmlSnapshotUrl: String
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

module.exports = { Report };
