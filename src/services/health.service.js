const { calculateHealthScore } = require("../utils/health-score");

class HealthService {
  score(metrics) {
    return calculateHealthScore(metrics);
  }
}

const healthService = new HealthService();

module.exports = { healthService };
