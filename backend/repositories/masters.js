import { pool } from "../config/database.js";
import { specs } from "../validators/masters.js";
export const columns = (kind) =>
  [
    specs[kind].id,
    ...Object.keys(specs[kind].fields),
    "IsActive",
    "CreatedAt",
    "UpdatedAt",
  ]
    .map((k) => "`" + k + "`")
    .join(",");
export async function getOne(kind, id) {
  const s = specs[kind];
  const [rows] = await pool.execute(
    `SELECT ${columns(kind)} FROM ${s.table} WHERE ${s.id}=?`,
    [id],
  );
  return rows[0];
}
