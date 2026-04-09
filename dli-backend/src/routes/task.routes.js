const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

// GET /api/v1/tasks
router.get("/", verifyToken, taskController.getTasks);

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
      .isIn(["Frontend", "ML", "DevOps", "Content"]),
    body("points.base").isNumeric().withMessage("points.base must be numeric"),
    body("difficulty")
      .notEmpty()
      .withMessage("Difficulty is required")
      .isIn(["beginner", "intermediate", "advanced"]),
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
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.approveTaskSubmission,
);

// PATCH /api/v1/tasks/:id/submission/reject
router.patch(
  "/:id/submission/reject",
  verifyToken,
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
  [param("id").isMongoId().withMessage("Invalid task ID")],
  validateRequest,
  taskController.approveTaskSubmission,
);

module.exports = router;
