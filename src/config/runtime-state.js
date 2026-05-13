const runtimeState = {
  startedAt: new Date().toISOString(),
  status: "starting",
  databaseReady: false,
  queueReady: false,
  currentDependency: "database",
  lastError: null,
  lastErrorAt: null,
  retryCount: 0,
  nextRetryAt: null
};

function updateStatus() {
  runtimeState.status =
    runtimeState.databaseReady && runtimeState.queueReady ? "ready" : "starting";
}

const startupState = {
  getState() {
    return { ...runtimeState };
  },
  isReady() {
    return runtimeState.databaseReady && runtimeState.queueReady;
  },
  markDatabaseReady() {
    runtimeState.databaseReady = true;
    runtimeState.lastError = null;
    runtimeState.lastErrorAt = null;
    updateStatus();
  },
  markQueueReady() {
    runtimeState.queueReady = true;
    runtimeState.lastError = null;
    runtimeState.lastErrorAt = null;
    updateStatus();
  },
  markDependencyPending(dependency) {
    runtimeState.currentDependency = dependency || runtimeState.currentDependency;
  },
  markRetryScheduled(delayMs) {
    runtimeState.retryCount += 1;
    runtimeState.nextRetryAt = new Date(Date.now() + delayMs).toISOString();
  },
  clearRetrySchedule() {
    runtimeState.nextRetryAt = null;
  },
  markStartupError(error, dependency) {
    runtimeState.status = "degraded";
    runtimeState.currentDependency = dependency || runtimeState.currentDependency;
    runtimeState.lastError = error instanceof Error ? error.message : String(error);
    runtimeState.lastErrorAt = new Date().toISOString();
  }
};

module.exports = { startupState };
