// File: src/routes/auth.routes.js

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const { login, register, bootstrapAdmin } = require("../controllers/auth.controller");
const { validateRequest } = require("../middleware/validate");

/**
 * Configure rate limiter specific to the `/login` route.
 * Tightens to 10 requests per 15 minutes exclusively for authentication endpoints,
 * creating a significant barrier against automated brute-force attacks compared to generic web traffic.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});

/**
 * POST /api/v1/auth/login
 * Evaluates `email` structurally, verifies `password` existence prior to traversing logic pipelines,
 * and calls our `loginLimiter` before checking against passwords / generating tokens.
 */
router.post(
  "/login",
  loginLimiter,
  [
    body("email", "Invalid email format").isEmail(),
    body("password", "Password cannot be empty").notEmpty().isString(),
  ],
  validateRequest,
  login,
);

/**
 * POST /api/v1/auth/register
 */
router.post(
  "/register",
  [
    body("name", "Name is required").notEmpty().isString(),
    body("email", "Invalid email format").isEmail(),
    body("srmRegNo", "Registration number is required").notEmpty().isString(),
    body("password", "Password cannot be empty and must be at least 6 chars")
      .notEmpty()
      .isString()
      .isLength({ min: 6 }),
  ],
  validateRequest,
  register,
);

/**
 * POST /api/v1/auth/bootstrap-admin
 * One-shot admin creation — only works when no admin exists and BOOTSTRAP_KEY matches.
 * Call via curl, then delete BOOTSTRAP_KEY from env to permanently disable.
 */
router.post(
  "/bootstrap-admin",
  [
    body("bootstrapKey", "Bootstrap key is required").notEmpty().isString(),
    body("name", "Name is required").notEmpty().isString(),
    body("email", "Invalid email format").isEmail(),
    body("srmRegNo", "Registration number is required").notEmpty().isString(),
    body("password", "Password must be at least 6 chars")
      .notEmpty()
      .isString()
      .isLength({ min: 6 }),
  ],
  validateRequest,
  bootstrapAdmin,
);

module.exports = router;
