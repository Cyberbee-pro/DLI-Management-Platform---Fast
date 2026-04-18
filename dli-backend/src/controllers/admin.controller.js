const mongoose = require("mongoose");
const path = require("path");
const CourseRequest = require("../models/CourseRequest");
const User = require("../models/User");
const Course = require("../models/Course");
const Task = require("../models/Task");
const DliCode = require("../models/DliCode");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { serializeDocument } = require("../utils/serialize");
const { createAuditLog } = require("../utils/audit");
const { ensureSystemConfig } = require("../utils/system-config");
const bcrypt = require("bcryptjs");
const {
  toDecimal128,
  fromDecimal128,
  addDecimal,
  subtractDecimal,
} = require("../utils/decimal.utils");
const {
  PROFILE_VECTOR_CONFIG,
  getMissingProfileVectors,
} = require("../utils/profile");

const TASK_CATEGORIES = [
  "Frontend",
  "Backend",
  "DataBase",
  "AI/ML",
  "Research",
  "DevOps",
  "Content",
];
const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const USER_ROLES = ["member", "moderator", "admin"];

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on"].includes(normalizedValue)) {
      return true;
    }

    if (["false", "0", "no", "n", "off"].includes(normalizedValue)) {
      return false;
    }
  }

  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter(Boolean);
  }

  const normalizedValue = normalizeString(value);
  return normalizedValue
    ? normalizedValue
        .split(",")
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    : [];
}

function parseCsvRow(line) {
  const values = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values.map((value) => value.trim());
}

