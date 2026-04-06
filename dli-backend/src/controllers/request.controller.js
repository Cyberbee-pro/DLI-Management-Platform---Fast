const { body } = require("express-validator");
const Course = require("../models/Course");
const CourseRequest = require("../models/CourseRequest");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { fromDecimal128 } = require("../utils/decimal.utils");
const { serializeDocument } = require("../utils/serialize");

/**
 * Snapshots userBalanceAtRequest at submission time rather than approval time
 * to prevent a race condition where a concurrent approval drains the balance
 * between request creation and admin review.
 *
 * @param {string} userId - Requesting user's ObjectId string
 * @param {string} courseId - Target course's ObjectId string
 * @returns {Promise<CourseRequest>}
 * @throws {404} COURSE_NOT_FOUND - Course does not exist
 * @throws {400} COURSE_OUT_OF_STOCK - Inventory count is zero
 * @throws {404} USER_NOT_FOUND - User missing
 * @throws {400} DUPLICATE_PENDING_REQUEST - one active request per course per user
 * @throws {400} INSUFFICIENT_POINTS - balance below pointsRequired at submission time
 */
exports.createRequest = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id;

    // Fetch the course from the database
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
        code: "COURSE_NOT_FOUND",
      });
    }

    // Return a 400 error if inventoryCount is 0
    if (course.inventoryCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Course out of stock",
        code: "COURSE_OUT_OF_STOCK",
      });
    }

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Return a 400 error if the user already has a pending CourseRequest document
    const existingRequest = await CourseRequest.findOne({
      "requestedBy._id": userId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending course request",
        code: "DUPLICATE_PENDING_REQUEST",
      });
    }

    // Verify user.points.balance >= course.pointsRequired
    const userBalance = fromDecimal128(user.points.balance);
    const requiredPoints = fromDecimal128(course.pointsRequired);

    if (userBalance < requiredPoints) {
      return res.status(400).json({
        success: false,
        message: "Insufficient points",
        code: "INSUFFICIENT_POINTS",
      });
    }

    // Create and save a new CourseRequest document
    const newRequest = new CourseRequest({
      requestedBy: {
        _id: user._id,
        name: user.name,
        email: user.email,
        srmRegNo: user.srmRegNo,
      },
      course: {
        _id: course._id,
        title: course.title,
        pointsRequired: course.pointsRequired,
      },
      userBalanceAtRequest: user.points.balance,
      status: "pending",
    });

    await newRequest.save();

    // Create and save a new AuditLog document
    const auditLog = new AuditLog({
      action: "COURSE_REQUESTED",
      actor: user._id,
      target: user._id,
      metadata: { courseId: course._id },
    });

    await auditLog.save();

    // Format the final success response
    return res.status(200).json({
      success: true,
      data: serializeDocument(newRequest),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin action to approve or reject a pending course request.
 * Utilizing transactions to deduct points, claim a DLI code, decrease inventory, and log the action atomically.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.approveCourseRequest = async (req, res, next) => {
  const { id } = req.params;
  const { action, adminNote } = req.body;

  if (action === "rejected") {
    try {
      const courseRequest = await CourseRequest.findById(id);
      if (!courseRequest) {
        return res.status(404).json({
          success: false,
          message: "Course request not found.",
          code: "NOT_FOUND",
        });
      }

      courseRequest.status = "rejected";
      courseRequest.adminNote = adminNote || null;
      courseRequest.processedBy = { _id: req.user._id, name: req.user.name };
      courseRequest.processedAt = new Date();

      await courseRequest.save();

      return res.status(200).json({
        success: true,
        data: serializeDocument(courseRequest),
      });
    } catch (error) {
      return next(error);
    }
  }

  // Handle "approved" path with full transaction
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const courseRequest = await CourseRequest.findById(id).session(session);
    if (!courseRequest) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Course request not found.",
        code: "NOT_FOUND",
      });
    }

    if (courseRequest.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Course request is not in a pending state.",
        code: "INVALID_STATE",
      });
    }

    const course = await Course.findById(courseRequest.course._id).session(session);
    if (!course) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Associated course not found.",
        code: "NOT_FOUND",
      });
    }

    if (course.inventoryCount <= 0) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Insufficient course inventory.",
        code: "OUT_OF_STOCK",
      });
    }

    const user = await User.findById(courseRequest.requestedBy._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Requesting user not found.",
        code: "NOT_FOUND",
      });
    }

    const { subtractDecimal, addDecimal, isNegative } = require("../utils/decimal.utils");
    
    const remainingBalance = subtractDecimal(user.points.balance, course.pointsRequired);
    if (isNegative(remainingBalance)) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Insufficient points balance.",
        code: "INSUFFICIENT_POINTS",
      });
    }

    const DliCode = require("../models/DliCode");
    const dliCode = await DliCode.findOne({
      courseId: course._id,
      isUsed: false,
    }).session(session);

    if (!dliCode) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "No available DLI codes for this course.",
        code: "NO_CODES_AVAILABLE",
      });
    }

    // Apply updates
    dliCode.isUsed = true;
    dliCode.usedBy = user._id;
    dliCode.usedAt = new Date();
    await dliCode.save({ session });

    courseRequest.status = "approved";
    courseRequest.redemptionCode = dliCode.code;
    courseRequest.adminNote = adminNote || null;
    courseRequest.processedBy = { _id: req.user._id, name: req.user.name };
    courseRequest.processedAt = new Date();
    await courseRequest.save({ session });

    course.inventoryCount -= 1;
    await course.save({ session });

    user.points.balance = remainingBalance;
    user.points.totalSpent = addDecimal(user.points.totalSpent, course.pointsRequired);
    user.activeCourse = {
      _id: course._id,
      title: course.title,
      pointsRequired: course.pointsRequired,
    };
    await user.save({ session });

    const AuditLog = require("../models/AuditLog");
    const auditLog = new AuditLog({
      action: "COURSE_APPROVED",
      actor: req.user._id,
      target: user._id,
      metadata: { 
        courseRequestId: courseRequest._id, 
        courseId: course._id, 
        pointsDeducted: course.pointsRequired 
      },
    });
    await auditLog.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: serializeDocument(courseRequest),
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
