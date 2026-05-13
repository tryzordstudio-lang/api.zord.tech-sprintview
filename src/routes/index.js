const express = require("express");
const { authRouter } = require("../modules/auth/auth.routes");
const { jiraRouter } = require("../modules/jira/jira.routes");
const { sprintRouter } = require("../modules/sprint/sprint.routes");
const { reportRouter } = require("../modules/reports/report.routes");
const { settingsRouter } = require("../modules/settings/settings.routes");
const { usersRouter } = require("../modules/users/users.routes");
const { startupState } = require("../config/runtime-state");
const { errorResponse, successResponse } = require("../utils/api-response");

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  const state = startupState.getState();
  const message =
    state.status === "ready"
      ? "Service healthy"
      : state.status === "degraded"
        ? "Service degraded"
        : "Service starting";
  res.json(successResponse(state, message));
});

apiRouter.use((req, res, next) => {
  if (startupState.isReady()) {
    return next();
  }

  const state = startupState.getState();
  const isDegraded = state.status === "degraded";

  return res
    .status(503)
    .json(
      errorResponse(
        isDegraded ? "SERVICE_DEGRADED" : "SERVICE_STARTING",
        isDegraded
          ? `Service startup dependency failed while initializing ${state.currentDependency || "dependencies"}`
          : "Service is still initializing",
        state
      )
    );
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/jira", jiraRouter);
apiRouter.use("/sprints", sprintRouter);
apiRouter.use("/report", reportRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", usersRouter);

module.exports = { apiRouter };
