const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
    },
    systemPoolBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    rewardPoolBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    totalPointsIssued: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
