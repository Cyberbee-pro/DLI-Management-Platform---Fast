const express = require("express");
const router = express.Router();

const User = require("../models/User");
const { serializeDocument } = require("../utils/serialize");

// GET /api/v1/users
router.get("/", async (_req, res) => {
  try {
    const users = await User.find(
      {},
      "name role githubUsername linkedinUrl points.balance avatarUrl",
    )
      .sort({ "points.balance": -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: serializeDocument(users),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve nodes.",
      code: "INTERNAL_ERROR",
    });
  }
});

module.exports = router;
