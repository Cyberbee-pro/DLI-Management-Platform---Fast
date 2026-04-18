const express = require("express");
const { body, param } = require("express-validator");
const multer = require("multer");
const router = express.Router();
const requestController = require("../controllers/request.controller");
const adminController = require("../controllers/admin.controller");
const {
  verifyToken: authMiddleware,
  isAdminOnly,
  isModOrAdmin,
} = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

const importUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    const isCsv = file.mimetype === "text/csv" || /\.csv$/i.test(file.originalname || "");
    const isJson =
      file.mimetype === "application/json" || /\.json$/i.test(file.originalname || "");

    if (isCsv || isJson) {
      callback(null, true);
      return;
    }

    callback(new Error("Bulk import uploads must be CSV or JSON files."));
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// GET /api/v1/admin/requests
router.get(
  "/requests",
  authMiddleware,
  isAdminOnly,
  adminController.getPendingRequests
);

// GET /api/v1/admin/users
router.get(
  "/users",
  authMiddleware,
  isModOrAdmin,
  adminController.getUsersLeaderboard
);

// POST /api/v1/admin/award-points
router.post(
  "/award-points",
  [authMiddleware, isAdminOnly],
  [
    body("userIds")
      .isArray({ min: 1 })
      .withMessage("userIds must be a non-empty array."),
    body("userIds.*").isMongoId().withMessage("Each user ID must be valid."),
    body("points")
      .isFloat({ gt: 0 })
      .withMessage("points must be a valid positive number."),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("reason is required."),
  ],
  validateRequest,
  adminController.awardCustomPoints,
);

// POST /api/v1/admin/deduct-points
router.post(
  "/deduct-points",
  [authMiddleware, isAdminOnly],
  [
    body("userIds")
      .isArray({ min: 1 })
      .withMessage("userIds must be a non-empty array."),
    body("userIds.*").isMongoId().withMessage("Each user ID must be valid."),
    body("points")
      .isFloat({ gt: 0 })
      .withMessage("points must be a valid positive number."),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("reason is required."),
  ],
  validateRequest,
  adminController.deductCustomPoints,
);

// PUT /api/v1/admin/users/:id/role
router.put(
  "/users/:id/role",
  authMiddleware,
  isAdminOnly,
  [
    param("id").isMongoId().withMessage("A valid user ID is required."),
    body("role")
      .exists()
      .withMessage("role is required.")
      .isIn(["member", "moderator", "admin"])
      .withMessage("Role must be member, moderator, or admin."),
    body("designation")
      .optional({ nullable: true })
      .isString()
      .withMessage("designation must be a string."),
  ],
  validateRequest,
  adminController.updateUserRoleAndDesignation,
);

// POST /api/v1/admin/users
router.post(
  "/users",
  authMiddleware,
  isAdminOnly,
  [
    body("name", "Name is required").notEmpty().isString(),
    body("email", "Invalid email format").isEmail(),
    body("srmRegNo", "Registration number is required").notEmpty().isString(),
    body("role")
      .optional()
      .isIn(["member", "moderator", "admin"])
      .withMessage("Role must be member, moderator, or admin."),
    body("designation")
      .optional({ nullable: true })
      .isString()
      .withMessage("Designation must be a string."),
    body("password")
      .optional()
      .isString()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
  ],
  validateRequest,
  adminController.createUser
);

// GET /api/v1/admin/audit-feed
router.get(
  "/audit-feed",
  authMiddleware,
  isAdminOnly,
  adminController.getAuditFeed
);

// PATCH /api/v1/admin/requests/:id
router.patch(
  "/requests/:id",
  authMiddleware,
  isAdminOnly,
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
  authMiddleware,
  isAdminOnly,
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

// POST /api/v1/admin/bulk-users
router.post(
  "/bulk-users",
  authMiddleware,
  isAdminOnly,
  importUpload.single("file"),
  adminController.bulkImportUsers,
);

// POST /api/v1/admin/bulk-tasks
router.post(
  "/bulk-tasks",
  authMiddleware,
  isAdminOnly,
  importUpload.single("file"),
  adminController.bulkImportTasks,
);

// POST /api/v1/admin/bulk-courses
router.post(
  "/bulk-courses",
  authMiddleware,
  isAdminOnly,
  importUpload.single("file"),
  adminController.bulkImportCourses,
);

// POST /api/v1/admin/raise-query
router.post(
  "/raise-query",
  authMiddleware,
  isModOrAdmin,
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
