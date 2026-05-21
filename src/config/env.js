const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const DEFAULT_ACCESS_SECRET = "access-secret";
const DEFAULT_REFRESH_SECRET = "refresh-secret";
const DEFAULT_ENCRYPTION_SECRET = "0123456789abcdef0123456789abcdef";
const PLACEHOLDER_SECRETS = new Set([
  "replace-with-long-secret",
  "replace-with-32-char-secret",
  DEFAULT_ACCESS_SECRET,
  DEFAULT_REFRESH_SECRET,
  DEFAULT_ENCRYPTION_SECRET
]);

function loadEnvFiles() {
  const rootDir = process.cwd();
  const nodeEnv = String(process.env.NODE_ENV || "development").trim() || "development";
  const candidatePaths = [
    path.join(rootDir, `.env.${nodeEnv}.local`),
    path.join(rootDir, `.env.${nodeEnv}`),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, ".env")
  ];

  for (const envPath of candidatePaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    dotenv.config({ path: envPath, override: false });
  }
}

loadEnvFiles();

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

function parseList(value) {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(",")
    .map((item) => cleanEnvValue(item))
    .filter(Boolean);
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

function validateSecrets(resolvedEnv) {
  const issues = [];
  const accessSecret = cleanEnvValue(resolvedEnv.jwtAccessSecret);
  const refreshSecret = cleanEnvValue(resolvedEnv.jwtRefreshSecret);
  const encryptionSecret = cleanEnvValue(resolvedEnv.encryptionSecret);

  if (resolvedEnv.isProduction) {
    if (!accessSecret || PLACEHOLDER_SECRETS.has(accessSecret)) {
      issues.push("JWT_ACCESS_SECRET must be set to a strong unique value in production");
    }

    if (!refreshSecret || PLACEHOLDER_SECRETS.has(refreshSecret)) {
      issues.push("JWT_REFRESH_SECRET must be set to a strong unique value in production");
    }

    if (!encryptionSecret || PLACEHOLDER_SECRETS.has(encryptionSecret)) {
      issues.push("ENCRYPTION_SECRET must be set to a strong unique value in production");
    }

    if (accessSecret && accessSecret.length < 16) {
      issues.push("JWT_ACCESS_SECRET must be at least 16 characters in production");
    }

    if (refreshSecret && refreshSecret.length < 16) {
      issues.push("JWT_REFRESH_SECRET must be at least 16 characters in production");
    }

    if (encryptionSecret && encryptionSecret.length < 32) {
      issues.push("ENCRYPTION_SECRET must be at least 32 characters in production");
    }
  }

  if (issues.length) {
    throw new Error(`Environment configuration invalid: ${issues.join("; ")}`);
  }
}

const env = {
  nodeEnv: cleanEnvValue(process.env.NODE_ENV, "development"),
  isProduction: cleanEnvValue(process.env.NODE_ENV, "development") === "production",
  port: parseNumber(process.env.PORT, 4000),
  appUrl: cleanEnvValue(process.env.APP_URL, "http://localhost:4000"),
  frontendUrl: cleanEnvValue(process.env.FRONTEND_URL, "http://localhost:3000"),
  frontendUrls: parseList(process.env.FRONTEND_URLS),
  mongodbUri: cleanEnvValue(process.env.MONGODB_URI || process.env.MONGO_URI),
  mongodbScheme: cleanEnvValue(process.env.MONGODB_SCHEME, "mongodb"),
  mongodbHost: cleanEnvValue(process.env.MONGODB_HOST),
  mongodbPort: parseNumber(process.env.MONGODB_PORT, 27017),
  mongodbDatabase: cleanEnvValue(process.env.MONGODB_DATABASE),
  mongodbUsername: cleanEnvValue(process.env.MONGODB_USERNAME),
  mongodbPassword: cleanEnvValue(process.env.MONGODB_PASSWORD),
  mongodbAuthSource: cleanEnvValue(process.env.MONGODB_AUTH_SOURCE),
  jwtAccessSecret: cleanEnvValue(process.env.JWT_ACCESS_SECRET, DEFAULT_ACCESS_SECRET),
  jwtRefreshSecret: cleanEnvValue(process.env.JWT_REFRESH_SECRET, DEFAULT_REFRESH_SECRET),
  encryptionSecret: cleanEnvValue(
    process.env.ENCRYPTION_SECRET,
    DEFAULT_ENCRYPTION_SECRET
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

validateSecrets(env);

module.exports = { env };
