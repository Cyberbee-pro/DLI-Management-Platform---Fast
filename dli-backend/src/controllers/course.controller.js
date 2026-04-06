const Course = require("../models/Course");
const { serializeDocument } = require("../utils/serialize");

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
