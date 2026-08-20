#!/usr/bin/env node
// Wrapper to run node-pg-migrate with environment variables set
// Cross-platform alternative to inline env vars in package.json scripts

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load .env file if it exists (using Node's built-in process.loadEnvFile, available in Node 20.12+)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    // Fallback for older Node versions - .env is optional, defaults will work
    console.warn("Warning: Could not load .env file:", err.message);
  }
}

// Set environment variables for the pg connection
// These match the .env.example defaults for local development
const host = process.env.POSTGRES_HOST || "localhost";
const port = process.env.POSTGRES_PORT || "5432";
const database = process.env.POSTGRES_DB || "dash247";
const user = process.env.POSTGRES_USER || "dash247";
const password = process.env.POSTGRES_PASSWORD || "dash247_dev";

// Construct DATABASE_URL that node-pg-migrate expects
process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}`;

// Run node-pg-migrate with arguments passed through
const npxPath =
  process.platform === "win32" ? "node-pg-migrate.cmd" : "node-pg-migrate";
const migrateBin = path.join(__dirname, "..", "node_modules", ".bin", npxPath);

// Add --ignore-pattern to exclude schema.reference.sql (T-02 reference artifact)
const args = [
  ...process.argv.slice(2),
  "--ignore-pattern",
  "schema\\.reference\\.sql",
];

const migrate = spawn(migrateBin, args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

migrate.on("exit", (code) => {
  process.exit(code);
});
