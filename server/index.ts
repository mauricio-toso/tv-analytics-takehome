/**
 * Server entrypoint (T-11). Loads .env (same convention as scripts/run-seed.js), then listens.
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

const { app } = await import("./app.ts");

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`DASH-247 API listening on http://localhost:${PORT}`);
});
