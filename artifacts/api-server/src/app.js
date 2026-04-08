// @ts-nocheck
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
const PgSession = connectPgSimple(session);
const app = express();
app.use(pinoHttp({
    logger,
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url?.split("?")[0],
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
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
    },
}));
app.use("/api", router);
export default app;
