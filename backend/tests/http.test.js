import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { pool } from "../config/database.js";
test("HTTP boundary: unauthenticated routes, static app, safe health failure", async () => {
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const route of ["/api/customers", "/api/employees", "/api/auth/me"]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 401);
      assert(!JSON.stringify(await response.json()).includes("PasswordHash"));
    }
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert((await page.text()).includes("Station"));
    const health = await fetch(base + "/api/health");
    assert([200, 503].includes(health.status));
    const malformed = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    assert.equal(malformed.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
    await pool.end();
  }
});
