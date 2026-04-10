const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const { verifyToken, requireMember } = require("../middleware/auth.middleware");

router.get("/", verifyToken, requireMember, notificationController.getMyNotifications);

module.exports = router;
