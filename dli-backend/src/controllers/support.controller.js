const { createAuditLog } = require("../utils/audit");

exports.createSupportRequest = async (req, res, next) => {
  try {
    const { type, subject, message, contactEmail } = req.body;

    await createAuditLog({
      action: "SUPPORT_REQUEST_CREATED",
      tag: "SYSTEM",
      actor: req.user,
      target: req.user._id,
      message: `${req.user.name} submitted a ${type} support request.`,
      metadata: {
        type,
        subject: subject || null,
        message,
        contactEmail: contactEmail || req.user.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Support request transmitted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
