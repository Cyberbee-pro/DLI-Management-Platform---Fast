const mongoose = require("mongoose");

/**
 * CourseRequest schema mapping to the `courserequests` collection.
 * Holds snapshots of point balances at submission to guarantee that an admin manually approving
 * handles math precisely as viewed by the user upon request creation (solving concurrent task completion race conditions).
 */
const courseRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
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
      srmRegNo: {
        type: String,
        required: true,
      },
    },
    course: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      pointsRequired: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
      },
    },
    userBalanceAtRequest: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      required: true,
      default: "pending",
    },
    redemptionCode: {
      type: String,
      default: null,
    },
    adminNote: {
      type: String,
      default: null,
    },
    processedBy: {
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
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Optimizes the user dashboard view fetching historical course applications
courseRequestSchema.index({ "requestedBy._id": 1, status: 1 });
// Optimizes the pending queue for administrators
courseRequestSchema.index({ status: 1 });
// Optimizes analytics queries examining which courses are most highly demanded
courseRequestSchema.index({ "course._id": 1 });

module.exports = mongoose.model("CourseRequest", courseRequestSchema);
