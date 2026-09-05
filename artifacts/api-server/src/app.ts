// @ts-nocheck
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const PgSession = connectPgSimple(session);

// Ensure DB columns exist for Before & After evidence, Cross-District Anti-Fraud, and Stock Out Items
pool.query(`
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_before_url TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_after_url TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_before_checksum TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS detected_district TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS target_district TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS is_cross_district BOOLEAN DEFAULT FALSE;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS cross_district_notes TEXT;
  ALTER TABLE stock_out_items ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE stock_out_items ADD COLUMN IF NOT EXISTS received_by INTEGER;
`).catch(err => console.error("Auto migration warning:", err?.message || err));

const app = express() as any;
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "si-gaplek-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 8 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  const errorMessage = err.message || "Internal Server Error";
  res.status(err.status || 500).json({ 
    error: errorMessage + (err.code ? ` (Kode PG: ${err.code})` : ""),
  });
});

export default app;
