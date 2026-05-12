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
  res.json(successResponse(state, state.status === "ready" ? "Service healthy" : "Service starting"));
});

apiRouter.use((req, res, next) => {
  if (startupState.isReady()) {
    return next();
  }

  return res
    .status(503)
    .json(errorResponse("SERVICE_STARTING", "Service is still initializing", startupState.getState()));
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/jira", jiraRouter);
apiRouter.use("/sprints", sprintRouter);
apiRouter.use("/report", reportRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", usersRouter);

module.exports = { apiRouter };
