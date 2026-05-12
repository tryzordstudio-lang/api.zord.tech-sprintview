const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { _id: false, timestamps: true }
);

const jiraSchema = new mongoose.Schema(
  {
    connected: { type: Boolean, default: false },
    accessToken: String,
    refreshToken: String,
    cloudId: String,
    siteName: String,
    accountId: String,
    tokenExpiresAt: Date
  },
  { _id: false }
);

const oauthProviderSchema = new mongoose.Schema(
  {
    id: String,
    picture: String
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    google: {
      type: oauthProviderSchema,
      default: () => ({})
    },
    atlassianAuth: {
      type: oauthProviderSchema,
      default: () => ({})
    },
    jira: {
      type: jiraSchema,
      default: () => ({})
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: []
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
