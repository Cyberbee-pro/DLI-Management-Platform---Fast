const mongoose = require("mongoose");

/**
 * AuditLog schema mapping to the `auditlogs` collection.
 * Maintains an immutable timeline of system events, explicitly tracking economy interactions (points).
 * An automatic 90-day TTL index runs background cleanup to ensure logs don't eat indefinite database resources.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "POINTS_EARNED",
        "POINTS_SPENT",
        "POINTS_ISSUED",
        "PENALTY_APPLIED",
        "TASK_CLAIMED",
        "TASK_COMPLETED",
        "TASK_TRANSFER_REQUESTED",
        "TASK_TRANSFER_ACCEPTED",
        "TASK_TRANSFER_REJECTED",
        "COURSE_REQUESTED",
        "COURSE_APPROVED",
        "COURSE_REJECTED",
        "USER_CREATED",
        "ROLE_CHANGED",
        "SUBROLE_CHANGED",
        "USER_BANNED",
        "USER_UNBANNED",
        "USER_SUSPENDED",
        "USER_UNSUSPENDED",
      ],
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actor: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null, // System actions or chron will leave this null
      },
      role: {
        type: String,
        default: null,
      },
    },
    metadata: {
      taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        default: null,
      },
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: null,
      },
      courseRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseRequest",
        default: null,
      },
      webhookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Webhook",
        default: null,
      },
      pointsDelta: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
      multiplierUsed: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      previousBalance: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
      newBalance: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
      previousStatus: {
        type: String,
        default: null,
      },
      newStatus: {
        type: String,
        default: null,
      },
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
auditLogSchema.index({ timestamp: -1 }); // Global feed stream
// MANDATORY TTL Index — Automatically purges log data after exactly 90 days (7,776,000 sec)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
