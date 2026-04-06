const mongoose = require("mongoose");

/**
 * Task schema mapping to the `tasks` collection (the Bounty Board).
 * Tracks the entire lifecycle of a task assignment, completion, and peer-to-peer transfer.
 * Heavy reliance on pre-computed `effective` points for exact querying without runtime math,
 * mapped strictly using the Decimal128 format to avoid FP issues.
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Frontend", "ML", "DevOps", "Content"],
      required: true,
    },
    points: {
      base: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
      },
      multiplier: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 1.0,
      },
      effective: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
      },
    },
    isHotBounty: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: ["open", "claimed", "in_review", "completed", "expired"],
      required: true,
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    githubIssueRef: {
      type: String,
      default: null,
    },
    createdBy: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      srmRegNo: {
        type: String,
        required: true,
      },
    },
    claimedBy: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      name: {
        type: String,
        default: null,
      },
      srmRegNo: {
        type: String,
        default: null,
      },
      claimedAt: {
        type: Date,
        default: null,
      },
    },
    submissionDetails: {
      url: {
        type: String,
        default: null,
      },
      comment: {
        type: String,
        default: null,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
    transferRequest: {
      proposedAssigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: null,
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      name: {
        type: String,
        default: null,
      },
    },
    penaltyApplied: {
      type: Boolean,
      required: true,
      default: false,
    },
    penaltyPoints: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes matching exact lookup needs defined in Schema.md
taskSchema.index({ status: 1 });
taskSchema.index({ "claimedBy._id": 1 }); // "My Tasks"
taskSchema.index({ isHotBounty: 1, status: 1 }); // "Hot Bounties Feed"
taskSchema.index({ deadline: 1 }); // Background expiration cron sweep
taskSchema.index({ "points.effective": -1 }); // Sorting by highest bounty
taskSchema.index({ "transferRequest.proposedAssigneeId": 1 }, { sparse: true }); // Transfer indexing
taskSchema.index({ "transferRequest.status": 1 }, { sparse: true });

module.exports = mongoose.model("Task", taskSchema);
