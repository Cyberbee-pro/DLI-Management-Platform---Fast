// File: src/middleware/auth.middleware.js

const jwt = require("jsonwebtoken");

/**
 * Extracts Bearer token from the Authorization header, verifies it via JWT_ACCESS_SECRET,
 * and seamlessly attaches the decoded payload to req.user.
 *
 * Centralizing validation saves each controller from implementing identical extraction logic
 * while ensuring malformed requests immediately receive 401 without processing business logic.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message:
        "Authorization token missing or malformed. Expected 'Bearer <token>'.",
      code: "INVALID_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // Payload structure mapped explicitly: { _id, role, srmRegNo, name }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
      code: "INVALID_TOKEN",
    });
  }
}

/**
 * Validates that the requesting user possesses true administrative privileges.
 * This boundary is intentionally strict and rejects any non-admin role, including moderators.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function isAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access restricted strictly to administrators.",
      code: "FORBIDDEN",
    });
  }

  next();
}

/**
 * Validates that the requester is either a moderator or an administrator.
 * This is the shared management boundary for review and governance features
 * that should remain above standard member permissions without becoming full admin-only.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function isModOrAdmin(req, res, next) {
  if (!req.user || !["admin", "moderator"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access restricted to moderators and administrators.",
      code: "FORBIDDEN",
    });
  }

  next();
}

function requireAdmin(req, res, next) {
  return isAdminOnly(req, res, next);
}

/**
 * Validates that the requesting user possesses member privileges
 * (admins also pass this boundary naturally as a superset of member rights).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireMember(req, res, next) {
  if (
    !req.user ||
    !["member", "moderator", "admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Access restricted cleanly to authenticated members, moderators, and administrators.",
      code: "FORBIDDEN",
    });
  }
  next();
}

module.exports = {
  verifyToken,
  isAdminOnly,
  isModOrAdmin,
  requireAdmin,
  requireMember,
};
