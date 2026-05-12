const dotenv = require("dotenv");

dotenv.config();

function cleanEnvValue(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return fallback;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function parseNumber(value, fallback) {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) {
    return fallback;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTrustProxy(value) {
  const cleaned = cleanEnvValue(value);

  if (!cleaned) {
    return cleanEnvValue(process.env.NODE_ENV) === "production" ? 1 : false;
  }

  const normalized = cleaned.toLowerCase();

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
  nodeEnv: cleanEnvValue(process.env.NODE_ENV, "development"),
  isProduction: cleanEnvValue(process.env.NODE_ENV, "development") === "production",
  port: parseNumber(process.env.PORT, 4000),
  appUrl: cleanEnvValue(process.env.APP_URL, "http://localhost:4000"),
  frontendUrl: cleanEnvValue(process.env.FRONTEND_URL, "http://localhost:3000"),
  mongodbUri: cleanEnvValue(process.env.MONGODB_URI),
  mongodbScheme: cleanEnvValue(process.env.MONGODB_SCHEME, "mongodb"),
  mongodbHost: cleanEnvValue(process.env.MONGODB_HOST),
  mongodbPort: parseNumber(process.env.MONGODB_PORT, 27017),
  mongodbDatabase: cleanEnvValue(process.env.MONGODB_DATABASE),
  mongodbUsername: cleanEnvValue(process.env.MONGODB_USERNAME),
  mongodbPassword: cleanEnvValue(process.env.MONGODB_PASSWORD),
  mongodbAuthSource: cleanEnvValue(process.env.MONGODB_AUTH_SOURCE),
  jwtAccessSecret: cleanEnvValue(process.env.JWT_ACCESS_SECRET, "access-secret"),
  jwtRefreshSecret: cleanEnvValue(process.env.JWT_REFRESH_SECRET, "refresh-secret"),
  encryptionSecret: cleanEnvValue(
    process.env.ENCRYPTION_SECRET,
    "0123456789abcdef0123456789abcdef"
  ),
  cookieSecure: cleanEnvValue(process.env.COOKIE_SECURE, "false") === "true",
  cookieDomain: cleanEnvValue(process.env.COOKIE_DOMAIN) || undefined,
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 100),
  googleClientId: cleanEnvValue(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET),
  googleRedirectUri:
    cleanEnvValue(process.env.GOOGLE_REDIRECT_URI) ||
    "http://localhost:4000/api/v1/auth/oauth/google/callback",
  googleScopes: cleanEnvValue(process.env.GOOGLE_SCOPES, "openid email profile"),
  atlassianClientId: cleanEnvValue(process.env.ATLASSIAN_CLIENT_ID),
  atlassianClientSecret: cleanEnvValue(process.env.ATLASSIAN_CLIENT_SECRET),
  atlassianRedirectUri:
    cleanEnvValue(process.env.ATLASSIAN_REDIRECT_URI) || "http://localhost:4000/api/v1/jira/callback",
  atlassianScopes: cleanEnvValue(process.env.ATLASSIAN_SCOPES, "read:jira-work read:jira-user"),
  atlassianAuthRedirectUri:
    cleanEnvValue(process.env.ATLASSIAN_AUTH_REDIRECT_URI) ||
    "http://localhost:4000/api/v1/auth/oauth/atlassian/callback",
  atlassianAuthScopes: cleanEnvValue(process.env.ATLASSIAN_AUTH_SCOPES, "read:me"),
  geminiApiKey: cleanEnvValue(process.env.GEMINI_API_KEY),
  geminiModel: cleanEnvValue(process.env.GEMINI_MODEL, "gemini-1.5-flash"),
  redisUrl: cleanEnvValue(process.env.REDIS_URL),
  runInlineJobs: cleanEnvValue(process.env.RUN_INLINE_JOBS, "true") === "true",
  puppeteerExecutablePath: cleanEnvValue(process.env.PUPPETEER_EXECUTABLE_PATH),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
};

module.exports = { env };
