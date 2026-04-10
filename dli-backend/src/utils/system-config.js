const SystemConfig = require("../models/SystemConfig");
const { addDecimal, subtractDecimal, toDecimal128 } = require("./decimal.utils");

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
      returnDocument: "after",
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

async function decrementSystemPoolBalance(amount, { session } = {}) {
  const systemConfig = await ensureSystemConfig({ session });
  systemConfig.systemPoolBalance = subtractDecimal(systemConfig.systemPoolBalance, amount);
  await systemConfig.save(session ? { session } : undefined);
  return systemConfig;
}

module.exports = {
  ensureSystemConfig,
  incrementSystemPoolBalance,
  decrementSystemPoolBalance,
};