function parseCsvDocument(content) {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return [];
  }

  const headers = parseCsvRow(rows[0]);

  return rows.slice(1).map((row) => {
    const values = parseCsvRow(row);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

function parseImportFile(file) {
  if (!file?.buffer) {
    throw new Error("A CSV or JSON file upload is required.");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  const content = file.buffer.toString("utf8").trim();

  if (!content) {
    throw new Error("Uploaded file is empty.");
  }

  if (extension === ".json") {
    const parsedPayload = JSON.parse(content);

    if (Array.isArray(parsedPayload)) {
      return parsedPayload;
    }

    if (Array.isArray(parsedPayload?.data)) {
      return parsedPayload.data;
    }

    throw new Error("JSON import payload must be an array or an object with a data array.");
  }

  if (extension === ".csv") {
    return parseCsvDocument(content);
  }

  throw new Error("Only .csv and .json uploads are supported.");
}

function buildImportResponse({
  entity,
  insertedCount,
  validationErrors = [],
  writeErrors = [],
}) {
  return {
    success: true,
    message: `${entity} bulk import processed.`,
    data: {
      insertedCount,
      skippedCount: validationErrors.length + writeErrors.length,
      validationErrors,
      writeErrors,
    },
  };
}

function extractWriteErrors(error) {
  if (!Array.isArray(error?.writeErrors)) {
    return [];
  }

  return error.writeErrors.map((writeError) => ({
    index: writeError.index,
    message: writeError.errmsg || writeError.message || "Bulk write failure.",
  }));
}

/**
 * Admin creates a new user account manually.
 * Only accessible to admin users. Generates a temporary password for the user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      srmRegNo,
      role = "member",
      designation,
      password,
    } = req.body;
    const normalizedDesignation = normalizeString(designation);

    // Validate role
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'member', 'moderator', or 'admin'.",
        code: "INVALID_ROLE",
      });
    }

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

    const provisionedPassword =
      normalizeString(password) ?? Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(provisionedPassword, 10);

    const user = new User({
      name,
      email,
      srmRegNo,
      passwordHash,
      role,
      designation: normalizedDesignation,
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
      tag: "SYSTEM",
      actor: req.user,
      target: user._id,
      message: `Admin ${req.user.name} created ${role} account for ${user.name}.`,
      metadata: {
        email: user.email,
        srmRegNo: user.srmRegNo,
        role,
        designation: user.designation,
      },
    });

    const serializedUser = serializeDocument(user);
    delete serializedUser.passwordHash;

    return res.status(201).json({
      success: true,
      data: {
        user: serializedUser,
        temporaryPassword: provisionedPassword,
        temporaryCredentials: {
          email,
          password: provisionedPassword,
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
 * Updates the role and designation assigned to an existing user.
 * This endpoint is intentionally restricted to true administrators.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateUserRoleAndDesignation = async (req, res) => {
  try {
    const userId = normalizeString(req.params.id);
    const role = normalizeString(req.body.role);
    const designation = normalizeString(req.body.designation);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
        code: "INVALID_USER_ID",
      });
    }

    if (!role || !USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be member, moderator, or admin.",
        code: "INVALID_ROLE",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    const previousRole = user.role;
    const previousDesignation = user.designation ?? null;

    user.role = role;
    user.designation = designation;

    await user.save();

    await createAuditLog({
      action: "USER_ROLE_DESIGNATION_UPDATED",
      tag: "GOVERNANCE",
      actor: req.user,
      target: user._id,
      message: `${req.user.name} updated access metadata for ${user.name}.`,
      metadata: {
        adminId: req.user._id,
        targetUserId: user._id,
        previousRole,
        newRole: user.role,
        previousDesignation,
        newDesignation: user.designation,
      },
    });

    const serializedUser = serializeDocument(user);
    delete serializedUser.passwordHash;

    return res.status(200).json({
      success: true,
      message: "User role and designation updated successfully.",
      data: {
        user: serializedUser,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user role and designation.",
      code: "INTERNAL_ERROR",
    });
  }
};

/**
 * Awards custom points to one or more users and writes an immutable audit trail per recipient.
 * This flow is intentionally reserved for true administrators.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const awardCustomPoints = async (req, res) => {
  const rawUserIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const userIds = [...new Set(rawUserIds.map((userId) => normalizeString(userId)).filter(Boolean))];
  const normalizedReason = normalizeString(req.body.reason);
  const pointsValue = Number(req.body.points);

  if (userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Select at least one user to award points.",
      code: "INVALID_USERS",
    });
  }

  if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
    return res.status(400).json({
      success: false,
      message: "Points must be a valid positive number.",
      code: "INVALID_POINTS",
    });
  }

  if (!normalizedReason) {
    return res.status(400).json({
      success: false,
      message: "Reason is required for custom point awards.",
      code: "INVALID_REASON",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const recipients = await User.find({
      _id: { $in: userIds },
    }).session(session);

    const resolvedUserIds = recipients.map((user) => user._id.toString());
    const missingUserIds = userIds.filter((userId) => !resolvedUserIds.includes(userId));

    if (missingUserIds.length > 0) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "One or more selected users could not be found.",
        code: "USER_NOT_FOUND",
        data: {
          missingUserIds,
        },
      });
    }

    const pointsDelta = toDecimal128(pointsValue);
    const awardedUsers = [];

    for (const user of recipients) {
      user.points.balance = addDecimal(user.points.balance, pointsDelta);
      user.points.totalEarned = addDecimal(user.points.totalEarned, pointsDelta);

      await user.save({ session });

      await createAuditLog({
        action: "CUSTOM_POINTS_AWARDED",
        tag: "GOVERNANCE",
        actor: req.user,
        target: user._id,
        message: `${req.user.name} awarded ${pointsValue} custom point(s) to ${user.name}.`,
        metadata: {
          adminId: req.user._id,
          targetUserId: user._id,
          pointsDelta,
          reason: normalizedReason,
        },
        session,
      });

      awardedUsers.push({
        _id: user._id,
        name: user.name,
        srmRegNo: user.srmRegNo,
        points: user.points,
      });
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Custom points awarded successfully.",
      data: {
        awardedCount: awardedUsers.length,
        points: pointsValue,
        reason: normalizedReason,
        users: serializeDocument(awardedUsers),
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      success: false,
      message: "Failed to award custom points.",
      code: "INTERNAL_ERROR",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Deducts custom points from one or more users and writes an immutable audit trail per recipient.
 * Balance is clamped to zero so this flow never drives user accounts negative.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const deductCustomPoints = async (req, res) => {
  const rawUserIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  const userIds = [...new Set(rawUserIds.map((userId) => normalizeString(userId)).filter(Boolean))];
  const normalizedReason = normalizeString(req.body.reason);
  const pointsValue = Number(req.body.points);

  if (userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Select at least one user to deduct points from.",
      code: "INVALID_USERS",
    });
  }

  if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
    return res.status(400).json({
      success: false,
      message: "Points must be a valid positive number.",
      code: "INVALID_POINTS",
    });
  }

  if (!normalizedReason) {
    return res.status(400).json({
      success: false,
      message: "Reason is required for custom point deductions.",
      code: "INVALID_REASON",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const recipients = await User.find({
      _id: { $in: userIds },
    }).session(session);

    const resolvedUserIds = recipients.map((user) => user._id.toString());
    const missingUserIds = userIds.filter((userId) => !resolvedUserIds.includes(userId));

    if (missingUserIds.length > 0) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "One or more selected users could not be found.",
        code: "USER_NOT_FOUND",
        data: {
          missingUserIds,
        },
      });
    }

    const deductedUsers = [];

    for (const user of recipients) {
      const currentBalance = fromDecimal128(user.points.balance);
      const appliedPoints = Math.min(pointsValue, Math.max(currentBalance, 0));
      const deductionDelta = toDecimal128(appliedPoints);

      user.points.balance = subtractDecimal(user.points.balance, deductionDelta);
      user.points.negativeAccrued = addDecimal(user.points.negativeAccrued, deductionDelta);

      await user.save({ session });

      await createAuditLog({
        action: "CUSTOM_POINTS_DEDUCTED",
        tag: "GOVERNANCE",
        actor: req.user,
        target: user._id,
        message:
          appliedPoints > 0
            ? `${req.user.name} deducted ${appliedPoints} custom point(s) from ${user.name}.`
            : `${req.user.name} attempted to deduct ${pointsValue} custom point(s) from ${user.name}, but the balance was already zero.`,
        metadata: {
          adminId: req.user._id,
          targetUserId: user._id,
          requestedPoints: pointsValue,
          pointsDelta: deductionDelta,
          appliedPoints,
          reason: normalizedReason,
        },
        session,
      });

      deductedUsers.push({
        _id: user._id,
        name: user.name,
        srmRegNo: user.srmRegNo,
        deductedPoints: appliedPoints,
        requestedPoints: pointsValue,
        points: user.points,
      });
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Custom points deducted successfully.",
      data: {
        deductedCount: deductedUsers.length,
        points: pointsValue,
        reason: normalizedReason,
        users: serializeDocument(deductedUsers),
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      success: false,
      message: "Failed to deduct custom points.",
      code: "INTERNAL_ERROR",
    });
  } finally {
    session.endSession();
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
        "_id name email srmRegNo role designation rank avatarUrl githubUsername linkedinUrl instagramUrl websiteUrl resumeUrl resumeData points",
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

const bulkImportUsers = async (req, res) => {
  try {
    const records = parseImportFile(req.file);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No user records were found in the uploaded file.",
        code: "EMPTY_IMPORT",
      });
    }

    const validationErrors = [];
    const documents = [];

    for (const [index, record] of records.entries()) {
      const name = normalizeString(record.name);
      const email = normalizeString(record.email);
      const srmRegNo = normalizeString(record.srmRegNo ?? record.registrationNumber);
      const role = normalizeString(record.role) ?? "member";

      if (!name || !email || !srmRegNo) {
        validationErrors.push({
          index,
          message: "name, email, and srmRegNo are required.",
        });
        continue;
      }

      const designation = normalizeString(record.designation);

      if (!USER_ROLES.includes(role)) {
        validationErrors.push({
          index,
          message: "role must be member, moderator, or admin.",
        });
        continue;
      }

      const provisionedPassword =
        normalizeString(record.password) ?? Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(provisionedPassword, 10);

      documents.push({
        name,
        email,
        srmRegNo,
        passwordHash,
        role,
        designation,
        points: {
          balance: toDecimal128(0),
          totalEarned: toDecimal128(0),
          totalSpent: toDecimal128(0),
          negativeAccrued: toDecimal128(0),
        },
      });
    }

    let insertedCount = 0;
    let writeErrors = [];

    if (documents.length > 0) {
      try {
        const insertedDocuments = await User.insertMany(documents, {
          ordered: false,
        });
        insertedCount = insertedDocuments.length;
      } catch (error) {
        insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
        writeErrors = extractWriteErrors(error);
      }
    }

    await createAuditLog({
      action: "USERS_BULK_IMPORTED",
      tag: "SYSTEM",
      actor: req.user,
      message: `${req.user.name} seeded ${insertedCount} user account(s) via bulk import.`,
      metadata: {
        insertedCount,
        skippedCount: validationErrors.length + writeErrors.length,
      },
    });

    return res.status(200).json(
      buildImportResponse({
        entity: "User",
        insertedCount,
        validationErrors,
        writeErrors,
      }),
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import users.",
      code: "BULK_IMPORT_FAILED",
    });
  }
};

const bulkImportTasks = async (req, res) => {
  try {
    const records = parseImportFile(req.file);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No task records were found in the uploaded file.",
        code: "EMPTY_IMPORT",
      });
    }

    const validationErrors = [];
    const documents = [];

    for (const [index, record] of records.entries()) {
      const title = normalizeString(record.title);
      const description = normalizeString(record.description);
      const rawCategory = normalizeString(record.category);
      const category =
        rawCategory === "ML" ? "AI/ML" : rawCategory;

      if (!title || !description || !category) {
        validationErrors.push({
          index,
          message: "title, description, and category are required.",
        });
        continue;
      }

      if (!TASK_CATEGORIES.includes(category)) {
        validationErrors.push({
          index,
          message: `category must be one of ${TASK_CATEGORIES.join(", ")}.`,
        });
        continue;
      }

      const basePoints = normalizeNumber(
        record.basePoints ?? record.pointsBase ?? record["points.base"],
      );
      const multiplier = normalizeNumber(
        record.multiplier ?? record.pointsMultiplier ?? record["points.multiplier"],
        1,
      );

      documents.push({
        title,
        description,
        category,
        points: {
          base: toDecimal128(basePoints),
          multiplier: toDecimal128(multiplier),
          effective: toDecimal128(basePoints * multiplier),
        },
        isHotBounty: normalizeBoolean(record.isHotBounty, false),
        status: "open",
        priority: normalizeString(record.priority) ?? "medium",
        difficulty: normalizeString(record.difficulty) ?? "beginner",
        deadline: normalizeString(record.deadline) ?? null,
        tags: normalizeStringArray(record.tags),
        repoUrl: normalizeString(record.repoUrl ?? record.systemLink ?? record.source),
        createdBy: {
          _id: req.user._id,
          name: req.user.name,
          srmRegNo: req.user.srmRegNo,
        },
        claimedBy: {
          _id: null,
          name: null,
          srmRegNo: null,
          claimedAt: null,
        },
        transferRequest: {
          from: null,
          to: null,
          status: null,
          adminApproved: false,
          requestedAt: null,
        },
      });
    }

    let insertedCount = 0;
    let writeErrors = [];

    if (documents.length > 0) {
      try {
        const insertedDocuments = await Task.insertMany(documents, {
          ordered: false,
        });
        insertedCount = insertedDocuments.length;
      } catch (error) {
        insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
        writeErrors = extractWriteErrors(error);
      }
    }

    await createAuditLog({
      action: "TASKS_BULK_IMPORTED",
      tag: "SYSTEM",
      actor: req.user,
      message: `${req.user.name} seeded ${insertedCount} task(s) via bulk import.`,
      metadata: {
        insertedCount,
        skippedCount: validationErrors.length + writeErrors.length,
      },
    });

    return res.status(200).json(
      buildImportResponse({
        entity: "Task",
        insertedCount,
        validationErrors,
        writeErrors,
      }),
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import tasks.",
      code: "BULK_IMPORT_FAILED",
    });
  }
};

const bulkImportCourses = async (req, res) => {
  try {
    const records = parseImportFile(req.file);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No course records were found in the uploaded file.",
        code: "EMPTY_IMPORT",
      });
    }

    const validationErrors = [];
    const documents = [];

    for (const [index, record] of records.entries()) {
      const title = normalizeString(record.title);
      const provider = normalizeString(record.provider);
      const level = normalizeString(record.level) ?? "Beginner";
      const imageUrl = normalizeString(record.imageUrl);
      const courseUrl = normalizeString(record.courseUrl);

      if (!title || !provider || !imageUrl || !courseUrl) {
        validationErrors.push({
          index,
          message: "title, provider, imageUrl, and courseUrl are required.",
        });
        continue;
      }

      if (!COURSE_LEVELS.includes(level)) {
        validationErrors.push({
          index,
          message: `level must be one of ${COURSE_LEVELS.join(", ")}.`,
        });
        continue;
      }

      documents.push({
        title,
        description:
          normalizeString(record.description) ??
          `${title} from ${provider} for ${level.toLowerCase()} learners.`,
        pointsRequired: toDecimal128(
          normalizeNumber(record.pointsRequired ?? record.xpCost),
        ),
        imageUrl,
        courseUrl,
        category: normalizeString(record.category) ?? provider,
        level,
        provider,
        inventoryCount: Math.max(
          0,
          Math.trunc(normalizeNumber(record.inventoryCount, 0)),
        ),
        isActive: normalizeBoolean(record.isActive, true),
      });
    }

    let insertedCount = 0;
    let writeErrors = [];

    if (documents.length > 0) {
      try {
        const insertedDocuments = await Course.insertMany(documents, {
          ordered: false,
        });
        insertedCount = insertedDocuments.length;
      } catch (error) {
        insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
        writeErrors = extractWriteErrors(error);
      }
    }

    await createAuditLog({
      action: "COURSES_BULK_IMPORTED",
      tag: "SYSTEM",
      actor: req.user,
      message: `${req.user.name} seeded ${insertedCount} course(s) via bulk import.`,
      metadata: {
        insertedCount,
        skippedCount: validationErrors.length + writeErrors.length,
      },
    });

    return res.status(200).json(
      buildImportResponse({
        entity: "Course",
        insertedCount,
        validationErrors,
        writeErrors,
      }),
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import courses.",
      code: "BULK_IMPORT_FAILED",
    });
  }
};

module.exports = {
  createUser,
  updateUserRoleAndDesignation,
  awardCustomPoints,
  deductCustomPoints,
  getPendingRequests,
  getUsersLeaderboard,
  getAuditFeed,
  raiseProfileQuery,
  bulkUploadCodes,
  bulkImportUsers,
  bulkImportTasks,
  bulkImportCourses,
};
