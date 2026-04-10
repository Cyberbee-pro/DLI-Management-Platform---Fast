const mongoose = require("mongoose");
const CourseRequest = require("../models/CourseRequest");
const User = require("../models/User");
const Course = require("../models/Course");
const DliCode = require("../models/DliCode");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { serializeDocument } = require("../utils/serialize");
const { createAuditLog } = require("../utils/audit");
const { ensureSystemConfig } = require("../utils/system-config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { toDecimal128 } = require("../utils/decimal.utils");
const {
  PROFILE_VECTOR_CONFIG,
  getMissingProfileVectors,
} = require("../utils/profile");

/**
 * Admin creates a new user account manually.
 * Only accessible to admin users. Generates a temporary password for the user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createUser = async (req, res) => {
  try {
    const { name, email, srmRegNo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { srmRegNo }],
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or Registration Number already exists",
        code: "USER_EXISTS",
      });
    }

    // Generate a temporary password
    const temporaryPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = new User({
      name,
      email,
      srmRegNo,
      passwordHash,
      role: "member",
      points: {
        balance: toDecimal128(0),
        totalEarned: toDecimal128(0),
        totalSpent: toDecimal128(0),
        negativeAccrued: toDecimal128(0),
      },
    });

    await user.save();

    await createAuditLog({
      action: "USER_CREATED",
      tag: "ADMIN",
      actor: req.user,
      target: user._id,
      message: `Admin ${req.user.name} created user account for ${user.name}.`,
      metadata: {
        email: user.email,
        srmRegNo: user.srmRegNo,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        user: serializeDocument(user),
        temporaryCredentials: {
          email,
          password: temporaryPassword,
          note: "This is a temporary password. User should change it on first login.",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Retrieves course requests filtered by status.
 * Used by administrators to view the pending approval queue.
 *
 * @param {string} [req.query.status="pending"] - The approval status filter
 * @returns {Promise<CourseRequest[]>}
 * @throws {500} INTERNAL_ERROR - Mongoose query failure
 */
const getPendingRequests = async (req, res) => {
  try {
    const status = req.query.status || "pending";

    const requests = await CourseRequest.find({ status })
      .populate("requestedBy", "_id name srmRegNo points.balance")
      .populate("course", "_id title pointsRequired inventoryCount")
      .sort({ requestedAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: serializeDocument(requests),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve course requests.",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Retrieves paginated user details ordered by total points balance.
 *
 * @param {string} [req.query.page="1"] - Pagination offset
 * @param {string} [req.query.limit="50"] - Maximum document limit
 * @returns {Promise<User[]>}
 * @throws {500} INTERNAL_ERROR - Mongoose query failure
 */
const getUsersLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select(
        "_id name srmRegNo role rank avatarUrl githubUsername linkedinUrl instagramUrl websiteUrl resumeUrl points",
      )
      .sort({ "points.balance": -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serializedUsers = serializeDocument(users).map((user) => ({
      ...user,
      missingProfileVectors: getMissingProfileVectors(user),
    }));

    return res.status(200).json({
      success: true,
      data: serializedUsers,
      page,
      limit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users leaderboard.",
      code: "INTERNAL_ERROR",
    });
  }
};

const getAuditFeed = async (req, res) => {
  try {
    const requestedLimit = parseInt(req.query.limit, 10) || 200;
    const limit = Math.min(Math.max(requestedLimit, 1), 500);

    const [auditLogs, systemConfig] = await Promise.all([
      AuditLog.find({}).sort({ timestamp: -1 }).limit(limit).lean(),
      ensureSystemConfig(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs: serializeDocument(auditLogs),
        systemConfig: serializeDocument(systemConfig),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit feed.",
      code: "INTERNAL_ERROR",
    });
  }
};

const raiseProfileQuery = async (req, res) => {
  try {
    const profileFields = Array.isArray(req.body.profileFields)
      ? req.body.profileFields.filter((field) => PROFILE_VECTOR_CONFIG[field])
      : [];
    const requestedUserIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    const selectAllMembers = req.body.selectAllMembers === true;

    if (profileFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one valid profile field must be supplied.",
        code: "INVALID_PROFILE_FIELDS",
      });
    }

    if (!selectAllMembers && requestedUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one member or enable Select All Members.",
        code: "NO_TARGET_USERS",
      });
    }

    const userFilter = selectAllMembers
      ? { role: "member" }
      : { _id: { $in: requestedUserIds }, role: "member" };

    const users = await User.find(userFilter)
      .select("_id name role avatarUrl resumeUrl linkedinUrl instagramUrl websiteUrl")
      .lean();

    const matchingUsers = users
      .map((user) => ({
        ...user,
        missingProfileVectors: getMissingProfileVectors(user, profileFields),
      }))
      .filter((user) => user.missingProfileVectors.length > 0);

    if (matchingUsers.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          dispatchedCount: 0,
          skippedCount: users.length,
          users: [],
        },
      });
    }

    const now = new Date();
    const notifications = matchingUsers.map((user) => ({
      userId: user._id,
      type: "PROFILE_QUERY",
      channel: "in_app",
      message: `Network Nudge: update ${user.missingProfileVectors
        .map((field) => PROFILE_VECTOR_CONFIG[field])
        .join(", ")}.`,
      metadata: {
        requestedBy: {
          _id: req.user._id,
          name: req.user.name,
          role: req.user.role,
        },
        profileFields: user.missingProfileVectors,
        issuedAt: now,
      },
      sentAt: now,
    }));

    await Notification.insertMany(notifications);

    await createAuditLog({
      action: "PROFILE_QUERY_RAISED",
      tag: "QUERY",
      actor: req.user,
      message: `${req.user.name} dispatched a network nudge to ${matchingUsers.length} member(s).`,
      metadata: {
        profileFields,
        userIds: matchingUsers.map((user) => user._id),
        selectAllMembers,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        dispatchedCount: matchingUsers.length,
        skippedCount: users.length - matchingUsers.length,
        users: serializeDocument(matchingUsers),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to raise profile query.",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Bulk uploads DLI codes, skipping duplicates gracefully without failing the entire batch,
 * and increments the course inventory appropriately within a transaction boundary.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const bulkUploadCodes = async (req, res) => {
  const { courseId, codes } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const course = await Course.findById(courseId).session(session);
    if (!course) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Course not found.",
        code: "NOT_FOUND",
      });
    }

    const operations = codes.map((code) => ({
      courseId: course._id,
      code,
      isUsed: false,
    }));

    let insertedCount = 0;
    try {
      const results = await DliCode.insertMany(operations, {
        ordered: false,
        session,
      });
      insertedCount = results.length;
    } catch (insertError) {
      if (insertError.insertedDocs) {
        insertedCount = insertError.insertedDocs.length;
      }
    }

    if (insertedCount > 0) {
      course.inventoryCount += insertedCount;
      await course.save({ session });
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: { insertedCount },
    });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: "Failed to process code bulk upload.",
      code: "INTERNAL_ERROR",
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  createUser,
  getPendingRequests,
  getUsersLeaderboard,
  getAuditFeed,
  raiseProfileQuery,
  bulkUploadCodes,
};
