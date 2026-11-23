import { Router } from "express";
import { pool } from "../config/database.js";
import { specs, validate } from "../validators/masters.js";
import { columns, getOne } from "../repositories/masters.js";
import { hashPassword } from "../services/security.js";
import { allow } from "../middleware/auth.js";
export const masters = Router();
for (const kind of Object.keys(specs)) {
  const s = specs[kind],
    router = Router();
  router.use(
    kind === "employees"
      ? allow("Administrator")
      : kind === "services"
        ? allow("Administrator", "Receptionist", "Manager")
        : allow("Administrator", "Receptionist"),
  );
  router.get("/", async (req, res) => {
    const page = Math.max(1, Math.min(100000, parseInt(req.query.page) || 1)),
      limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const sort = [s.id, ...Object.keys(s.fields)].includes(req.query.sort)
      ? req.query.sort
      : s.id;
    const dir = req.query.direction === "desc" ? "DESC" : "ASC";
    const active = req.query.archived === "true" ? 0 : 1;
    const q = "%" + String(req.query.search || "").slice(0, 100) + "%";
    const [count] = await pool.execute(
      `SELECT COUNT(*) total FROM ${s.table} WHERE IsActive=? AND ${s.search} LIKE ?`,
      [active, q],
    );
    const [rows] = await pool.execute(
      `SELECT ${columns(kind)} FROM ${s.table} WHERE IsActive=? AND ${s.search} LIKE ? ORDER BY \`${sort}\` ${dir} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [active, q],
    );
    res.json({ data: rows, total: count[0].total, page, limit });
  });
  router.get("/:id", async (req, res) => {
    const row = await getOne(kind, req.params.id);
    if (!row) return res.status(404).json({ error: "Record not found" });
    res.json(row);
  });
  router.use(
    kind === "services"
      ? allow("Administrator")
      : allow("Administrator", "Receptionist"),
  );
  async function write(req, res) {
    let data;
    try {
      data = validate(kind, req.body);
    } catch (e) {
      return res.status(422).json({ error: e.message });
    }
    if (kind === "vehicles") {
      const [owners] = await pool.execute(
        "SELECT CustomerID FROM Customer WHERE CustomerID=? AND IsActive=1",
        [data.CustomerID],
      );
      if (!owners.length)
        return res.status(422).json({ error: "Choose an active customer" });
    }
    if (kind === "employees") {
      if (req.params.id && Number(req.params.id) === req.user.EmployeeID)
        return res
          .status(409)
          .json({
            error: "Use another administrator to modify your own account",
          });
      if (data.Username) {
        if (!data.AccessRole)
          return res
            .status(422)
            .json({ error: "AccessRole required for login" });
        if (req.body.Password) {
          if (
            typeof req.body.Password !== "string" ||
            req.body.Password.length < 12 ||
            req.body.Password.length > 128
          )
            return res
              .status(422)
              .json({ error: "Password must contain 12–128 characters" });
          data.PasswordHash = await hashPassword(req.body.Password);
        } else if (!req.params.id)
          return res.status(422).json({ error: "Password required" });
      } else {
        data.Username = null;
        data.AccessRole = null;
        data.PasswordHash = null;
      }
    }
    const keys = Object.keys(data);
    let id = req.params.id;
    if (id) {
      if (!(await getOne(kind, id)))
        return res.status(404).json({ error: "Record not found" });
      await pool.execute(
        `UPDATE ${s.table} SET ${keys.map((k) => "`" + k + "`=?").join(",")} WHERE ${s.id}=?`,
        [...Object.values(data), id],
      );
    } else {
      const [r] = await pool.execute(
        `INSERT INTO ${s.table} (${keys.map((k) => "`" + k + "`").join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
        Object.values(data),
      );
      id = r.insertId;
    }
    res.status(req.params.id ? 200 : 201).json(await getOne(kind, id));
  }
  router.post("/", write);
  router.put("/:id", write);
  router.delete("/:id", async (req, res) => {
    if (kind === "employees" && Number(req.params.id) === req.user.EmployeeID)
      return res.status(409).json({ error: "Cannot archive yourself" });
    if (kind === "customers") {
      const [v] = await pool.execute(
        "SELECT VehicleID FROM Vehicle WHERE CustomerID=? AND IsActive=1 LIMIT 1",
        [req.params.id],
      );
      if (v.length)
        return res.status(409).json({ error: "Archive active vehicles first" });
    }
    const [r] = await pool.execute(
      `UPDATE ${s.table} SET IsActive=0 WHERE ${s.id}=?`,
      [req.params.id],
    );
    if (!r.affectedRows)
      return res.status(404).json({ error: "Record not found" });
    res.json({ ok: true });
  });
  masters.use("/" + kind, router);
}
