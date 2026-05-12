const runtimeState = {
  startedAt: new Date().toISOString(),
  status: "starting",
  databaseReady: false,
  queueReady: false,
  lastError: null
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
    updateStatus();
  },
  markQueueReady() {
    runtimeState.queueReady = true;
    runtimeState.lastError = null;
    updateStatus();
  },
  markStartupError(error) {
    runtimeState.status = "degraded";
    runtimeState.lastError = error instanceof Error ? error.message : String(error);
  }
};

module.exports = { startupState };
