const mongoose = require("mongoose");

const brandingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    companyTagline: {
      type: String,
      trim: true,
      default: ""
    },
    logoUrl: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const notificationsSchema = new mongoose.Schema(
  {
    alertChannel: {
      type: String,
      trim: true,
      default: "email"
    },
    digestWindow: {
      type: String,
      trim: true,
      default: "monday-0900"
    }
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    branding: {
      type: brandingSchema,
      default: () => ({})
    },
    notifications: {
      type: notificationsSchema,
      default: () => ({})
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

module.exports = { Workspace };
