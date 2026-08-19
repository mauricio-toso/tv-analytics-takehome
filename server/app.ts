/**
 * Express app wiring (T-11). No business logic here — routes own that.
 */
import express from "express";
import { normalcyRouter } from "./routes/normalcy.ts";

export const app = express();

app.use(normalcyRouter);
