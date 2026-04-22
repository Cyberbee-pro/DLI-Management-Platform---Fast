const SystemConfig = require("../models/SystemConfig");
const { serializeDocument } = require("./serialize");
const { toDecimal128 } = require("./decimal.utils");

const GLOBAL_SYSTEM_CONFIG_KEY = "global";
const DEFAULT_DECIMAL = toDecimal128(0);

class InsufficientRewardPoolError extends Error {
  constructor(message = "Insufficient points in the System Pool.") {
    super(message);
    this.name = "InsufficientRewardPoolError";
    this.statusCode = 400;
    this.code = "INSUFFICIENT_SYSTEM_POOL";
  }
}

function normalizeAmount(amount) {
  const rawValue =
    typeof amount === "number"
      ? amount
      : Number.parseFloat(amount?.toString?.() ?? `${amount ?? 0}`);

  if (!Number.isFinite(rawValue) || rawValue < 0) {
    throw new TypeError("System pool amounts must be finite positive numbers.");
  }

  return rawValue;
}

function toNegativeDecimal128(amount) {
  return toDecimal128(-normalizeAmount(amount));
}

function buildSessionQuery(query, session) {
  return session ? query.session(session) : query;
}

function serializeSystemConfig(systemConfig) {
  if (!systemConfig) {
    return null;
  }

  const serializedConfig = serializeDocument(systemConfig);
  const rewardPoolBalance =
    serializedConfig.rewardPoolBalance ?? serializedConfig.systemPoolBalance ?? 0;

  return {
    ...serializedConfig,
    rewardPoolBalance,
    systemPoolBalance: rewardPoolBalance,
    totalPointsIssued: serializedConfig.totalPointsIssued ?? 0,
  };
}

async function ensureSystemConfig({ session } = {}) {
  let query = SystemConfig.findOneAndUpdate(
    { key: GLOBAL_SYSTEM_CONFIG_KEY },
    {
      $setOnInsert: {
        key: GLOBAL_SYSTEM_CONFIG_KEY,
        systemPoolBalance: DEFAULT_DECIMAL,
        rewardPoolBalance: DEFAULT_DECIMAL,
        totalPointsIssued: DEFAULT_DECIMAL,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  query = buildSessionQuery(query, session);

  let systemConfig = await query;

  const resolvedRewardPoolBalance =
    systemConfig.rewardPoolBalance ?? systemConfig.systemPoolBalance ?? DEFAULT_DECIMAL;
  const patch = {};

  if (!systemConfig.rewardPoolBalance) {
    patch.rewardPoolBalance = resolvedRewardPoolBalance;
  }

  if (!systemConfig.totalPointsIssued) {
    patch.totalPointsIssued = DEFAULT_DECIMAL;
  }

  if (
    !systemConfig.systemPoolBalance ||
    systemConfig.systemPoolBalance.toString() !== resolvedRewardPoolBalance.toString()
  ) {
    patch.systemPoolBalance = resolvedRewardPoolBalance;
  }

  if (Object.keys(patch).length === 0) {
    return systemConfig;
  }

  let patchQuery = SystemConfig.findOneAndUpdate(
    { _id: systemConfig._id },
    { $set: patch },
    { returnDocument: "after" },
  );

  patchQuery = buildSessionQuery(patchQuery, session);
  systemConfig = await patchQuery;

  return systemConfig;
}

async function consumeRewardPool(amount, { session, trackIssued = true } = {}) {
  const normalizedAmount = normalizeAmount(amount);
  const decimalAmount = toDecimal128(normalizedAmount);

  await ensureSystemConfig({ session });

  const incrementPayload = {
    rewardPoolBalance: toNegativeDecimal128(normalizedAmount),
    systemPoolBalance: toNegativeDecimal128(normalizedAmount),
  };

  if (trackIssued) {
    incrementPayload.totalPointsIssued = decimalAmount;
  }

  // System Pool is now informational only. Governance actions must not be blocked
  // by the current balance, so we always apply the atomic decrement.
  let query = SystemConfig.findOneAndUpdate(
    { key: GLOBAL_SYSTEM_CONFIG_KEY },
    {
      $inc: incrementPayload,
    },
    {
      returnDocument: "after",
    },
  );

  query = buildSessionQuery(query, session);

  const systemConfig = await query;

  return systemConfig;
}

async function refundRewardPool(amount, { session } = {}) {
  const normalizedAmount = normalizeAmount(amount);
  const decimalAmount = toDecimal128(normalizedAmount);

  await ensureSystemConfig({ session });

  let query = SystemConfig.findOneAndUpdate(
    { key: GLOBAL_SYSTEM_CONFIG_KEY },
    {
      $inc: {
        rewardPoolBalance: decimalAmount,
        systemPoolBalance: decimalAmount,
      },
    },
    {
      returnDocument: "after",
    },
  );

  query = buildSessionQuery(query, session);

  return query;
}

async function incrementSystemPoolBalance(amount, options = {}) {
  return refundRewardPool(amount, options);
}

async function decrementSystemPoolBalance(amount, { session } = {}) {
  return consumeRewardPool(amount, { session, trackIssued: false });
}

module.exports = {
  InsufficientRewardPoolError,
  ensureSystemConfig,
  serializeSystemConfig,
  consumeRewardPool,
  refundRewardPool,
  incrementSystemPoolBalance,
  decrementSystemPoolBalance,
};
