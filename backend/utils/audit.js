const AuditLog = require("../models/AuditLog");

// Fire-and-forget: a failed log write must never break the real request.
module.exports = (req, action, target, detail) =>
  AuditLog.create({
    actor: req.user.id,
    actorRole: req.user.role,
    action,
    target: target ? String(target) : undefined,
    detail,
  }).catch((err) => console.error("Audit log failed:", err.message));
