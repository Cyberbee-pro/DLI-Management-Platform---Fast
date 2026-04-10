const mongoose = require("mongoose");

/**
 * AuditLog schema mapping to the `auditlogs` collection.
 * Maintains an immutable timeline of system events, explicitly tracking economy interactions (points).
 * An automatic 90-day TTL index runs background cleanup to ensure logs don't eat indefinite database resources.
 */
const auditLogSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      enum: [
        "AUTH",
        "CLAIM",
        "POOL",
        "PROFILE",
        "QUERY",
        "GOVERNANCE",
        "COURSE",
        "SYSTEM",
      ],
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actor: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      name: {
        type: String,
        default: null,
      },
      role: {
        type: String,
        default: null,
      },
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Search indexing
auditLogSchema.index({ target: 1, timestamp: -1 }); // Fast target timeline retrieval
auditLogSchema.index({ action: 1, timestamp: -1 }); // Drill-down metric viewing
auditLogSchema.index({ tag: 1, timestamp: -1 }); // Feed category scans
auditLogSchema.index({ timestamp: -1 }); // Global feed stream
// MANDATORY TTL Index — Automatically purges log data after exactly 90 days (7,776,000 sec)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
