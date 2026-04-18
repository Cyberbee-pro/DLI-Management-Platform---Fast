const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const {
  toDecimal128,
  addDecimal,
} = require("../utils/decimal.utils");
const { serializeDocument } = require("../utils/serialize");
const { createAuditLog } = require("../utils/audit");
const { incrementSystemPoolBalance } = require("../utils/system-config");

function withTaskRelations(query) {
  return query
    .populate("assignedTo", "name role avatarUrl srmRegNo")
    .populate("transferRequest.from", "name role avatarUrl")
    .populate("transferRequest.to", "name role avatarUrl");
}

function serializeTaskForClient(task) {
  const serializedTask = serializeDocument(task);

  return {
    ...serializedTask,
    submissions: Array.isArray(serializedTask.submissions)
      ? serializedTask.submissions
      : [],
    submissionDetails: serializedTask.submissionDetails ?? {
      url: null,
      comment: null,
      submittedAt: null,
    },
  };
}

function getAssignedUserId(task) {
  if (task.assignedTo) {
    return task.assignedTo.toString();
  }

  if (task.claimedBy?._id) {
    return task.claimedBy._id.toString();
  }

  return null;
}

function isCurrentAssignee(task, userId) {
  return getAssignedUserId(task) === userId.toString();
}

function isTaskReviewer(task, user) {
  if (!task || !user) {
    return false;
  }

  if (user.role === "admin" || user.role === "moderator") {
    return true;
  }

  return task.createdBy?._id?.toString() === user._id.toString();
}

function clearTransferRequest(task) {
  task.transferRequest = {
    from: null,
    to: null,
    status: null,
    adminApproved: false,
    requestedAt: null,
  };
}

function clearAssignment(task) {
  task.assignedTo = null;
  task.claimedBy = {
    _id: null,
    name: null,
    srmRegNo: null,
    claimedAt: null,
  };
  clearTransferRequest(task);
}

async function loadSerializedTask(taskId) {
  const task = await withTaskRelations(Task.findById(taskId));
  return task ? serializeTaskForClient(task) : null;
}

function recordSubmission(task, { fileUrl, comment }) {
  const submissionTimestamp = new Date();

  task.submissions.push({
    fileUrl,
    comment: comment || null,
    timestamp: submissionTimestamp,
  });
  task.submissionDetails = {
    url: fileUrl,
    comment: comment || null,
    submittedAt: submissionTimestamp,
  };
}

