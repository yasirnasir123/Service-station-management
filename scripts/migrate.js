import { readFile, readdir } from "node:fs/promises";
import { pool } from "../backend/config/database.js";
try {
  for (const file of (await readdir("database/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = await readFile("database/migrations/" + file, "utf8");
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await pool.query(statement);
    console.log("Applied", file);
  }
} finally {
  await pool.end();
}
