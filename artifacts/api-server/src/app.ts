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

// Ensure DB columns exist for Before & After evidence, Cross-District Anti-Fraud, Stock Out Items, and System Settings
pool.query(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER
  );
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_before_url TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_after_url TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS photo_before_checksum TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS detected_district TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS target_district TEXT;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS is_cross_district BOOLEAN DEFAULT FALSE;
  ALTER TABLE installation_evidence ADD COLUMN IF NOT EXISTS cross_district_notes TEXT;
  ALTER TABLE stock_out_items ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE stock_out_items ADD COLUMN IF NOT EXISTS received_by INTEGER;
  ALTER TABLE branch_stocks ADD COLUMN IF NOT EXISTS minimum_stock INTEGER NOT NULL DEFAULT 5;
  ALTER TABLE branch_stocks ADD COLUMN IF NOT EXISTS maximum_stock INTEGER DEFAULT 100;
  CREATE TABLE IF NOT EXISTS branch_stock_movements (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    item_id INTEGER NOT NULL REFERENCES items(id),
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    movement_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    balance_before INTEGER NOT NULL DEFAULT 0,
    balance_after INTEGER NOT NULL DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    reference_no VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_bsm_branch_item ON branch_stock_movements(branch_id, item_id);
  CREATE INDEX IF NOT EXISTS idx_bsm_date ON branch_stock_movements(movement_date);
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
