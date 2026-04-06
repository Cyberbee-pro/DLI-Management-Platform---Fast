const { ObjectId } = require('mongodb');
const { getDB, getClient } = require('../../config/db');
const { serializeDocument } = require('../../utils/serialize');

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function approveCourseRequest(req, res) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid course request id' });
  }

  const db = getDB();
  const client = getClient();
  const session = client.startSession();

  try {
    session.startTransaction();

    const requestId = new ObjectId(id);
    const now = new Date();

    const courseRequest = await db.collection('courserequests').findOne(
      { _id: requestId },
      { session }
    );

    if (!courseRequest) {
      throw createHttpError(404, 'Course request not found');
    }

    if (courseRequest.status !== 'pending') {
      throw createHttpError(400, 'Course request is not pending');
    }

    const course = await db.collection('courses').findOne(
      { _id: courseRequest.course._id },
      { session }
    );

    if (!course) {
      throw createHttpError(404, 'Requested course not found');
    }

    if (course.inventoryCount <= 0) {
      throw createHttpError(400, 'Course inventory is unavailable');
    }

    const adminUser = await db.collection('users').findOne(
      { _id: new ObjectId(req.user._id) },
      { session, projection: { name: 1 } }
    );

    if (!adminUser) {
      throw createHttpError(404, 'Admin user not found');
    }

    const availableCode = await db.collection('dli_codes').findOne(
      { courseId: course._id, isUsed: false },
      { session }
    );

    if (!availableCode) {
      throw createHttpError(400, 'No available DLI code for this course');
    }

    const codeUpdateResult = await db.collection('dli_codes').updateOne(
      { _id: availableCode._id, isUsed: false },
      {
        $set: {
          isUsed: true,
          usedBy: courseRequest.requestedBy._id,
          usedAt: now
        }
      },
      { session }
    );

    if (codeUpdateResult.modifiedCount !== 1) {
      throw createHttpError(409, 'Failed to reserve the DLI code');
    }

    const requestUpdateResult = await db.collection('courserequests').updateOne(
      { _id: courseRequest._id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          redemptionCode: availableCode.code,
          processedBy: {
            _id: new ObjectId(req.user._id),
            name: adminUser.name
          },
          processedAt: now,
          updatedAt: now
        }
      },
      { session }
    );

    if (requestUpdateResult.modifiedCount !== 1) {
      throw createHttpError(409, 'Failed to approve the course request');
    }

    const courseUpdateResult = await db.collection('courses').updateOne(
      { _id: course._id, inventoryCount: { $gt: 0 } },
      {
        $inc: { inventoryCount: -1 },
        $set: { updatedAt: now }
      },
      { session }
    );

    if (courseUpdateResult.modifiedCount !== 1) {
      throw createHttpError(409, 'Failed to decrement course inventory');
    }

    const userActiveCourse = {
      _id: course._id,
      title: course.title,
      pointsRequired: course.pointsRequired
    };

    const userUpdateResult = await db.collection('users').updateOne(
      { _id: courseRequest.requestedBy._id },
      {
        $set: {
          activeCourse: userActiveCourse,
          updatedAt: now
        }
      },
      { session }
    );

    if (userUpdateResult.modifiedCount !== 1) {
      throw createHttpError(409, 'Failed to update user active course');
    }

    await db.collection('auditlogs').insertOne(
      {
        action: 'COURSE_APPROVED',
        actor: {
          _id: new ObjectId(req.user._id),
          role: 'admin'
        },
        target: courseRequest.requestedBy._id,
        metadata: {
          taskId: null,
          courseId: course._id,
          courseRequestId: courseRequest._id,
          webhookId: null,
          pointsDelta: null,
          multiplierUsed: null,
          reason: null,
          previousBalance: null,
          newBalance: null,
          previousStatus: null,
          newStatus: null
        },
        timestamp: now
      },
      { session }
    );

    await session.commitTransaction();

    const approvalResult = {
      requestId: courseRequest._id,
      redemptionCode: availableCode.code,
      processedAt: now,
      course: userActiveCourse
    };

    return res.status(200).json({
      message: 'Course request approved successfully',
      approval: serializeDocument(approvalResult)
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error('[Admin] approveCourseRequest error:', error.message);

    const status = error.status || 500;
    const message = status === 500 ? 'Failed to approve course request' : error.message;

    return res.status(status).json({ error: message });
  } finally {
    session.endSession();
  }
}

module.exports = { approveCourseRequest };