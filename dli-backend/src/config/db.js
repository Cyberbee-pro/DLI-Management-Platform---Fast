const { MongoClient } = require('mongodb');

const DEFAULT_RETRY_ATTEMPTS = Number(process.env.MONGODB_MAX_RETRIES || 5);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.MONGODB_RETRY_DELAY_MS || 2000);

let client = null;
let db = null;
let connectPromise = null;
let shutdownPromise = null;
let hooksRegistered = false;

function getMongoUri() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  return process.env.MONGODB_URI;
}

function getDatabaseName() {
  const uri = new URL(getMongoUri());
  const databaseNameFromUri = uri.pathname.replace(/^\//, '');

  return databaseNameFromUri || process.env.DATABASE_NAME || 'bounty_board';
}

function createClient() {
  return new MongoClient(getMongoUri(), {
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
    minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || 0),
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 10000),
    retryWrites: true
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptConnection(attempt = 1) {
  client = createClient();

  try {
    await client.connect();
    db = client.db(getDatabaseName());
    return db;
  } catch (error) {
    await client.close().catch(() => {});
    client = null;

    if (attempt >= DEFAULT_RETRY_ATTEMPTS) {
      throw new Error(
        `Failed to connect to MongoDB after ${DEFAULT_RETRY_ATTEMPTS} attempts: ${error.message}`
      );
    }

    console.error(
      `[DB] Connection attempt ${attempt} failed. Retrying in ${DEFAULT_RETRY_DELAY_MS}ms...`
    );
    await wait(DEFAULT_RETRY_DELAY_MS);

    return attemptConnection(attempt + 1);
  }
}

function registerShutdownHandlers() {
  if (hooksRegistered) {
    return;
  }

  hooksRegistered = true;

  const handleShutdown = async (signal) => {
    try {
      await closeDB(signal);
      process.exit(0);
    } catch (error) {
      console.error(`[DB] Error during ${signal} shutdown:`, error.message);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => handleShutdown('SIGINT'));
  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
}

/**
 * @returns {Promise<import('mongodb').Db>}
 */
async function connectDB() {
  if (db) {
    return db;
  }

  if (!connectPromise) {
    registerShutdownHandlers();
    connectPromise = attemptConnection().catch((error) => {
      connectPromise = null;
      throw error;
    });
  }

  return connectPromise;
}

/**
 * @returns {import('mongodb').Db}
 * @throws {Error} If database not initialized
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }

  return db;
}

/**
 * @returns {import('mongodb').MongoClient}
 * @throws {Error} If client not initialized
 */
function getClient() {
  if (!client) {
    throw new Error('MongoDB client not initialized. Call connectDB() first.');
  }

  return client;
}

async function closeDB(reason = 'manual shutdown') {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    if (client) {
      console.log(`[DB] Closing MongoDB connection (${reason})`);
      await client.close();
    }

    client = null;
    db = null;
    connectPromise = null;
    shutdownPromise = null;
  })();

  return shutdownPromise;
}

module.exports = { connectDB, getDB, getClient, closeDB };
