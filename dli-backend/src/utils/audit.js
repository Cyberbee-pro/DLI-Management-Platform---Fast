const AuditLog = require("../models/AuditLog");

function normalizeActor(actor) {
  if (!actor) {
    return {
      _id: null,
      name: "SYSTEM",
      role: "system",
    };
  }

  if (actor._id || actor.name || actor.role) {
    return {
      _id: actor._id ?? null,
      name: actor.name ?? null,
      role: actor.role ?? null,
    };
  }

  return {
    _id: actor,
    name: null,
    role: null,
  };
}

async function createAuditLog({
  action,
  tag,
  actor,
  target = null,
  message,
  metadata = {},
  session,
}) {
  const auditLog = new AuditLog({
    action,
    tag,
    actor: normalizeActor(actor),
    target,
    message,
    metadata,
  });

  return auditLog.save(session ? { session } : undefined);
}

module.exports = {
  createAuditLog,
};
