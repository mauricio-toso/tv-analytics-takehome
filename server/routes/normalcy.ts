/**
 * GET /api/accounts/:id/normalcy?eventType=&weekStart= (T-11)
 *
 * Imperative shell, three steps, no branching logic hidden anywhere else:
 *   1. validate the three boundary params by hand (~12 lines, no zod — PLAN §6);
 *   2. query (server/db/queries.ts, T-07/T-08) → domain (server/domain/baseline.ts, T-09);
 *   3. shape the response and send it.
 *
 * Contract (project-conventions.md → API contract):
 *   - invalid param            → 400 with a message, never silent coercion;
 *   - unknown account          → 404;
 *   - account with no events   → well-formed 200, explicit empty `locations: []`.
 */
import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "../db/pool.ts";
import {
  getAccountById,
  getWeeklyBucketedEventsWithZeroFill,
} from "../db/queries.ts";
import { judgeWeek } from "../domain/baseline.ts";

export const normalcyRouter = Router();

/** The only three event types present in the schema/seed (migrations/1700000000000_initial-schema.sql). */
const VALID_EVENT_TYPES = new Set([
  "call_received",
  "lead_created",
  "appointment_set",
]);

/** Date-shaped check for weekStart: YYYY-MM-DD, and a real calendar date. No timezone or week-boundary
 *  logic here — SQL alone decides what "the week" means (constitution: week boundaries in SQL only).
 *  We only reject garbage before it reaches the database. */
const WEEK_START_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeekStart(value: string): boolean {
  if (!WEEK_START_SHAPE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

normalcyRouter.get(
  "/api/accounts/:id/normalcy",
  async (req: Request, res: Response) => {
    // --- 1. hand-written validation of the three boundary params ---
    const accountIdRaw = req.params.id;
    if (!/^\d+$/.test(accountIdRaw)) {
      return res
        .status(400)
        .json({ error: `invalid account id: ${accountIdRaw}` });
    }
    const accountId = Number(accountIdRaw);

    const eventType = req.query.eventType;
    if (typeof eventType !== "string" || !VALID_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({
        error: `invalid eventType: expected one of ${[...VALID_EVENT_TYPES].join(", ")}`,
      });
    }

    const weekStart = req.query.weekStart;
    if (typeof weekStart !== "string" || !isValidWeekStart(weekStart)) {
      return res
        .status(400)
        .json({ error: `invalid weekStart: expected a YYYY-MM-DD date` });
    }

    // --- 2a. account existence + timezone (also the 404 check) ---
    const accountResult = await pool.query(getAccountById, [accountId]);
    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: `unknown account: ${accountId}` });
    }
    const timezone: string = accountResult.rows[0].timezone;

    // --- 2b. weekly bucketed counts (T-08) ---
    const bucketResult = await pool.query(getWeeklyBucketedEventsWithZeroFill, [
      accountId,
      eventType,
      weekStart,
    ]);

    // Group the flat (location, week_start, event_count) rows into per-location series.
    // Rows arrive ORDER BY location, week_start DESC — so within a location, row 0 is the judged
    // week and the remaining 8 are the prior weeks, newest first (baseline.ts doesn't care about
    // prior-week order, only that the judged week is excluded).
    const byLocation = new Map<string, number[]>();
    for (const row of bucketResult.rows) {
      const counts = byLocation.get(row.location) ?? [];
      counts.push(Number(row.event_count));
      byLocation.set(row.location, counts);
    }

    // --- 2c. domain judgement (T-09) per location ---
    type LocationRow = {
      location: string;
      current: number;
      baselineMedian: number | null;
      typicalRange: { low: number; high: number } | null;
      verdict: string;
      deltaPct: number | null;
      weeksOfHistory: number;
      /** Ranking key, computed here and dropped before the response is sent — see sort comment below. */
      deviationScore: number;
    };

    const locations: LocationRow[] = [];
    for (const [location, counts] of byLocation) {
      const [currentCount, ...priorWeekCounts] = counts;
      const judged = judgeWeek(currentCount, priorWeekCounts);

      // Deviation measure used for ranking (documented here since T-12 pins against it):
      // abs(deltaPct) when it exists (the normal case — deltaPct is undefined only when the
      // baseline median is 0). When the baseline is 0, any nonzero current count is itself the
      // whole signal, so we fall back to the raw current count as the score. insufficient_history
      // rows have no band at all and are not comparable to a deviation measure, so they are
      // excluded from the ranked group entirely (see sort below).
      const deviationScore =
        judged.deltaPct !== null ? Math.abs(judged.deltaPct) : currentCount;

      locations.push({
        location,
        current: currentCount,
        baselineMedian: judged.baselineMedian,
        typicalRange: judged.typicalRange,
        verdict: judged.verdict,
        deltaPct: judged.deltaPct,
        weeksOfHistory: judged.weeksOfHistory,
        deviationScore,
      });
    }

    // Sort by deviation, most-deviant-first. insufficient_history rows carry no deviation measure
    // (no band was ever computed for them) and are placed last, grouped together, ordered
    // alphabetically by location for determinism — never interleaved among ranked rows.
    locations.sort((a, b) => {
      const aRanked = a.verdict !== "insufficient_history";
      const bRanked = b.verdict !== "insufficient_history";
      if (aRanked !== bRanked) {
        return aRanked ? -1 : 1;
      }
      if (!aRanked && !bRanked) {
        return a.location.localeCompare(b.location);
      }
      return b.deviationScore - a.deviationScore;
    });

    // --- 3. shape the response ---
    const payload = {
      accountId,
      timezone,
      eventType,
      weekStart,
      locations: locations.map(({ deviationScore, ...rest }) => rest),
    };

    return res.status(200).json(payload);
  },
);
