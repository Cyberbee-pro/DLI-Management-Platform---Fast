const express = require('express');
const { verifyToken, requireAdmin } = require('../../middleware/auth.middleware');
const { approveCourseRequest } = require('./admin.controller');

const router = express.Router();

router.patch('/requests/:id/approve', verifyToken, requireAdmin, approveCourseRequest);

module.exports = router;
