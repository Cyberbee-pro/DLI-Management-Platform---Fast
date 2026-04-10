const Course = require("../models/Course");
const { serializeDocument } = require("../utils/serialize");
const { toDecimal128 } = require("../utils/decimal.utils");
const { createAuditLog } = require("../utils/audit");

/**
 * Retrieves a paginated list of active courses available in the system.
 * Allows filtering by category and level, sorted by points required ascending.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
exports.getCourses = async (req, res, next) => {
  try {
    const { category, level, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (level) filter.level = level;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .sort({ pointsRequired: 1 })
        .skip(skip)
        .limit(limitNum),
      Course.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: {
        courses: courses.map((course) => serializeDocument(course)),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new course.
 * Admin only operation. Validates that level is one of Beginner, Intermediate, Advanced.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
exports.createCourse = async (req, res, next) => {
  try {
    const {
      title,
      description,
      pointsRequired,
      imageUrl,
      courseUrl,
      category,
      level,
      provider,
      inventoryCount = 0,
    } = req.body;

    // Validate level is one of the allowed values
    if (!["Beginner", "Intermediate", "Advanced"].includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid level. Must be Beginner, Intermediate, or Advanced",
        code: "INVALID_LEVEL",
      });
    }

    const newCourse = new Course({
      title,
      description,
      pointsRequired: toDecimal128(Number(pointsRequired)),
      imageUrl,
      courseUrl,
      category,
      level,
      provider,
      inventoryCount: Math.max(0, parseInt(inventoryCount, 10) || 0),
      isActive: true,
    });

    await newCourse.save();

    await createAuditLog({
      action: "COURSE_CREATED",
      tag: "SYSTEM",
      actor: req.user,
      target: newCourse._id,
      message: `Admin ${req.user.name} created course "${newCourse.title}".`,
      metadata: {
        courseId: newCourse._id,
        level: newCourse.level,
        pointsRequired: newCourse.pointsRequired,
      },
    });

    return res.status(201).json({
      success: true,
      data: serializeDocument(newCourse),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing course.
 * Admin only operation. Validates level and pointsRequired if provided.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, pointsRequired, imageUrl, courseUrl, category, level, isActive } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
        code: "COURSE_NOT_FOUND",
      });
    }

    // Validate level if provided
    if (level && !["Beginner", "Intermediate", "Advanced"].includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid level. Must be Beginner, Intermediate, or Advanced",
        code: "INVALID_LEVEL",
      });
    }

    // Update fields
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (pointsRequired !== undefined) course.pointsRequired = toDecimal128(Number(pointsRequired));
    if (imageUrl !== undefined) course.imageUrl = imageUrl;
    if (courseUrl !== undefined) course.courseUrl = courseUrl;
    if (category !== undefined) course.category = category;
    if (level !== undefined) course.level = level;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    await createAuditLog({
      action: "COURSE_UPDATED",
      tag: "SYSTEM",
      actor: req.user,
      target: course._id,
      message: `Admin ${req.user.name} updated course "${course.title}".`,
      metadata: {
        courseId: course._id,
        level: course.level,
        pointsRequired: course.pointsRequired,
      },
    });

    return res.status(200).json({
      success: true,
      data: serializeDocument(course),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a course.
 * Admin only operation. Sets isActive to false instead of hard delete.
 *
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
        code: "COURSE_NOT_FOUND",
      });
    }

    course.isActive = false;
    await course.save();

    await createAuditLog({
      action: "COURSE_DELETED",
      tag: "SYSTEM",
      actor: req.user,
      target: course._id,
      message: `Admin ${req.user.name} deleted course "${course.title}".`,
      metadata: {
        courseId: course._id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
