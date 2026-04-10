const express = require("express");
const router = express.Router();

const User = require("../models/User");
const userController = require("../controllers/user.controller");
const { verifyToken, requireMember } = require("../middleware/auth.middleware");
const { avatarUploadMemory } = require("../middleware/upload.middleware");
const { serializeDocument } = require("../utils/serialize");

// GET /api/v1/users/me
router.get("/me", verifyToken, requireMember, userController.getMe);

// PATCH /api/v1/users/me
router.patch(
  "/me",
  verifyToken,
  requireMember,
  avatarUploadMemory.fields([
    { name: "avatar", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  userController.updateMe,
);

// GET /api/v1/users
router.get("/", async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : "";

    let filter = {};
    if (search) {
      // Search by name or srmRegNo (case-insensitive)
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { srmRegNo: { $regex: search, $options: "i" } },
        ],
      };
    }

    const users = await User.find(
      filter,
      "name role githubUsername linkedinUrl instagramUrl websiteUrl resumeUrl resumeData points.balance avatarUrl srmRegNo",
    )
      .sort({ "points.balance": -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: serializeDocument(users).map((user) => ({
        ...user,
        socials: {
          github: user.githubUsername
            ? `https://github.com/${String(user.githubUsername).replace(/^@/, "")}`
            : null,
          linkedin: user.linkedinUrl ?? null,
          instagram: user.instagramUrl ?? null,
          website: user.websiteUrl ?? null,
        },
      })),
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
