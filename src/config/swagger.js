function buildOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Zord SprintView Backend API",
      version: "1.0.0"
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/auth/signup": { post: { summary: "Create account" } },
      "/auth/login": { post: { summary: "Login" } },
      "/auth/refresh": { post: { summary: "Rotate refresh token" } },
      "/auth/forgot-password": { post: { summary: "Request a password reset link" } },
      "/auth/reset-password": { post: { summary: "Reset password with token" } },
      "/auth/logout": { post: { summary: "Logout" } },
      "/auth/oauth/google/connect": { get: { summary: "Redirect to Google OAuth" } },
      "/auth/oauth/google/callback": { get: { summary: "Handle Google OAuth callback" } },
      "/auth/oauth/atlassian/connect": { get: { summary: "Redirect to Atlassian OAuth" } },
      "/auth/oauth/atlassian/callback": { get: { summary: "Handle Atlassian OAuth callback" } },
      "/jira/connect": { get: { summary: "Get Jira connect URL" } },
      "/jira/status": { get: { summary: "Get Jira connection status" } },
      "/jira/callback": { get: { summary: "Handle Jira OAuth callback" } },
      "/jira/boards": { get: { summary: "List Jira boards" } },
      "/jira/sprints": { get: { summary: "List Jira sprints for board" } },
      "/jira/import": { post: { summary: "Import a Jira sprint" } },
      "/sprints": { get: { summary: "List sprints with pagination and filters" } },
      "/sprints/import": { post: { summary: "Import sprint payload" } },
      "/sprints/{id}": {
        get: { summary: "Get sprint details" },
        patch: { summary: "Update sprint metadata" }
      },
      "/sprints/{id}/delete": { delete: { summary: "Delete sprint" } },
      "/sprints/{id}/retry-ai": { post: { summary: "Retry AI generation" } },
      "/report": { get: { summary: "List reports with pagination and filters" } },
      "/report/internal/{id}": { get: { summary: "Fetch internal report details" } },
      "/report/{id}/pdf": { get: { summary: "Generate or fetch report PDF" } },
      "/report/{id}/word": { get: { summary: "Generate or fetch report Word document" } },
      "/settings": {
        get: { summary: "Fetch workspace settings" },
        patch: { summary: "Update workspace settings" }
      }
    }
  };
}

module.exports = { buildOpenApiSpec };
