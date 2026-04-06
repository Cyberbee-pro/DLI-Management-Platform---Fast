const mongoose = require("mongoose");

/**
 * Standardizes API responses across the entire lifecycle by explicitly converting
 * Mongoose documents to standard JS structures and sanitizing data types.
 *
 * This prevents implicit `toJSON()` conversions inside Express that might otherwise
 * result in messy objects (like MongoDB ObjectIds sent as nested objects or Decimal128s sent as `{ $numberDecimal: "..." }`).
 *
 * @param {Object|mongoose.Document|Array} doc - The Mongoose document footprint or plain JS object.
 * @returns {Object|Array|string|number} A deeply sanitized JS equivalent formatted perfectly for standard JSON REST APIs.
 */
function serializeDocument(doc) {
  // Base case for null or undefined outputs.
  if (doc === null || doc === undefined) {
    return doc;
  }

  // If we receive a live Mongoose document, unwrap it to a POJO first to avoid iterating over prototypes
  if (typeof doc.toObject === "function") {
    doc = doc.toObject();
  }

  // Handle Arrays recursively.
  if (Array.isArray(doc)) {
    return doc.map((item) => serializeDocument(item));
  }

  // Handle Mongoose ObjectIds consistently as flat strings
  if (
    doc instanceof mongoose.Types.ObjectId ||
    (doc.constructor && doc.constructor.name === "ObjectID")
  ) {
    return doc.toString();
  }

  // Convert Decimal128 directly to JS primitive Numbers so frontend systems don't receive wrapping BSON objects
  if (
    doc instanceof mongoose.Types.Decimal128 ||
    (doc.constructor && doc.constructor.name === "Decimal128")
  ) {
    return parseFloat(doc.toString());
  }

  // Convert Dates to UTC ISO strings for unambiguous global tracking
  if (doc instanceof Date) {
    return doc.toISOString();
  }

  // Deep traversal of generic nested objects
  if (typeof doc === "object") {
    const serializedObject = {};
    for (const [key, value] of Object.entries(doc)) {
      serializedObject[key] = serializeDocument(value);
    }
    return serializedObject;
  }

  // Any raw primitives like generic strings, booleans, or regular JS numbers return as-is
  return doc;
}

module.exports = {
  serializeDocument,
};
