const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const requestController = require("../controllers/request.controller");
const adminController = require("../controllers/admin.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

// GET /api/v1/admin/requests
router.get(
  "/requests",
  verifyToken,
  requireAdmin,
  adminController.getPendingRequests
);

// GET /api/v1/admin/users
router.get(
  "/users",
  verifyToken,
  requireAdmin,
  adminController.getUsersLeaderboard
);

// GET /api/v1/admin/audit-feed
router.get(
  "/audit-feed",
  verifyToken,
  requireAdmin,
  adminController.getAuditFeed
);

// PATCH /api/v1/admin/requests/:id
router.patch(
  "/requests/:id",
  verifyToken,
  requireAdmin,
  [
    body("action")
      .exists()
      .withMessage("Action is required")
      .isIn(["approved", "rejected"])
      .withMessage("Invalid action value (must be approved or rejected)"),
    body("adminNote")
      .optional()
      .isString()
      .withMessage("Admin note must be a string"),
  ],
  validateRequest,
  requestController.approveCourseRequest
);

// POST /api/v1/admin/codes/bulk
router.post(
  "/codes/bulk",
  verifyToken,
  requireAdmin,
  [
    body("courseId")
      .exists()
      .withMessage("courseId is required")
      .isMongoId()
      .withMessage("Invalid Course ID"),
    body("codes")
      .exists()
      .withMessage("codes array is required")
      .isArray({ min: 1 })
      .withMessage("codes must be a non-empty array of strings"),
    body("codes.*").isString().withMessage("Each code must be a string"),
  ],
  validateRequest,
  adminController.bulkUploadCodes
);

// POST /api/v1/admin/raise-query
router.post(
  "/raise-query",
  verifyToken,
  requireAdmin,
  [
    body("profileFields")
      .isArray({ min: 1 })
      .withMessage("profileFields must be a non-empty array."),
    body("profileFields.*")
      .isIn(["avatarUrl", "resumeUrl", "linkedinUrl", "instagramUrl", "websiteUrl"])
      .withMessage("Invalid profile field supplied."),
    body("userIds").optional().isArray().withMessage("userIds must be an array."),
    body("userIds.*").optional().isMongoId().withMessage("Invalid user ID."),
    body("selectAllMembers")
      .optional()
      .isBoolean()
      .withMessage("selectAllMembers must be a boolean."),
  ],
  validateRequest,
  adminController.raiseProfileQuery
);

module.exports = router;
