// File: src/controllers/auth.controller.js

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { serializeDocument } = require("../utils/serialize");
const { toDecimal128 } = require("../utils/decimal.utils");

/**
 * Controller enforcing authentication mechanics gracefully.
 * Abstracts lookup, password brute-forcing mitigation checking via bcrypt, JWT formatting,
 * and tracks lastLoginAt explicitly for idle analysis and account lifecycles.
 *
 * Never broadcasts what individually went wrong in 'INVALID_CREDENTIALS' to avoid enumeration.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account permanently disabled",
        code: "USER_BANNED",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Account temporarily suspended",
        code: "USER_SUSPENDED",
      });
    }

    // Refresh lastLoginAt so dormant sweeps and engagement tracking remains accurate asynchronously.
    user.lastLoginAt = new Date();
    await user.save();

    // Payload explicitly limits token size and prevents accidental inclusion of points or passwords via serialize properties.
    const payload = {
      _id: user._id.toString(),
      role: user.role,
      srmRegNo: user.srmRegNo,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: serializeDocument(user),
      },
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    const errorData = isProduction ? null : error.stack || error.message;

    res.status(500).json({
      success: false,
      message:
        "An internal system error occurred. Please attempt to login again later.",
      code: "INTERNAL_SERVER_ERROR",
      ...(errorData && { details: errorData }),
    });
  }
}

/**
 * Controller enforcing new user creation gracefully.
 * Abstracts lookup for existing values, hashing, and role default allocation.
 * Returns JWT immediately to bypass friction.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function register(req, res) {
  try {
    const { name, email, srmRegNo, password } = req.body;

    const existingUser = await User.findOne({ 
      $or: [{ email }, { srmRegNo }] 
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or Registration Number already exists",
        code: "USER_EXISTS",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      srmRegNo,
      passwordHash,
      role: "member",
      points: {
        balance: toDecimal128(0),
        totalEarned: toDecimal128(0),
        totalSpent: toDecimal128(0),
        negativeAccrued: toDecimal128(0),
      },
    });

    await user.save();

    const payload = {
      _id: user._id.toString(),
      role: user.role,
      srmRegNo: user.srmRegNo,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: serializeDocument(user),
      },
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      success: false,
      message: "An internal system error occurred.",
      code: "INTERNAL_SERVER_ERROR",
      ...(!isProduction && { details: error.stack || error.message }),
    });
  }
}

/**
 * One-shot admin bootstrap — creates the first admin account when none exists.
 * Requires BOOTSTRAP_KEY env var to match the request body's bootstrapKey.
 * Once an admin exists, this endpoint permanently returns 403.
 * Remove BOOTSTRAP_KEY from env after use to fully disable.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function bootstrapAdmin(req, res) {
  try {
    const { bootstrapKey, name, email, srmRegNo, password } = req.body;

    if (!process.env.BOOTSTRAP_KEY) {
      return res.status(403).json({
        success: false,
        message: "Bootstrap is disabled (BOOTSTRAP_KEY not configured)",
        code: "BOOTSTRAP_DISABLED",
      });
    }

    if (bootstrapKey !== process.env.BOOTSTRAP_KEY) {
      return res.status(403).json({
        success: false,
        message: "Invalid bootstrap key",
        code: "INVALID_BOOTSTRAP_KEY",
      });
    }

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: "An admin account already exists. Bootstrap is locked.",
        code: "ADMIN_EXISTS",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = new User({
      name,
      email,
      srmRegNo,
      passwordHash,
      role: "admin",
      points: {
        balance: toDecimal128(0),
        totalEarned: toDecimal128(0),
        totalSpent: toDecimal128(0),
        negativeAccrued: toDecimal128(0),
      },
    });

    await admin.save();

    res.status(201).json({
      success: true,
      data: {
        message: "Admin account created. Remove BOOTSTRAP_KEY from your environment to permanently disable this endpoint.",
        user: serializeDocument(admin),
      },
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      success: false,
      message: "Failed to bootstrap admin account.",
      code: "INTERNAL_SERVER_ERROR",
      ...(!isProduction && { details: error.stack || error.message }),
    });
  }
}

module.exports = {
  login,
  register,
  bootstrapAdmin,
};
