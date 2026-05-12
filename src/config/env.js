const dotenv = require("dotenv");

dotenv.config();

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === "") {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? normalized : numeric;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || "http://localhost:4000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbScheme: process.env.MONGODB_SCHEME || "mongodb",
  mongodbHost: process.env.MONGODB_HOST || "",
  mongodbPort: Number(process.env.MONGODB_PORT || 27017),
  mongodbDatabase: process.env.MONGODB_DATABASE || "",
  mongodbUsername: process.env.MONGODB_USERNAME || "",
  mongodbPassword: process.env.MONGODB_PASSWORD || "",
  mongodbAuthSource: process.env.MONGODB_AUTH_SOURCE || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
  encryptionSecret: process.env.ENCRYPTION_SECRET || "0123456789abcdef0123456789abcdef",
  cookieSecure: String(process.env.COOKIE_SECURE || "false") === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/v1/auth/oauth/google/callback",
  googleScopes: process.env.GOOGLE_SCOPES || "openid email profile",
  atlassianClientId: process.env.ATLASSIAN_CLIENT_ID || "",
  atlassianClientSecret: process.env.ATLASSIAN_CLIENT_SECRET || "",
  atlassianRedirectUri:
    process.env.ATLASSIAN_REDIRECT_URI || "http://localhost:4000/api/v1/jira/callback",
  atlassianScopes: process.env.ATLASSIAN_SCOPES || "read:jira-work read:jira-user",
  atlassianAuthRedirectUri:
    process.env.ATLASSIAN_AUTH_REDIRECT_URI || "http://localhost:4000/api/v1/auth/oauth/atlassian/callback",
  atlassianAuthScopes: process.env.ATLASSIAN_AUTH_SCOPES || "read:me",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  redisUrl: process.env.REDIS_URL || "",
  runInlineJobs: String(process.env.RUN_INLINE_JOBS || "true") === "true",
  puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
};

module.exports = { env };
