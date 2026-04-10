const User = require("../models/User");
const { serializeDocument } = require("../utils/serialize");
const { createAuditLog } = require("../utils/audit");
const { getMissingProfileVectors } = require("../utils/profile");

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeOptionalUrl(value, label) {
  const trimmedValue = normalizeString(value);

  if (!trimmedValue) {
    return null;
  }

  const normalizedUrl = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.toString();
  } catch (_error) {
    throw new Error(`${label} must be a valid URL.`);
  }
}

function buildUploadUrl(req, file) {
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
}

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    const serializedUser = serializeDocument(user);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...serializedUser,
          missingProfileVectors: getMissingProfileVectors(serializedUser),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        code: "USER_NOT_FOUND",
      });
    }

    user.githubUsername = normalizeString(req.body.githubUsername)?.replace(/^@/, "") ?? null;
    user.linkedinUrl = normalizeOptionalUrl(req.body.linkedinUrl, "LinkedIn URL");
    user.instagramUrl = normalizeOptionalUrl(req.body.instagramUrl, "Instagram URL");
    user.websiteUrl = normalizeOptionalUrl(req.body.websiteUrl, "Website URL");

    if (typeof req.body.emailNotifications === "string") {
      user.notificationPrefs.email = req.body.emailNotifications === "true";
    }

    const files = req.files || {};
    const avatarFile = Array.isArray(files.avatar) ? files.avatar[0] : null;
    const resumeFile = Array.isArray(files.resume) ? files.resume[0] : null;

    if (avatarFile) {
      user.avatarUrl = buildUploadUrl(req, avatarFile);
    }

    if (resumeFile) {
      user.resumeUrl = buildUploadUrl(req, resumeFile);
    }

    await user.save();

    const serializedUser = serializeDocument(user);
    const missingProfileVectors = getMissingProfileVectors(serializedUser);

    await createAuditLog({
      action: "PROFILE_UPDATED",
      tag: "PROFILE",
      actor: req.user,
      target: user._id,
      message: `${user.name} updated their professional node profile.`,
      metadata: {
        githubUsername: serializedUser.githubUsername,
        missingProfileVectors,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...serializedUser,
          missingProfileVectors,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && /valid URL|uploads must/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INVALID_PROFILE_INPUT",
      });
    }

    next(error);
  }
};
