const mongoose = require("mongoose");

/**
 * Project schema mapping to the `projects` collection.
 * Serves as the structural root holding references mapping nested RBAC
 * for teams/tasks, with leaders defining point-pools separately.
 */
const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Strictly avoids namespace overlapping projects spanning multiple scopes
    },
    description: {
      type: String,
      default: null,
    },
    repoUrl: {
      type: String,
      default: null,
    },
    lead: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      srmRegNo: {
        type: String,
        required: true,
      },
    },
    members: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        srmRegNo: {
          type: String,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indices
projectSchema.index({ name: 1 }, { unique: true });
projectSchema.index({ "lead._id": 1 }); // Leader query
projectSchema.index({ "members._id": 1 }); // Contributor listing query
projectSchema.index({ isActive: 1 }); // Open projects view

module.exports = mongoose.model("Project", projectSchema);
