const mongoose = require("mongoose");

/**
 * Webhook schema mapping to the `webhooks` collection.
 * Handles system mappings for automated point distribution via Github activity (PR, Issue closures).
 */
const webhookSchema = new mongoose.Schema(
  {
    repoUrl: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    triggerOn: {
      type: String,
      enum: ["pr_merged", "issue_closed"],
      required: true,
    },
    pointMapping: {
      taskCategory: {
        type: String,
        default: null,
      },
      basePoints: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
      autoApprove: {
        type: Boolean,
        required: true,
        default: false, // Determines workflow automation degree.
      },
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
    },
  },
  {
    timestamps: true,
  },
);

// Rapid execution constraint guarantees unique combinations
webhookSchema.index({ repoUrl: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model("Webhook", webhookSchema);
