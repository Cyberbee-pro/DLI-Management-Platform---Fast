const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const supportController = require("../controllers/support.controller");
const { verifyToken, requireMember } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validate");

router.post(
  "/",
  verifyToken,
  requireMember,
  [
    body("type")
      .isIn(["ANOMALY_REPORTING", "ADMIN_ASSISTANCE"])
      .withMessage("type must be ANOMALY_REPORTING or ADMIN_ASSISTANCE."),
    body("subject").optional().isString().withMessage("subject must be a string."),
    body("message")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("message is required."),
    body("contactEmail")
      .optional()
      .isEmail()
      .withMessage("contactEmail must be a valid email."),
  ],
  validateRequest,
  supportController.createSupportRequest,
);

module.exports = router;
