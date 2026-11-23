import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
let fail = false;
try {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let response;
    if (path === "/api/auth/login") response = { ok: true };
    else if (path === "/api/auth/me")
      response = {
        user: {
          EmployeeID: 99,
          FullName: "API Test Admin",
          AccessRole: "Administrator",
        },
        csrf: "stub-csrf",
      };
    else if (path === "/api/customers")
      response = {
        data: [
          {
            CustomerID: 901,
            FullName: "REAL ADAPTER TEST",
            Phone: "03000000000",
            IsActive: 1,
          },
        ],
        total: 1,
      };
    else response = { error: "Not available" };
    await route.fulfill({
      status: fail && path === "/api/customers" ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(fail ? { error: "Test API unavailable" } : response),
    });
  });
  await page.goto("http://localhost:3000");
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in to API mode" }).click();
  await page.getByText("● API mode", { exact: true }).waitFor();
  await page.goto("http://localhost:3000/#/customers");
  await page.getByText("REAL ADAPTER TEST", { exact: true }).waitFor();
  assert.equal(await page.getByText("Ahmed Khan", { exact: true }).count(), 0);
  await page.goto("http://localhost:3000/#/bookings");
  await page.getByText("Ahmed Khan", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("REAL ADAPTER TEST", { exact: true }).count(),
    0,
  );
  await page
    .getByText("Demo preview · separate synthetic data.", { exact: false })
    .waitFor();
  fail = true;
  await page.goto("http://localhost:3000/#/customers");
  await page
    .getByRole("heading", { name: "Unable to load this screen" })
    .waitFor();
  assert.equal(await page.getByText("Ahmed Khan", { exact: true }).count(), 0);
  console.log(
    "PASS: API adapter records separate from preview IDs; failed API does not fall back to demo. Network stub only; not a MySQL integration test.",
  );
} finally {
  await browser.close();
}
