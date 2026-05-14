// src/index.js
// sets up Express, registers middleware, and starts the server.

require("dotenv").config();
const express = require("express");
const webhookRouter = require("./routes/webhook");

// check if the API key is present
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "[FATAL] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key."
  );
  process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());

// Log every inbound request
app.use((req, _res, next) => {
  console.log(`-> ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/webhook", webhookRouter);

// Health check - useful for uptime monitoring and quick smoke tests
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler 
app.use((err, _req, res, _next) => {
  console.error("[Unhandled error]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Nistula Guest Handler running on http://localhost:${PORT}`);
});