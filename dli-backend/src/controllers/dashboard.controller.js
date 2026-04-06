const User = require("../models/User");
const CourseRequest = require("../models/CourseRequest");
const Task = require("../models/Task");
const { serializeDocument } = require("../utils/serialize");

/**
 * Fetches the dashboard properties for the authenticated user, excluding passwords.
 * Aggregates their personal course requests and active tasks, sorted by recent activity.
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

    // Parallel fetch for user's courses and claimed tasks
    const [courseRequests, activeTasks] = await Promise.all([
      CourseRequest.find({ requestedBy: userId }).sort({ requestedAt: -1 }),
      Task.find({ claimedBy: userId }).sort({ updatedAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: serializeDocument(user),
        courseRequests: courseRequests.map((cr) => serializeDocument(cr)),
        activeTasks: activeTasks.map((task) => serializeDocument(task)),
      },
    });
  } catch (error) {
    next(error);
  }
};
