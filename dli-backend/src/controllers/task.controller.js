const { body } = require("express-validator");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  toDecimal128,
  fromDecimal128,
  addDecimal,
} = require("../utils/decimal.utils");
const { serializeDocument } = require("../utils/serialize");

/**
 * Retrieves tasks with dynamic filtering and sorting.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.getTasks = async (req, res, next) => {
  try {
    const { status, category, difficulty, isHotBounty, tags } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (isHotBounty !== undefined) filter.isHotBounty = isHotBounty === "true";

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      filter.tags = { $in: tagArray };
    }

    const tasks = await Task.find(filter).sort({ "points.effective": -1 });

    return res.status(200).json({
      success: true,
      data: serializeDocument(tasks),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new task representing a bounty board item.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      points,
      difficulty,
      isHotBounty,
      deadline,
      tags,
      projectId,
    } = req.body;

    const baseNum = Number(points?.base);
    const multiplierNum =
      points?.multiplier !== undefined ? Number(points.multiplier) : 1.0;

    const effectiveNum = baseNum * multiplierNum;

    const newTask = new Task({
      title,
      description,
      category,
      points: {
        base: toDecimal128(baseNum),
        multiplier: toDecimal128(multiplierNum),
        effective: toDecimal128(effectiveNum),
      },
      isHotBounty: isHotBounty || false,
      status: "open",
      priority: req.body.priority || "medium",
      difficulty,
      deadline: deadline || null,
      tags: tags || [],
      projectId: projectId || null,
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
        srmRegNo: req.user.srmRegNo,
      },
    });

    await newTask.save();

    return res.status(201).json({
      success: true,
      data: serializeDocument(newTask),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Claims an open task for the requesting member.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.claimTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (task.status !== "open") {
      return res.status(400).json({
        success: false,
        message: "Task is not open",
        code: "TASK_NOT_OPEN",
      });
    }

    task.status = "claimed";
    task.claimedBy = {
      _id: req.user._id,
      name: req.user.name,
      srmRegNo: req.user.srmRegNo,
      claimedAt: new Date(),
    };

    await task.save();

    return res.status(200).json({
      success: true,
      data: serializeDocument(task),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submits proof of work for a claimed task.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.submitTask = async (req, res, next) => {
  try {
    const { url, comment } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (task.claimedBy?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the claimer of this task",
        code: "NOT_CLAIMER",
      });
    }

    if (task.status !== "claimed") {
      return res.status(400).json({
        success: false,
        message: "Task is not claimed",
        code: "TASK_NOT_CLAIMED",
      });
    }

    task.submissionDetails = {
      url: url || null,
      comment: comment || null,
      submittedAt: new Date(),
    };
    task.status = "in_review";

    await task.save();

    return res.status(200).json({
      success: true,
      data: serializeDocument(task),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin approves a task submission, assigning points to the claimer.
 * Uses a Mongoose transaction to atomically transfer points.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.approveTask = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const task = await Task.findById(req.params.id).session(session);
    if (!task) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (task.status !== "in_review") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Task is not in review state",
        code: "TASK_NOT_IN_REVIEW",
      });
    }

    task.status = "completed";
    task.completedAt = new Date();
    task.reviewedBy = {
      _id: req.user._id,
      name: req.user.name,
    };

    const user = await User.findById(task.claimedBy._id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Claiming user not found",
        code: "USER_NOT_FOUND",
      });
    }

    user.points.balance = addDecimal(
      user.points.balance,
      task.points.effective,
    );
    user.points.totalEarned = addDecimal(
      user.points.totalEarned,
      task.points.effective,
    );

    await task.save({ session });
    await user.save({ session });

    const auditLog = new AuditLog({
      action: "TASK_COMPLETED",
      target: user._id,
      actor: req.user._id,
      metadata: { taskId: task._id, pointsDelta: task.points.effective },
    });

    await auditLog.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      data: serializeDocument(task),
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
