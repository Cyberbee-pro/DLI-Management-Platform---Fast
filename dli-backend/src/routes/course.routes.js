const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const { verifyToken, requireMember } = require("../middleware/auth.middleware");

// GET /api/v1/courses -> verifyToken -> requireMember -> getCourses
router.get("/", verifyToken, requireMember, courseController.getCourses);

module.exports = router;
