const SystemConfig = require("../models/SystemConfig");
const { addDecimal, toDecimal128 } = require("./decimal.utils");

async function ensureSystemConfig({ session } = {}) {
  let query = SystemConfig.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: {
        key: "global",
        systemPoolBalance: toDecimal128(0),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  if (session) {
    query = query.session(session);
  }

  return query;
}

async function incrementSystemPoolBalance(amount, { session } = {}) {
  const systemConfig = await ensureSystemConfig({ session });
  systemConfig.systemPoolBalance = addDecimal(systemConfig.systemPoolBalance, amount);
  await systemConfig.save(session ? { session } : undefined);
  return systemConfig;
}

module.exports = {
  ensureSystemConfig,
  incrementSystemPoolBalance,
};
