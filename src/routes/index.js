const express = require("express");
const { authRouter } = require("../modules/auth/auth.routes");
const { jiraRouter } = require("../modules/jira/jira.routes");
const { sprintRouter } = require("../modules/sprint/sprint.routes");
const { reportRouter } = require("../modules/reports/report.routes");
const { settingsRouter } = require("../modules/settings/settings.routes");
const { usersRouter } = require("../modules/users/users.routes");
const { successResponse } = require("../utils/api-response");

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json(successResponse({ status: "ok" }, "Service healthy"));
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/jira", jiraRouter);
apiRouter.use("/sprints", sprintRouter);
apiRouter.use("/report", reportRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", usersRouter);

module.exports = { apiRouter };
