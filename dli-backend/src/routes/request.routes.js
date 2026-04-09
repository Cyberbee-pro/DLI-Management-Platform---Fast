const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();
const requestController = require("../controllers/request.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

// POST /api/v1/requests
router.post(
  "/",
  verifyToken,
  [
    body("courseId")
      .exists()
      .withMessage("courseId is required")
      .isMongoId()
      .withMessage("Invalid courseId format"),
  ],
  validateRequest,
  requestController.createRequest,
);

// PATCH /api/v1/requests/:id/approve
router.patch(
  "/:id/approve",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid request ID"),
    body("action")
      .exists()
      .withMessage("Action is required")
      .isIn(["approved", "rejected"])
      .withMessage("Invalid action value (must be approved or rejected)"),
    body("adminNote").optional().isString().withMessage("Admin note must be a string"),
  ],
  validateRequest,
  requestController.approveCourseRequest,
);

module.exports = router;
