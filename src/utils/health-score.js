function calculateHealthScore(metrics = {}) {
  const blocked = Number(metrics.blocked || 0);
  const pending = Number(metrics.pending || 0);
  const completed = Number(metrics.completed || 0);
  const raw = 100 - blocked * 10 - pending * 2 + completed * 1.5;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let label = "High Risk";
  if (score >= 80) {
    label = "Healthy";
  } else if (score >= 60) {
    label = "Moderate Risk";
  }

  return { score, label };
}

module.exports = { calculateHealthScore };
