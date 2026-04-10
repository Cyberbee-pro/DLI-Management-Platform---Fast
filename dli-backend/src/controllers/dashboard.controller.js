const User = require("../models/User");
const CourseRequest = require("../models/CourseRequest");
const Task = require("../models/Task");
const { getRecentPointsStanding } = require("../utils/points-standing");
const { serializeDocument } = require("../utils/serialize");
const { ensureSystemConfig } = require("../utils/system-config");

function withTaskRelations(query) {
  return query
    .populate("assignedTo", "name role avatarUrl srmRegNo")
    .populate("transferRequest.from", "name role avatarUrl")
    .populate("transferRequest.to", "name role avatarUrl");
}

function serializeTaskWithSubmission(task) {
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

/**
 * Fetches the dashboard properties for the authenticated user, excluding passwords.
 * Aggregates their personal course requests and claimed tasks, sorted by recent activity.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
exports.getMyDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch user document and explicitly drop the hash from the projection
    const user = await User.findById(userId).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account could not be found.",
        code: "USER_NOT_FOUND",
      });
    }

    const governanceTaskFilter =
      user.role === "admin"
        ? { status: "in_review" }
        : {
            status: "in_review",
            "createdBy._id": userId,
          };

    const [
      courseRequests,
      claimedTasks,
      pendingTaskApprovals,
      rawPendingCourseApprovals,
      systemConfig,
    ] = await Promise.all([
      CourseRequest.find({ "requestedBy._id": userId }).sort({ requestedAt: -1 }),
      withTaskRelations(
        Task.find({
          status: { $in: ["claimed", "in_review"] },
          $or: [
            { assignedTo: userId },
            { "claimedBy._id": userId },
            {
              "transferRequest.to": userId,
              "transferRequest.adminApproved": true,
              "transferRequest.status": "approved",
            },
          ],
        }).sort({ updatedAt: -1 }),
      ),
      withTaskRelations(Task.find(governanceTaskFilter).sort({ updatedAt: -1 })),
      user.role === "admin"
        ? CourseRequest.find({ status: "pending" }).sort({ requestedAt: -1 })
        : Promise.resolve([]),
      user.role === "admin" ? ensureSystemConfig() : Promise.resolve(null),
    ]);

    const pendingCourseApprovals = await Promise.all(
      rawPendingCourseApprovals.map(async (request) => ({
        ...serializeDocument(request),
        standing: await getRecentPointsStanding(request.requestedBy._id),
      })),
    );
    const serializedPendingTaskApprovals = pendingTaskApprovals.map((task) =>
      serializeTaskWithSubmission(task),
    );
    const canReviewTasks =
      user.role === "admin" || serializedPendingTaskApprovals.length > 0;
    const canReviewCourses = user.role === "admin";

    res.status(200).json({
      success: true,
      data: {
        user: serializeDocument(user),
        courseRequests: courseRequests.map((cr) => serializeDocument(cr)),
        claimedTasks: claimedTasks.map((task) => serializeTaskWithSubmission(task)),
        activeTasks: claimedTasks.map((task) => serializeTaskWithSubmission(task)),
        governance: {
          canReviewTasks,
          canReviewCourses,
          pendingTaskApprovals: serializedPendingTaskApprovals,
          pendingCourseApprovals,
        },
        systemConfig: systemConfig ? serializeDocument(systemConfig) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
