// @ts-nocheck
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Debug endpoint — test database & session connectivity
router.get("/api/ping", async (req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    await pool.query("SELECT 1");
    dbOk = true;
  } catch (e: any) {
    dbError = e?.message ?? "unknown";
  }
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDb: !!process.env.DATABASE_URL,
      hasSecret: !!process.env.SESSION_SECRET,
    },
    dbOk,
    dbError,
    sessionId: req.sessionID ?? null,
  });
});

export default router;
