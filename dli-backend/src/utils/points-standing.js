const AuditLog = require("../models/AuditLog");

function toNumericDelta(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value.toString === "function") {
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function getRecentPointsStanding(
  userId,
  { session, days = 30, limit = 6 } = {},
) {
  const lookbackDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let query = AuditLog.find({
    target: userId,
    timestamp: { $gte: lookbackDate },
  })
    .sort({ timestamp: -1 })
    .limit(limit);

  if (session) {
    query = query.session(session);
  }

  const activityLogs = await query;
  const recentXpGain = activityLogs.reduce((sum, log) => {
    const pointsDelta = toNumericDelta(log.metadata?.pointsDelta);
    return pointsDelta > 0 ? sum + pointsDelta : sum;
  }, 0);

  return {
    recentXpGain,
    recentActivityCount: activityLogs.length,
    recentPointEvents: activityLogs.map((log) => ({
      action: log.action,
      pointsDelta: toNumericDelta(log.metadata?.pointsDelta),
      timestamp: log.timestamp,
    })),
  };
}

module.exports = {
  getRecentPointsStanding,
};
