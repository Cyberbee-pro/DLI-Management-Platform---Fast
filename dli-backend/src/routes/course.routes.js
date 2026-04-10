const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { verifyToken, requireMember, requireAdmin } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

// GET /api/v1/courses -> verifyToken -> requireMember -> getCourses
router.get("/", verifyToken, requireMember, courseController.getCourses);

// POST /api/v1/courses -> Admin only -> Create course
router.post(
  "/",
  verifyToken,
  requireAdmin,
  [
    body("title").notEmpty().withMessage("Title is required").isString(),
    body("description").notEmpty().withMessage("Description is required").isString(),
    body("pointsRequired").isNumeric().withMessage("pointsRequired must be numeric"),
    body("imageUrl").isURL().withMessage("imageUrl must be a valid URL"),
    body("category").notEmpty().withMessage("Category is required").isString(),
    body("level")
      .notEmpty()
      .withMessage("Level is required")
      .isIn(["Beginner", "Intermediate", "Advanced"])
      .withMessage("Level must be Beginner, Intermediate, or Advanced"),
    body("provider").notEmpty().withMessage("Provider is required").isString(),
  ],
  validateRequest,
  courseController.createCourse
);

// PATCH /api/v1/courses/:id -> Admin only -> Update course
router.patch(
  "/:id",
  verifyToken,
  requireAdmin,
  [
    param("id").isMongoId().withMessage("Invalid course ID"),
    body("title").optional().isString(),
    body("description").optional().isString(),
    body("pointsRequired").optional().isNumeric(),
    body("imageUrl").optional().isURL(),
    body("category").optional().isString(),
    body("level")
      .optional()
      .isIn(["Beginner", "Intermediate", "Advanced"])
      .withMessage("Level must be Beginner, Intermediate, or Advanced"),
    body("isActive").optional().isBoolean(),
  ],
  validateRequest,
  courseController.updateCourse
);

// DELETE /api/v1/courses/:id -> Admin only -> Delete course
router.delete(
  "/:id",
  verifyToken,
  requireAdmin,
  [param("id").isMongoId().withMessage("Invalid course ID")],
  validateRequest,
  courseController.deleteCourse
);

module.exports = router;
