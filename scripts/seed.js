import { pool } from "../backend/config/database.js";
import { hashPassword } from "../backend/services/security.js";
const password = process.env.DEMO_PASSWORD;
if (process.env.NODE_ENV === "production" || !password || password.length < 12)
  throw Error("Local only: set DEMO_PASSWORD (12+ characters) explicitly.");
try {
  for (const [username, role] of [
    ["admin", "Administrator"],
    ["reception", "Receptionist"],
    ["staff", "Service Staff"],
    ["cashier", "Cashier"],
    ["manager", "Manager"],
  ]) {
    await pool.execute(
      "INSERT INTO Employee (FullName,Phone,JobRole,Salary,Username,PasswordHash,AccessRole) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE Username=Username",
      [
        role + " Demo",
        "03000000000",
        role,
        "40000.00",
        username,
        await hashPassword(password),
        role,
      ],
    );
  }
  console.log("Local accounts seeded; existing accounts unchanged.");
} finally {
  await pool.end();
}
