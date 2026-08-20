/**
 * Postgres connection pool (T-11).
 *
 * Single shared `pg.Pool`, configured from the same env vars used everywhere else in this repo
 * (.env.example, docker-compose.yml, scripts/run-seed.js): POSTGRES_HOST/PORT/DB/USER/PASSWORD.
 * No ORM (PLAN §6) — this is the only piece of connection plumbing the route layer needs.
 */
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "dash247",
  user: process.env.POSTGRES_USER || "dash247",
  password: process.env.POSTGRES_PASSWORD || "dash247_dev",
});
