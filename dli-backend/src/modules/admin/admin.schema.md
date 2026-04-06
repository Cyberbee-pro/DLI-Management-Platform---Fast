const auditLogsSchema = {
  bsonType: 'object',
  title: 'auditlogs',
  additionalProperties: false,
  required: ['action', 'target', 'actor', 'metadata', 'timestamp'],
  properties: {
    _id: { bsonType: 'objectId' },
    action: {
      enum: [
        'POINTS_EARNED',
        'POINTS_SPENT',
        'POINTS_ISSUED',
        'PENALTY_APPLIED',
        'TASK_CLAIMED',
        'TASK_COMPLETED',
        'TASK_TRANSFER_REQUESTED',
        'TASK_TRANSFER_ACCEPTED',
        'TASK_TRANSFER_REJECTED',
        'COURSE_REQUESTED',
        'COURSE_APPROVED',
        'COURSE_REJECTED',
        'USER_CREATED',
        'ROLE_CHANGED',
        'SUBROLE_CHANGED',
        'USER_BANNED',
        'USER_UNBANNED',
        'USER_SUSPENDED',
        'USER_UNSUSPENDED'
      ]
    },
    target: { bsonType: 'objectId' },
    actor: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['_id', 'role'],
      properties: {
        _id: { bsonType: ['objectId', 'null'] },
        role: { bsonType: ['string', 'null'] }
      }
    },
    metadata: {
      bsonType: 'object',
      additionalProperties: false,
      required: [
        'taskId',
        'courseId',
        'courseRequestId',
        'webhookId',
        'pointsDelta',
        'multiplierUsed',
        'reason',
        'previousBalance',
        'newBalance',
        'previousStatus',
        'newStatus'
      ],
      properties: {
        taskId: { bsonType: ['objectId', 'null'] },
        courseId: { bsonType: ['objectId', 'null'] },
        courseRequestId: { bsonType: ['objectId', 'null'] },
        webhookId: { bsonType: ['objectId', 'null'] },
        pointsDelta: { bsonType: ['decimal', 'null'] },
        multiplierUsed: { bsonType: ['decimal', 'null'] },
        reason: { bsonType: ['string', 'null'] },
        previousBalance: { bsonType: ['decimal', 'null'] },
        newBalance: { bsonType: ['decimal', 'null'] },
        previousStatus: { bsonType: ['string', 'null'] },
        newStatus: { bsonType: ['string', 'null'] }
      }
    },
    timestamp: { bsonType: 'date' }
  }
};

const webhooksSchema = {
  bsonType: 'object',
  title: 'webhooks',
  additionalProperties: false,
  required: [
    'repoUrl',
    'branch',
    'secret',
    'isActive',
    'triggerOn',
    'pointMapping',
    'createdBy',
    'createdAt',
    'updatedAt'
  ],
  properties: {
    _id: { bsonType: 'objectId' },
    repoUrl: { bsonType: 'string' },
    branch: { bsonType: 'string' },
    secret: { bsonType: 'string' },
    isActive: { bsonType: 'bool' },
    triggerOn: { enum: ['pr_merged', 'issue_closed'] },
    pointMapping: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['taskCategory', 'basePoints', 'autoApprove'],
      properties: {
        taskCategory: { bsonType: ['string', 'null'] },
        basePoints: { bsonType: ['decimal', 'null'] },
        autoApprove: { bsonType: 'bool' }
      }
    },
    createdBy: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['_id', 'name'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string' }
      }
    },
    createdAt: { bsonType: 'date' },
    updatedAt: { bsonType: 'date' }
  }
};

const notificationsSchema = {
  bsonType: 'object',
  title: 'notifications',
  additionalProperties: false,
  required: ['userId', 'type', 'channel', 'message', 'metadata', 'isRead', 'sentAt'],
  properties: {
    _id: { bsonType: 'objectId' },
    userId: { bsonType: 'objectId' },
    type: {
      enum: [
        'DEADLINE_REMINDER',
        'HOT_BOUNTY',
        'POINTS_APPROVED',
        'TASK_TRANSFER',
        'COURSE_APPROVED'
      ]
    },
    channel: { enum: ['email', 'discord', 'slack'] },
    message: { bsonType: 'string' },
    metadata: {
      bsonType: 'object',
      additionalProperties: false,
      required: ['taskId', 'courseId'],
      properties: {
        taskId: { bsonType: ['objectId', 'null'] },
        courseId: { bsonType: ['objectId', 'null'] }
      }
    },
    isRead: { bsonType: 'bool' },
    sentAt: { bsonType: 'date' }
  }
};

module.exports = { auditLogsSchema, webhooksSchema, notificationsSchema };
