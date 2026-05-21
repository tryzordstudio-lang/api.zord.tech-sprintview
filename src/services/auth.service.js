const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { env } = require("../config/env");
const { Insight } = require("../models/insight.model");
const { Project } = require("../models/project.model");
const { Report } = require("../models/report.model");
const { Sprint } = require("../models/sprint.model");
const { Story } = require("../models/story.model");
const { User } = require("../models/user.model");
const { Workspace } = require("../models/workspace.model");
const { ApiError } = require("../utils/api-error");
const { hashToken, randomToken } = require("../utils/crypto");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken, signRefreshToken } = require("../utils/token");

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

class AuthService {
  async checkEmailAvailability(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    return {
      email: normalizedEmail,
      available: !existingUser,
      reason: existingUser ? (existingUser.passwordHash ? "email_in_use" : "provider_linked") : null
    };
  }

  async signup({ name, email, password, workspaceName }) {
    const displayName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const resolvedWorkspaceName = String(workspaceName || "").trim() || `${displayName}'s Workspace`;
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (!existingUser.passwordHash) {
        throw new ApiError(
          409,
          "SIGNUP_PROVIDER_CONFLICT",
          "This email is already linked to a sign-in provider. Use that provider to continue."
        );
      }
      throw new ApiError(409, "EMAIL_IN_USE", "Email already exists");
    }

    const passwordHash = await hashPassword(password);
    const provisionalOwnerId = new mongoose.Types.ObjectId();
    const workspace = await Workspace.create({
      name: resolvedWorkspaceName,
      ownerId: provisionalOwnerId
    });

    const user = await User.create({
      workspaceId: workspace._id,
      name: displayName,
      email: normalizedEmail,
      passwordHash,
      role: "owner"
    });

    workspace.ownerId = user._id;
    await workspace.save();

