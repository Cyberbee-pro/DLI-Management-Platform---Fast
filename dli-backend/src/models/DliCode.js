const mongoose = require("mongoose");

/**
 * DliCode schema mapping to the `dli_codes` collection.
 * Maintains actual 1-to-1 coupon codes used for deep learning real-world rewards.
 */
const dliCodeSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    isUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes mapping
dliCodeSchema.index({ code: 1 }, { unique: true });
dliCodeSchema.index({ courseId: 1, isUsed: 1 }); // Quickly fetch available codes per course

module.exports = mongoose.model("DliCode", dliCodeSchema);
