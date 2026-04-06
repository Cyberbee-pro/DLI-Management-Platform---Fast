const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { verifyToken, requireMember } = require("../middleware/auth.middleware");

// GET /api/v1/dashboard/me -> verifyToken -> requireMember -> getMyDashboard
router.get(
  "/me",
  verifyToken,
  requireMember,
  dashboardController.getMyDashboard,
);

module.exports = router;
