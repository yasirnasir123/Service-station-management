import { pool } from "../config/database.js";
import { unsign } from "../services/security.js";
export function auth(secret) {
  return async (req, res, next) => {
    try {
      const p = unsign(req.cookies.station || "", secret);
      if (!p) return res.status(401).json({ error: "Please log in" });
      const [rows] = await pool.execute(
        "SELECT EmployeeID,FullName,AccessRole FROM Employee WHERE EmployeeID=? AND IsActive=1 AND Username IS NOT NULL",
        [p.id],
      );
      if (!rows[0]?.AccessRole)
        return res.status(401).json({ error: "Account unavailable" });
      req.user = rows[0];
      req.session = p;
      next();
    } catch (e) {
      next(e);
    }
  };
}
export const allow =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.AccessRole)
      ? next()
      : res.status(403).json({ error: "Access denied" });
export function csrf(req, res, next) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("x-csrf-token") !== req.session.csrf
  )
    return res.status(403).json({ error: "Invalid CSRF token" });
  next();
}
