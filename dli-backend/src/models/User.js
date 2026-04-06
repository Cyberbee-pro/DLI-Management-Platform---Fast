const mongoose = require("mongoose");

/**
 * User schema mapping to the `users` collection.
 * Uses Decimal128 explicitly for all point accumulations to prevent floating-point precision loss.
 * Ext-refs to Project and Course include `ref:` attributes to enable Mongoose population safely.
 */
const userSchema = new mongoose.Schema(
  {
    srmRegNo: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      required: true,
    },
    subRoles: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
          required: true,
        },
        role: {
          type: String,
          enum: ["project_lead", "mentor"],
          required: true,
        },
      },
    ],
    points: {
      balance: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0,
      },
      totalEarned: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0,
      },
      totalSpent: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0,
      },
      negativeAccrued: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0,
      },
    },
    activeCourse: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: null,
      },
      title: {
        type: String,
        default: null,
      },
      pointsRequired: {
        type: mongoose.Schema.Types.Decimal128,
        default: null,
      },
    },
    rank: {
      type: String,
      enum: ["Rookie", "Contributor", "Expert", "Elite"],
      required: true,
      default: "Rookie",
    },
    coursesCompletedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    isBanned: {
      type: Boolean,
      required: true,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      required: true,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    notificationPrefs: {
      email: {
        type: Boolean,
        required: true,
        default: true,
      },
      discord: {
        type: Boolean,
        required: true,
        default: false,
      },
      slack: {
        type: Boolean,
        required: true,
        default: false,
      },
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  },
);

// Indexes defined exactly as per Schema.md specification for performance tuning
userSchema.index({ srmRegNo: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ "points.balance": -1 });
userSchema.index({ "subRoles.projectId": 1 });

module.exports = mongoose.model("User", userSchema);
