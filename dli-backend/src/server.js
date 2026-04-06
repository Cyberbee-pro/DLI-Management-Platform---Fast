require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

if (!process.env.MONGODB_URI) {
  console.error(
    "CRITICAL: MONGODB_URI environment variable is not set. The application cannot start without a database connection.",
  );
  process.exit(1);
}

if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
  console.error(
    "CRITICAL: JWT_ACCESS_SECRET is missing or too short (minimum 32 characters). The application cannot start without a strong signing key.",
  );
  process.exit(1);
}

if (!process.env.FRONTEND_URL) {
  console.error(
    "CRITICAL: FRONTEND_URL environment variable is not set. CORS cannot be configured without an explicit origin.",
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Required for Railway/Heroku/any reverse proxy — allows express-rate-limit
// to read the real client IP from the X-Forwarded-For header instead of crashing.
app.set('trust proxy', 1);

// Apply security headers via helmet to mitigate common web vulnerabilities
app.use(helmet());

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Implement a global rate limiter to prevent abuse and brute-force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use(limiter);

// Parse incoming request bodies in JSON format
app.use(express.json());

// Main App API Routing
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/courses", require("./routes/course.routes"));
app.use("/api/v1/dashboard", require("./routes/dashboard.routes"));
app.use("/api/v1/requests", require("./routes/request.routes"));
app.use("/api/v1/tasks", require("./routes/task.routes"));
app.use("/api/v1/admin", require("./routes/admin.routes"));

// Catch-all 404 handler to prevent HTML leakage
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "Route not found", code: "NOT_FOUND" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  const isProd = process.env.NODE_ENV === "production";

  const response = {
    success: false,
    message: isProd
      ? "An internal system error occurred. Please attempt to try again later."
      : err.message,
    code: "INTERNAL_ERROR",
  };

  if (!isProd) {
    response.stack = err.stack;
  }

  res.status(500).json(response);
});

let server;

/**
 * Initializes the database connection and starts the Express web server.
 * Separating connection logic ensures we fail fast if the database is unreachable,
 * preventing the server from accepting requests it cannot serve.
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 100,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log("MongoDB connected");

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "FATAL: Failed to connect to MongoDB. Ensure your connection string is correct and the database is accessible.",
      error,
    );
    process.exit(1);
  }
}

startServer();

// Graceful Shutdown Handlers
const shutdown = () => {
  console.log("Server shutting down gracefully...");
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
