const mongoose = require("mongoose");

/**
 * Notification schema mapping to the `notifications` collection.
 * Tracks async UI signals and webhook calls matching various platforms.
 * 30-day TTL limits storage bloat since users rarely read historical alerts.
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "DEADLINE_REMINDER",
        "HOT_BOUNTY",
        "POINTS_APPROVED",
        "TASK_TRANSFER",
        "COURSE_APPROVED",
      ],
      required: true,
    },
    channel: {
      type: String,
      enum: ["email", "discord", "slack"],
      required: true,
    },
    message: {
      type: String,
      required: true,
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
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Search query for a user's notification list filtering read states
notificationSchema.index({ userId: 1, isRead: 1 });

// MANDATORY TTL Index — Auto purge log data after exactly 30 days (2,592,000 sec)
notificationSchema.index({ sentAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("Notification", notificationSchema);
