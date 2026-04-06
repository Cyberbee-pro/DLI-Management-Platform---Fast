const mongoose = require("mongoose");

/**
 * Course schema mapping to the `courses` collection.
 * Maintains track of the real-world course inventory with an exact enum of diff levels.
 * Strict Decimal128 enforcement for point economy safety, ensuring math on redemptions doesn't drift.
 */
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    pointsRequired: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    inventoryCount: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Filtering index for frontend catalogue by active state, topic category, and difficulty level
courseSchema.index({ isActive: 1, category: 1, level: 1 });
// Sorting index to reliably return courses by points required
courseSchema.index({ pointsRequired: 1 });

module.exports = mongoose.model("Course", courseSchema);
