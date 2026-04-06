const { validationResult } = require("express-validator");

/**
 * Standardized validation middleware wrapping `express-validator`.
 * Evaluates the validation chain against `req` and short-circuits the request
 * with a 400 response if any constraints fail. Ensures controllers only process
 * sanitized data and never need to manually invoke `validationResult`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: errors.array(),
    });
  }
  next();
}

module.exports = {
  validateRequest,
};
