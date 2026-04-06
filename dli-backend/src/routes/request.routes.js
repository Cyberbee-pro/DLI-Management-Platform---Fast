const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const requestController = require("../controllers/request.controller");
const { verifyToken } = require("../middleware/auth.middleware");
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

module.exports = router;
