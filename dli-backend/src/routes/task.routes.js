const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();
const Task = require("../models/Task");
const taskController = require("../controllers/task.controller");
const {
  verifyToken,
  requireAdmin,
  isModOrAdmin,
} = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

async function allowTaskReviewer(req, res, next) {
  if (["admin", "moderator"].includes(req.user?.role)) {
    return isModOrAdmin(req, res, next);
  }

  const task = await Task.findById(req.params.id).select("createdBy");

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
      code: "TASK_NOT_FOUND",
    });
  }

  if (task.createdBy?._id?.toString() !== req.user?._id?.toString()) {
    return res.status(403).json({
      success: false,
      message:
        "Only moderators, administrators, or the task creator can review this deployment.",
      code: "FORBIDDEN",
    });
  }

  return next();
}

// GET /api/v1/tasks
router.get("/", verifyToken, taskController.getTasks);

// GET /api/v1/tasks/:id
router.get(
  "/:id",
  verifyToken,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.getTask,
);

// POST /api/v1/tasks
router.post(
  "/",
  verifyToken,
  requireAdmin,
  [
    body("title").notEmpty().withMessage("Title is required").isString(),
    body("description")
      .notEmpty()
      .withMessage("Description is required")
      .isString(),
    body("category")
      .notEmpty()
      .withMessage("Category is required")
      .isIn(["Frontend", "Backend", "DataBase", "AI/ML", "Research", "DevOps", "Content"]),
    body("points.base").isNumeric().withMessage("points.base must be numeric"),
    body("difficulty")
      .notEmpty()
      .withMessage("Difficulty is required")
      .isIn(["beginner", "intermediate", "advanced"]),
    body("requiresAdminApproval")
      .optional()
      .isBoolean()
      .withMessage("requiresAdminApproval must be boolean")
      .toBoolean(),
    body("requiresModApproval")
      .optional()
      .isBoolean()
      .withMessage("requiresModApproval must be boolean")
      .toBoolean(),
    body().custom((_, { req }) => {
      const requiresAdminApproval = req.body.requiresAdminApproval === true;
      const requiresModApproval = req.body.requiresModApproval !== false;

      if (!requiresAdminApproval && !requiresModApproval) {
        throw new Error(
          "At least one approval routing level (Admin or Mod) must be enabled",
        );
      }

      return true;
    }),
  ],
  validateRequest,
  taskController.createTask,
);

// POST /api/v1/tasks/:id/claim
router.post(
  "/:id/claim",
  verifyToken,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.claimTask,
);

// POST /api/v1/tasks/:id/submit
router.post(
  "/:id/submit",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Invalid task ID"),
    body("fileUrl").optional().isURL().withMessage("fileUrl must be a valid URL"),
    body("url").optional().isURL().withMessage("Must be a valid URL"),
    body("comment").optional().isString(),
  ],
  validateRequest,
  taskController.submitTask,
);

// PATCH /api/v1/tasks/:id/submission
router.patch(
  "/:id/submission",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Invalid task ID"),
    body("fileUrl").optional().isURL().withMessage("fileUrl must be a valid URL"),
    body("url").optional().isURL().withMessage("Must be a valid URL"),
    body("comment").optional().isString(),
  ],
  validateRequest,
  taskController.updateSubmission,
);

// PATCH /api/v1/tasks/:id/submission/approve
router.patch(
  "/:id/submission/approve",
  verifyToken,
  allowTaskReviewer,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.approveTaskSubmission,
);

// PATCH /api/v1/tasks/:id/submission/reject
router.patch(
  "/:id/submission/reject",
  verifyToken,
  allowTaskReviewer,
  [
    param("id").isMongoId().withMessage("Invalid task ID"),
    body("reason").optional().isString(),
  ],
  validateRequest,
  taskController.rejectTaskSubmission,
);

// POST /api/v1/tasks/:id/transfer/request
router.post(
  "/:id/transfer/request",
  verifyToken,
  [
    param("id").isMongoId().withMessage("Invalid task ID"),
    body("toUserId").optional().isMongoId().withMessage("Invalid user ID"),
  ],
  validateRequest,
  taskController.requestTransfer,
);

// PATCH /api/v1/tasks/:id/transfer/approve
router.patch(
  "/:id/transfer/approve",
  verifyToken,
  requireAdmin,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.approveTransfer,
);

// POST /api/v1/tasks/:id/transfer/accept
router.post(
  "/:id/transfer/accept",
  verifyToken,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.acceptTransfer,
);

// POST /api/v1/tasks/:id/withdraw
router.post(
  "/:id/withdraw",
  verifyToken,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.withdrawTask,
);

// PATCH /api/v1/admin/tasks/:id/approve
// Even though it uses "admin" in typical path, standardizing underneath tasks routes as requested:
// PATCH /api/v1/tasks/:id/approve
router.patch(
  "/:id/approve",
  verifyToken,
  allowTaskReviewer,
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.approveTaskSubmission,
);

module.exports = router;
