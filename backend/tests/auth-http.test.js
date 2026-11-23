import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { pool } from "../config/database.js";
import { hashPassword } from "../services/security.js";
test("HTTP auth, CSRF and authorization with an isolated repository stub", async () => {
  const original = pool.execute;
  const hash = await hashPassword("LocalPassword123!");
  let active = true,
    role = "Receptionist";
  const calls = [];
  pool.execute = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes("WHERE Username="))
      return [
        [
          {
            EmployeeID: 42,
            FullName: "Test Reception",
            AccessRole: role,
            PasswordHash: hash,
          },
        ],
      ];
    if (sql.includes("FROM Employee WHERE EmployeeID="))
      return [
        active
          ? [{ EmployeeID: 42, FullName: "Test Reception", AccessRole: role }]
          : [],
      ];
    if (sql.includes("COUNT(*)")) return [[{ total: 0 }]];
    return [[]];
  };
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    let response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "reception", password: "bad" }),
    });
    assert.equal(response.status, 401);
    response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "reception",
        password: "LocalPassword123!",
      }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    assert(response.headers.get("set-cookie").includes("HttpOnly"));
    const headers = { cookie };
    response = await fetch(base + "/api/auth/me", { headers });
    const me = await response.json();
    assert.equal(me.user.AccessRole, "Receptionist");
    assert(!JSON.stringify(me).includes("PasswordHash"));
    response = await fetch(base + "/api/employees", { headers });
    assert.equal(response.status, 403);
    response = await fetch(base + "/api/services", {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "x-csrf-token": me.csrf,
      },
      body: "{}",
    });
    assert.equal(response.status, 403);
    response = await fetch(base + "/api/customers", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 403);
    const injection = "'; DROP TABLE Customer; --";
    response = await fetch(
      base +
        "/api/customers?search=" +
        encodeURIComponent(injection) +
        "&sort=" +
        encodeURIComponent(injection),
      { headers },
    );
    assert.equal(response.status, 200);
    assert(calls.some((c) => c.values?.includes("%" + injection + "%")));
    assert(!calls.some((c) => c.sql.includes("DROP TABLE")));
    active = false;
    response = await fetch(base + "/api/auth/me", { headers });
    assert.equal(response.status, 401);
    active = true;
    response = await fetch(base + "/api/auth/logout", {
      method: "POST",
      headers: { ...headers, "x-csrf-token": me.csrf },
    });
    assert.equal(response.status, 200);
    assert(response.headers.get("set-cookie").includes("Expires="));
  } finally {
    pool.execute = original;
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
