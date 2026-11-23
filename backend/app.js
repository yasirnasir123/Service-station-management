import { randomBytes } from "node:crypto";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { pool } from "./config/database.js";
import { sign, verifyPassword } from "./services/security.js";
import { auth, csrf } from "./middleware/auth.js";
import { masters } from "./routes/masters.js";
import path from "node:path";
export function createApp() {
  const app = express();
  const production = process.env.NODE_ENV === "production";
  const secret = process.env.AUTH_SECRET || randomBytes(48).toString("hex");
  if (production && secret.length < 32)
    throw Error("AUTH_SECRET must be at least 32 characters");
  if (production && !process.env.AUTH_SECRET)
    throw Error("AUTH_SECRET required");
  app.use(helmet(), express.json({ limit: "32kb" }), cookieParser());
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected", milestone: 50 });
    } catch {
      res
        .status(503)
        .json({
          status: "degraded",
          database: "unavailable",
          demoAvailable: true,
        });
    }
  });
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 15,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
    async (req, res) => {
      if (
        typeof req.body.username !== "string" ||
        typeof req.body.password !== "string" ||
        req.body.password.length > 128
      )
        return res.status(400).json({ error: "Invalid credentials" });
      const [rows] = await pool.execute(
        "SELECT EmployeeID,FullName,AccessRole,PasswordHash FROM Employee WHERE Username=? AND IsActive=1",
        [req.body.username],
      );
      const row = rows[0];
      if (!row || !(await verifyPassword(req.body.password, row.PasswordHash)))
        return res.status(401).json({ error: "Invalid credentials" });
      const token = sign(
        {
          id: row.EmployeeID,
          csrf: randomBytes(24).toString("hex"),
          exp: Date.now() + 8 * 3600000,
        },
        secret,
      );
      res.cookie("station", token, {
        httpOnly: true,
        secure: production,
        sameSite: "strict",
        maxAge: 8 * 3600000,
        path: "/",
      });
      res.json({ ok: true });
    },
  );
  app.use("/api", auth(secret), csrf);
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: req.user, csrf: req.session.csrf }),
  );
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("station", { path: "/" });
    res.json({ ok: true });
  });
  app.use("/api", masters);
  app.use("/api", (req, res) =>
    res
      .status(404)
      .json({ error: "This API is not implemented in milestone 50" }),
  );
  app.use(express.static(path.resolve("frontend")));
  app.use((err, req, res, next) => {
    const conflict = [
      "ER_DUP_ENTRY",
      "ER_ROW_IS_REFERENCED_2",
      "ER_NO_REFERENCED_ROW_2",
    ].includes(err.code);
    const bad = err.type === "entity.parse.failed";
    res
      .status(conflict ? 409 : bad ? 400 : 503)
      .json({
        error: conflict
          ? "Duplicate value or related record conflict"
          : bad
            ? "Invalid JSON"
            : "Service unavailable. Check database configuration.",
      });
  });
  return app;
}