async function completeTaskSubmission(taskId, reviewer) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const task = await Task.findById(taskId).session(session);
    if (!task) {
      await session.abortTransaction();
      return {
        statusCode: 404,
        payload: {
          success: false,
          message: "Task not found",
          code: "TASK_NOT_FOUND",
        },
      };
    }

    if (!isTaskReviewer(task, reviewer)) {
      await session.abortTransaction();
      return {
        statusCode: 403,
        payload: {
          success: false,
          message:
            "Only moderators, administrators, or the task creator can approve this deployment.",
          code: "FORBIDDEN",
        },
      };
    }

    if (task.status !== "in_review") {
      await session.abortTransaction();
      return {
        statusCode: 400,
        payload: {
          success: false,
          message: "Task is not in review state",
          code: "TASK_NOT_IN_REVIEW",
        },
      };
    }

    task.status = "completed";
    task.completedAt = new Date();
    task.reviewedBy = {
      _id: reviewer._id,
      name: reviewer.name,
    };

    const assigneeId = getAssignedUserId(task);
    const user = assigneeId
      ? await User.findById(assigneeId).session(session)
      : null;

    if (!user) {
      await session.abortTransaction();
      return {
        statusCode: 404,
        payload: {
          success: false,
          message: "Claiming user not found",
          code: "USER_NOT_FOUND",
        },
      };
    }

    user.points.balance = addDecimal(user.points.balance, task.points.effective);
    user.points.totalEarned = addDecimal(
      user.points.totalEarned,
      task.points.effective,
    );

    await task.save({ session });
    await user.save({ session });

    const systemConfig = await incrementSystemPoolBalance(task.points.effective, { session });

    await createAuditLog({
      action: "TASK_COMPLETED",
      tag: "GOVERNANCE",
      target: user._id,
      actor: reviewer,
      message: `${reviewer.name} approved "${task.title}" for ${user.name}.`,
      metadata: {
        taskId: task._id,
        pointsDelta: task.points.effective,
        previousStatus: "in_review",
        newStatus: "completed",
        systemPoolBalance: systemConfig.systemPoolBalance,
      },
      session,
    });

    await createAuditLog({
      action: "SYSTEM_POOL_INCREMENTED",
      tag: "POOL",
      actor: reviewer,
      target: user._id,
      message: `System pool increased after "${task.title}" approval.`,
      metadata: {
        taskId: task._id,
        pointsDelta: task.points.effective,
        systemPoolBalance: systemConfig.systemPoolBalance,
      },
      session,
    });

    await session.commitTransaction();

    return {
      statusCode: 200,
      payload: {
        success: true,
        data: await loadSerializedTask(task._id),
      },
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

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
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagArray };
    }

    const tasks = await withTaskRelations(
      Task.find(filter).sort({ "points.effective": -1, updatedAt: -1 }),
    );

    return res.status(200).json({
      success: true,
      data: tasks.map((task) => serializeTaskForClient(task)),
    });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await withTaskRelations(Task.findById(req.params.id));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeTaskForClient(task),
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
      repoUrl,
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
      repoUrl: repoUrl || null,
      createdBy: {
        _id: req.user._id,
        name: req.user.name,
        srmRegNo: req.user.srmRegNo,
      },
    });

    clearTransferRequest(newTask);

    await newTask.save();

    await createAuditLog({
      action: "TASK_CREATED",
      tag: "SYSTEM",
      actor: req.user,
      message: `${req.user.name} published task "${newTask.title}".`,
      metadata: {
        taskId: newTask._id,
        pointsDelta: newTask.points.effective,
      },
    });

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
    task.assignedTo = req.user._id;
    task.claimedBy = {
      _id: req.user._id,
      name: req.user.name,
      srmRegNo: req.user.srmRegNo,
      claimedAt: new Date(),
    };
    clearTransferRequest(task);

    await task.save();

    await createAuditLog({
      action: "TASK_CLAIMED",
      tag: "CLAIM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} claimed "${task.title}".`,
      metadata: {
        taskId: task._id,
        previousStatus: "open",
        newStatus: "claimed",
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
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
    const { comment } = req.body;
    const fileUrl = req.body.fileUrl || req.body.url;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "A submission URL is required.",
        code: "SUBMISSION_URL_REQUIRED",
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (!isCurrentAssignee(task, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not the claimer of this task",
        code: "NOT_CLAIMER",
      });
    }

    if (task.status !== "claimed") {
      return res.status(400).json({
        success: false,
        message: "Task is not ready for submission",
        code: "TASK_NOT_CLAIMED",
      });
    }

    recordSubmission(task, { fileUrl, comment });
    task.status = "in_review";

    await task.save();

    await createAuditLog({
      action: "TASK_SUBMITTED",
      tag: "CLAIM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} submitted work for "${task.title}".`,
      metadata: {
        taskId: task._id,
        fileUrl,
        previousStatus: "claimed",
        newStatus: "in_review",
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Allows the active assignee to replace the latest submission before approval.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.updateSubmission = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const fileUrl = req.body.fileUrl || req.body.url;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "A submission URL is required.",
        code: "SUBMISSION_URL_REQUIRED",
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (!isCurrentAssignee(task, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned user can update this submission.",
        code: "NOT_CLAIMER",
      });
    }

    if (!task.submissionDetails?.url) {
      return res.status(400).json({
        success: false,
        message: "No existing submission is available to update.",
        code: "NO_SUBMISSION_TO_UPDATE",
      });
    }

    if (!["claimed", "in_review"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "This task can no longer be edited.",
        code: "TASK_NOT_EDITABLE",
      });
    }

    recordSubmission(task, { fileUrl, comment });
    task.status = "in_review";

    await task.save();

    await createAuditLog({
      action: "TASK_SUBMISSION_UPDATED",
      tag: "CLAIM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} updated the submission for "${task.title}".`,
      metadata: {
        taskId: task._id,
        fileUrl,
        newStatus: "in_review",
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a transfer request for the current task assignee to hand off work.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.requestTransfer = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (task.status !== "claimed") {
      return res.status(400).json({
        success: false,
        message: "Only claimed tasks can be transferred.",
        code: "TASK_NOT_TRANSFERABLE",
      });
    }

    const currentAssigneeId = getAssignedUserId(task);
    if (!currentAssigneeId) {
      return res.status(400).json({
        success: false,
        message: "Task is not currently assigned.",
        code: "TASK_UNASSIGNED",
      });
    }

    const targetUserId = req.body.toUserId || req.user._id.toString();

    if (
      targetUserId !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Members can only request transfers to themselves.",
        code: "INVALID_TRANSFER_TARGET",
      });
    }

    if (targetUserId === currentAssigneeId) {
      return res.status(400).json({
        success: false,
        message: "Task is already assigned to this user.",
        code: "TASK_ALREADY_ASSIGNED",
      });
    }

    if (
      task.transferRequest?.status === "pending" ||
      (task.transferRequest?.status === "approved" &&
        task.transferRequest?.adminApproved)
    ) {
      return res.status(409).json({
        success: false,
        message: "A transfer is already in progress for this task.",
        code: "TRANSFER_ALREADY_PENDING",
      });
    }

    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Requested user was not found.",
        code: "USER_NOT_FOUND",
      });
    }

    task.transferRequest = {
      from: currentAssigneeId,
      to: targetUser._id,
      status: "pending",
      adminApproved: false,
      requestedAt: new Date(),
    };

    await task.save();

    await createAuditLog({
      action: "TASK_TRANSFER_REQUESTED",
      tag: "CLAIM",
      actor: req.user,
      target: targetUser._id,
      message: `${req.user.name} requested a transfer for "${task.title}".`,
      metadata: {
        taskId: task._id,
        fromUserId: currentAssigneeId,
        toUserId: targetUser._id,
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin approval boundary for pending task transfers.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.approveTransfer = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (
      !task.transferRequest?.to ||
      task.transferRequest.status !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message: "No pending transfer request exists for this task.",
        code: "TRANSFER_NOT_PENDING",
      });
    }

    task.transferRequest.status = "approved";
    task.transferRequest.adminApproved = true;

    await task.save();

    await createAuditLog({
      action: "TASK_TRANSFER_APPROVED",
      tag: "GOVERNANCE",
      actor: req.user,
      target: task.transferRequest.to,
      message: `${req.user.name} approved a transfer for "${task.title}".`,
      metadata: {
        taskId: task._id,
        toUserId: task.transferRequest.to,
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accepts an admin-approved transfer and moves ownership to the requested user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.acceptTransfer = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (task.status !== "claimed") {
      return res.status(400).json({
        success: false,
        message: "Only actively claimed tasks can be transferred.",
        code: "TASK_NOT_TRANSFERABLE",
      });
    }

    if (
      !task.transferRequest?.to ||
      task.transferRequest.status !== "approved" ||
      !task.transferRequest.adminApproved
    ) {
      return res.status(400).json({
        success: false,
        message: "Transfer has not been approved yet.",
        code: "TRANSFER_NOT_APPROVED",
      });
    }

    if (task.transferRequest.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to accept this transfer.",
        code: "TRANSFER_NOT_ASSIGNED_TO_USER",
      });
    }

    task.assignedTo = req.user._id;
    task.claimedBy = {
      _id: req.user._id,
      name: req.user.name,
      srmRegNo: req.user.srmRegNo,
      claimedAt: new Date(),
    };
    clearTransferRequest(task);

    await task.save();

    await createAuditLog({
      action: "TASK_TRANSFER_ACCEPTED",
      tag: "CLAIM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} accepted a transfer for "${task.title}".`,
      metadata: {
        taskId: task._id,
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Allows the current assignee to release a claimed task back into the pool.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.withdrawTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (!isCurrentAssignee(task, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the active assignee can withdraw this task.",
        code: "NOT_CLAIMER",
      });
    }

    if (task.status !== "claimed") {
      return res.status(400).json({
        success: false,
        message: "Tasks under review cannot be withdrawn.",
        code: "TASK_NOT_WITHDRAWABLE",
      });
    }

    task.status = "open";
    clearAssignment(task);

    await task.save();

    await createAuditLog({
      action: "TASK_WITHDRAWN",
      tag: "CLAIM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} released "${task.title}" back to the board.`,
      metadata: {
        taskId: task._id,
        previousStatus: "claimed",
        newStatus: "open",
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin or task creator approves a task submission, assigning points to the assignee.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.approveTaskSubmission = async (req, res, next) => {
  try {
    const result = await completeTaskSubmission(req.params.id, req.user);
    return res.status(result.statusCode).json(result.payload);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin or task creator rejects a submission and returns the task to the claimed state.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
exports.rejectTaskSubmission = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
        code: "TASK_NOT_FOUND",
      });
    }

    if (!isTaskReviewer(task, req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "Only moderators, administrators, or the task creator can reject this deployment.",
        code: "FORBIDDEN",
      });
    }

    if (task.status !== "in_review") {
      return res.status(400).json({
        success: false,
        message: "Task is not in review state",
        code: "TASK_NOT_IN_REVIEW",
      });
    }

    task.status = "claimed";
    task.completedAt = null;
    task.reviewedBy = {
      _id: req.user._id,
      name: req.user.name,
    };

    await task.save();

    await createAuditLog({
      action: "TASK_REJECTED",
      tag: "GOVERNANCE",
      actor: req.user,
      target: getAssignedUserId(task),
      message: `${req.user.name} returned "${task.title}" for revision.`,
      metadata: {
        taskId: task._id,
        previousStatus: "in_review",
        newStatus: "claimed",
        reason: req.body.reason || null,
      },
    });

    return res.status(200).json({
      success: true,
      data: await loadSerializedTask(task._id),
    });
  } catch (error) {
    next(error);
  }
};

exports.approveTask = exports.approveTaskSubmission;
