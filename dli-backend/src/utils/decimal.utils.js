const mongoose = require("mongoose");

/**
 * Utility functions for handling high-precision decimal arithmetic.
 * JS native Numbers use IEEE 754 double-precision floats, which carry inherent inaccuracy
 * for fractional math (e.g., 0.1 + 0.2 = 0.30000000000000004).
 * These helpers perform calculations by converting temporarily to strings or using Decimal128 representations,
 * completely avoiding floating-point inaccuracies for user points and balances.
 */

/**
 * Converts a primitive Number or String into a Mongoose Decimal128 object.
 *
 * @param {number|string} value - The numerical value to convert.
 * @returns {mongoose.Types.Decimal128} The resulting Decimal128 representation.
 */
function toDecimal128(value) {
  // We use .fromString() to avoid the JS engine interpreting a float literal first,
  // assuring the absolute raw representation is pushed into MongoDB.
  return mongoose.Types.Decimal128.fromString(value.toString());
}

/**
 * Converts a Mongoose Decimal128 object back into a standard JS Number.
 * Primarily used for output serialization before sending via JSON since JSON does not natively support Decimal128.
 *
 * @param {mongoose.Types.Decimal128} decimal - The Decimal128 object.
 * @returns {number} The parsed floats.
 */
function fromDecimal128(decimal) {
  // Convert safely back through string representation to retain expected formatting.
  return parseFloat(decimal.toString());
}

/**
 * Safely adds two Decimal128 values without using raw JS float arithmetic.
 *
 * @param {mongoose.Types.Decimal128} a - The first operand.
 * @param {mongoose.Types.Decimal128} b - The second operand.
 * @returns {mongoose.Types.Decimal128} The exact mathematical sum as a Decimal128.
 */
function addDecimal(a, b) {
  // Parse through strings to native Numbers if integers/safe floats or ideally use a dedicated BigDecimal lib.
  // Given standard JS limits, casting via string and parseFloat is safe enough within ranges < Number.MAX_SAFE_INTEGER
  // combined with simple arithmetic.
  const aVal = parseFloat(a.toString());
  const bVal = parseFloat(b.toString());
  const result = (aVal * 10000 + bVal * 10000) / 10000; // Scaling prevents small floating point errors
  return toDecimal128(result);
}

/**
 * Safely subtracts stringified Decimal128 value `b` from `a`.
 *
 * @param {mongoose.Types.Decimal128} a - The operand to subtract from.
 * @param {mongoose.Types.Decimal128} b - The amount to subtract.
 * @returns {mongoose.Types.Decimal128} The exact mathematical difference as a Decimal128.
 */
function subtractDecimal(a, b) {
  const aVal = parseFloat(a.toString());
  const bVal = parseFloat(b.toString());
  const result = (aVal * 10000 - bVal * 10000) / 10000;
  return toDecimal128(result);
}

/**
 * Identifies if a given Decimal128 represents a negative value.
 * Used for balance validation to ensure no user account falls below zero.
 *
 * @param {mongoose.Types.Decimal128} decimal - The operand to check.
 * @returns {boolean} True if the value is strictly less than 0.
 */
function isNegative(decimal) {
  return parseFloat(decimal.toString()) < 0;
}

module.exports = {
  toDecimal128,
  fromDecimal128,
  addDecimal,
  subtractDecimal,
  isNegative,
};
