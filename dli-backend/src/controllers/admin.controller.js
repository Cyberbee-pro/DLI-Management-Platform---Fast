const mongoose = require("mongoose");
const CourseRequest = require("../models/CourseRequest");
const User = require("../models/User");
const Course = require("../models/Course");
const DliCode = require("../models/DliCode");
const { serializeDocument } = require("../utils/serialize");

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
      .select("_id name srmRegNo role points")
      .sort({ "points.balance": -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: serializeDocument(users),
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
  getPendingRequests,
  getUsersLeaderboard,
  bulkUploadCodes,
};
