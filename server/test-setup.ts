/**
 * Vitest global setup for integration tests (T-12).
 *
 * Loads .env the same way server/index.ts does, so server/db/pool.ts picks up
 * POSTGRES_PORT etc. for the dockerized Postgres (host port from docker-compose.yml,
 * not the in-container default 5432 that server/db/pool.ts falls back to). Without
 * this, integration tests connecting through server/app.ts would silently try the
 * wrong port and fail with a connection error rather than a useful assertion failure.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
try {
  process.loadEnvFile(envPath);
} catch {
  // .env is optional; defaults in server/db/pool.ts cover local dev.
}
