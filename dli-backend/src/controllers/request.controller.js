const Course = require("../models/Course");
const CourseRequest = require("../models/CourseRequest");
const User = require("../models/User");
const { fromDecimal128 } = require("../utils/decimal.utils");
const { getRecentPointsStanding } = require("../utils/points-standing");
const { serializeDocument } = require("../utils/serialize");
const { createAuditLog } = require("../utils/audit");

function generateFallbackAccessCode(courseId) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DLI-${courseId.toString().slice(-4).toUpperCase()}-${suffix}`;
}

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

    // Check if user already has a request for this specific course (pending or approved)
    // This prevents duplicate redemptions
    const existingCourseRequest = await CourseRequest.findOne({
      "requestedBy._id": userId,
      "course._id": courseId,
      status: { $in: ["pending", "approved"] },
    });

    if (existingCourseRequest) {
      return res.status(400).json({
        success: false,
        message: "You have already requested access to this course",
        code: "DUPLICATE_REQUEST",
      });
    }

    // Return a 400 error if the user already has a pending CourseRequest document (any course)
    const existingPendingRequest = await CourseRequest.findOne({
      "requestedBy._id": userId,
      status: "pending",
    });

    if (existingPendingRequest) {
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

    await createAuditLog({
      action: "COURSE_REQUESTED",
      tag: "COURSE",
      actor: user,
      target: user._id,
      message: `${user.name} requested course access for ${course.title}.`,
      metadata: {
        courseId: course._id,
        courseRequestId: newRequest._id,
      },
    });

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

      await createAuditLog({
        action: "COURSE_REJECTED",
        tag: "GOVERNANCE",
        actor: req.user,
        target: courseRequest.requestedBy._id,
        message: `${req.user.name} rejected course access for ${courseRequest.requestedBy.name}.`,
        metadata: {
          courseId: courseRequest.course._id,
          courseRequestId: courseRequest._id,
          reason: adminNote || null,
        },
      });

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

    const standingSnapshot = await getRecentPointsStanding(user._id, { session });
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

    // Apply updates
    let redemptionCode = null;

    if (dliCode) {
      dliCode.isUsed = true;
      dliCode.usedBy = user._id;
      dliCode.usedAt = new Date();
      await dliCode.save({ session });
      redemptionCode = dliCode.code;
    } else {
      redemptionCode = generateFallbackAccessCode(course._id);
    }

    courseRequest.status = "approved";
    courseRequest.redemptionCode = redemptionCode;
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

    await createAuditLog({
      action: "COURSE_APPROVED",
      tag: "GOVERNANCE",
      actor: req.user,
      target: user._id,
      message: `${req.user.name} approved course access for ${user.name}.`,
      metadata: {
        courseRequestId: courseRequest._id,
        courseId: course._id,
        pointsDeducted: course.pointsRequired,
        pointsDelta: 0,
        reason: `recent_xp_gain:${standingSnapshot.recentXpGain}`,
      },
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: {
        ...serializeDocument(courseRequest),
        standing: standingSnapshot,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