    const tokens = await this.issueTokens(user);
    return { user: this.serializeUser(user), tokens };
  }

  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    if (!user.passwordHash) {
      throw new ApiError(400, "PASSWORD_LOGIN_DISABLED", "Use your linked sign-in provider for this account");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const tokens = await this.issueTokens(user);
    return { user: this.serializeUser(user), tokens };
  }

  getGoogleConnectUrl() {
    if (!env.googleClientId || !env.googleClientSecret) {
      throw new ApiError(400, "GOOGLE_AUTH_NOT_CONFIGURED", "Google OAuth is not configured");
    }

    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleRedirectUri,
      response_type: "code",
      scope: env.googleScopes,
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state: this.buildOAuthState("google")
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback({ code, state }) {
    this.verifyOAuthState(code, state, "google");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleRedirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      throw new ApiError(400, "GOOGLE_TOKEN_EXCHANGE_FAILED", "Failed to exchange Google authorization code");
    }

    const tokenData = await tokenResponse.json();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json"
      }
    });

    if (!profileResponse.ok) {
      throw new ApiError(400, "GOOGLE_PROFILE_FAILED", "Failed to load Google profile");
    }

    const profile = await profileResponse.json();
    if (!profile.email || !profile.email_verified) {
      throw new ApiError(400, "GOOGLE_EMAIL_REQUIRED", "Google account must provide a verified email");
    }

    return this.upsertOAuthUser({
      provider: "google",
      providerId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      picture: profile.picture
    });
  }

  getAtlassianConnectUrl() {
    if (!env.atlassianClientId || !env.atlassianClientSecret) {
      throw new ApiError(400, "ATLASSIAN_AUTH_NOT_CONFIGURED", "Atlassian OAuth is not configured");
    }

    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: env.atlassianClientId,
      scope: env.atlassianAuthScopes,
      redirect_uri: env.atlassianAuthRedirectUri,
      state: this.buildOAuthState("atlassian"),
      response_type: "code",
      prompt: "consent"
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleAtlassianCallback({ code, state }) {
    this.verifyOAuthState(code, state, "atlassian");

    const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: env.atlassianClientId,
        client_secret: env.atlassianClientSecret,
        code,
        redirect_uri: env.atlassianAuthRedirectUri
      })
    });

    if (!tokenResponse.ok) {
      throw new ApiError(400, "ATLASSIAN_TOKEN_EXCHANGE_FAILED", "Failed to exchange Atlassian authorization code");
    }

    const tokenData = await tokenResponse.json();
    const profileResponse = await fetch("https://api.atlassian.com/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json"
      }
    });

    if (!profileResponse.ok) {
      throw new ApiError(400, "ATLASSIAN_PROFILE_FAILED", "Failed to load Atlassian profile");
    }

    const profile = await profileResponse.json();
    const email = profile.mail || profile.email;
    if (!email) {
      throw new ApiError(
        400,
        "ATLASSIAN_EMAIL_REQUIRED",
        "Atlassian account must expose an email address for sign-in"
      );
    }

    return this.upsertOAuthUser({
      provider: "atlassian",
      providerId: profile.account_id,
      email,
      name: profile.name || profile.nickname || email.split("@")[0],
      picture: profile.picture
    });
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(401, "MISSING_REFRESH_TOKEN", "Refresh token is required");
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch (_error) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");
    }

    const tokenHash = hashToken(refreshToken);
    const tokenRecord = user.refreshTokens.find((item) => item.tokenHash === tokenHash);

    if (!tokenRecord || tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token has expired");
    }

    user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== tokenHash);
    await user.save();

    const tokens = await this.issueTokens(user);
    return { user: this.serializeUser(user), tokens };
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    } catch (_error) {
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return;
    }

    const tokenHash = hashToken(refreshToken);
    user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== tokenHash);
    await user.save();
  }

  async requestPasswordReset({ email }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return {
        requested: true,
        previewResetUrl: null
      };
    }

    const token = randomToken(32);
    user.passwordReset = {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS)
    };
    await user.save();

    const previewResetUrl = new URL("/reset-password", env.frontendUrl);
    previewResetUrl.searchParams.set("token", token);

    return {
      requested: true,
      previewResetUrl: env.isProduction ? null : previewResetUrl.toString()
    };
  }

  async resetPassword({ token, newPassword }) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      "passwordReset.tokenHash": tokenHash
    });

    if (!user) {
      throw new ApiError(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or has expired");
    }

    const expiresAt = user.passwordReset?.expiresAt ? new Date(user.passwordReset.expiresAt) : null;
    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      user.passwordReset = {};
      await user.save();
      throw new ApiError(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or has expired");
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordReset = {};
    user.refreshTokens = [];
    await user.save();

    return { passwordReset: true };
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new ApiError(400, "CURRENT_PASSWORD_REQUIRED", "Current password is required");
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new ApiError(401, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
      }
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordReset = {};
    user.refreshTokens = [];
    await user.save();

    return { passwordUpdated: true };
  }

  async deleteAccount(userId, { password }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    if (user.passwordHash) {
      if (!password) {
        throw new ApiError(400, "PASSWORD_REQUIRED", "Password is required to delete this account");
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new ApiError(401, "INVALID_PASSWORD", "Password is incorrect");
      }
    }

    const workspaceId = user.workspaceId;

    await Promise.all([
      Report.deleteMany({ workspaceId }),
      Insight.deleteMany({ workspaceId }),
      Story.deleteMany({ workspaceId }),
      Sprint.deleteMany({ workspaceId }),
      Project.deleteMany({ workspaceId }),
      User.deleteMany({ workspaceId }),
      Workspace.deleteOne({ _id: workspaceId })
    ]);

    return { deleted: true };
  }

  async issueTokens(user) {
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      workspaceId: user.workspaceId.toString(),
      email: user.email
    });

    const refreshToken = signRefreshToken({
      userId: user._id.toString(),
      workspaceId: user.workspaceId.toString()
    });

    const decoded = jwt.decode(refreshToken);

    user.refreshTokens.push({
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000)
    });

    await user.save();

    return { accessToken, refreshToken };
  }

  serializeUser(user) {
    const authProviders = [];
    if (user.passwordHash) authProviders.push("password");
    if (user.google?.id) authProviders.push("google");
    if (user.atlassianAuth?.id) authProviders.push("atlassian");

    return {
      id: user._id.toString(),
      workspaceId: user.workspaceId.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "owner",
      jiraConnected: Boolean(user.jira?.connected),
      authProviders
    };
  }

  buildOAuthState(provider) {
    return jwt.sign({ provider, flow: "auth" }, env.jwtAccessSecret, { expiresIn: "10m" });
  }

  verifyOAuthState(code, state, provider) {
    if (!code || !state) {
      throw new ApiError(400, "INVALID_CALLBACK", "Missing OAuth code or state");
    }

    try {
      const payload = jwt.verify(state, env.jwtAccessSecret);
      if (payload.flow !== "auth" || payload.provider !== provider) {
        throw new Error("invalid_state");
      }
    } catch (_error) {
      throw new ApiError(400, "INVALID_STATE", "OAuth state is invalid or expired");
    }
  }

  async upsertOAuthUser({ provider, providerId, email, name, picture }) {
    const normalizedEmail = email.toLowerCase();
    const providerField = provider === "google" ? "google" : "atlassianAuth";
    const providerLookup = { [`${providerField}.id`]: providerId };

    const [providerUser, emailUser] = await Promise.all([
      User.findOne(providerLookup),
      User.findOne({ email: normalizedEmail })
    ]);

    if (providerUser && emailUser && providerUser.id !== emailUser.id) {
      throw new ApiError(409, "OAUTH_ACCOUNT_CONFLICT", "OAuth account is already linked to another user");
    }

    let user = providerUser || emailUser;

    if (!user) {
      const provisionalOwnerId = new mongoose.Types.ObjectId();
      const workspace = await Workspace.create({
        name: `${name}'s Workspace`,
        ownerId: provisionalOwnerId
      });

      user = await User.create({
        workspaceId: workspace._id,
        name,
        email: normalizedEmail,
        role: "owner",
        [providerField]: {
          id: providerId,
          picture
        }
      });

      workspace.ownerId = user._id;
      await workspace.save();
    } else {
      user.name = user.name || name;
      user[providerField] = {
        ...(user[providerField] || {}),
        id: providerId,
        picture
      };
      await user.save();
    }

    const tokens = await this.issueTokens(user);
    return { user: this.serializeUser(user), tokens };
  }
}

const authService = new AuthService();

module.exports = { authService };
