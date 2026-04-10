const Notification = require("../models/Notification");
const { serializeDocument } = require("../utils/serialize");

exports.getMyNotifications = async (req, res, next) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 12;
    const limit = Math.min(Math.max(requestedLimit, 1), 50);

    const notifications = await Notification.find({
      userId: req.user._id,
      channel: "in_app",
    })
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      channel: "in_app",
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications: serializeDocument(notifications),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
