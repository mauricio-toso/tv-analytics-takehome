#!/usr/bin/env node
// Loads seed/seed.sql verbatim into Postgres via docker compose exec psql
// No transformation, no cleaning, no dedupe — the messiness is the test material

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

// Get database connection parameters from environment
const database = process.env.POSTGRES_DB || "dash247";
const user = process.env.POSTGRES_USER || "dash247";

// Path to the seed file
const seedPath = path.join(__dirname, "..", "seed", "seed.sql");

// Verify seed file exists
if (!fs.existsSync(seedPath)) {
  console.error("Error: seed/seed.sql not found");
  process.exit(1);
}

// Read the seed file
const seedSQL = fs.readFileSync(seedPath, "utf8");

console.log("Loading seed data from seed/seed.sql...");

// Execute via docker compose exec psql with stdin
const psql = spawn(
  "docker",
  ["compose", "exec", "-T", "postgres", "psql", "-U", user, "-d", database],
  {
    stdio: ["pipe", "inherit", "inherit"],
  },
);

// Write the SQL to psql's stdin
psql.stdin.write(seedSQL);
psql.stdin.end();

psql.on("exit", (code) => {
  if (code === 0) {
    console.log("Seed data loaded successfully.");
  } else {
    console.error(`Seed loading failed with exit code ${code}`);
  }
  process.exit(code);
});

psql.on("error", (err) => {
  console.error("Error executing docker compose:", err.message);
  process.exit(1);
});
