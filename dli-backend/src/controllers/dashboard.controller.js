const User = require("../models/User");
const CourseRequest = require("../models/CourseRequest");
const Task = require("../models/Task");
const { serializeDocument } = require("../utils/serialize");

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

    // The task model stores assignment in claimedBy._id, not assignedTo.
    // Keep activeTasks as a backward-compatible alias while adding claimedTasks explicitly.
    const [courseRequests, claimedTasks] = await Promise.all([
      CourseRequest.find({ requestedBy: userId }).sort({ requestedAt: -1 }),
      Task.find({
        "claimedBy._id": userId,
        status: { $in: ["claimed", "in_review"] },
      }).sort({ updatedAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: serializeDocument(user),
        courseRequests: courseRequests.map((cr) => serializeDocument(cr)),
        claimedTasks: claimedTasks.map((task) => serializeDocument(task)),
        activeTasks: claimedTasks.map((task) => serializeDocument(task)),
      },
    });
  } catch (error) {
    next(error);
  }
};
