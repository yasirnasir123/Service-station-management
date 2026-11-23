import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.setDefaultTimeout(12000);
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("docs/previews", { recursive: true });
try {
  await page.goto("http://localhost:3000");
  await page.getByRole("button", { name: "Explore interactive demo" }).click();
  await page
    .getByRole("heading", { name: "Your station, at a glance" })
    .waitFor();
  await page.screenshot({
    path: "docs/previews/dashboard-desktop.png",
    fullPage: true,
  });
  for (const [route, title] of [
    ["customers", "Customers"],
    ["vehicles", "Vehicles"],
    ["employees", "Employees"],
    ["services", "Service menu"],
    ["bookings", "Bookings"],
    ["jobs", "Assigned jobs"],
    ["invoices", "Invoices"],
    ["payments", "Payments"],
    ["inventory", "Inventory"],
    ["reports", "Reports"],
  ]) {
    await page.goto("http://localhost:3000/#/" + route);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    assert(
      !(await page
        .getByRole("heading", { name: "Unable to load this screen" })
        .count()),
    );
  }
  await page.goto("http://localhost:3000/#/customers");
  await page
    .getByRole("button", { name: "+ Add customer", exact: true })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("Browser Test");
  await page.getByLabel("Phone", { exact: true }).fill("03001230000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("Browser Test", { exact: true }).waitFor();
  await page
    .getByRole("row")
    .filter({ hasText: "Browser Test" })
    .getByRole("link", { name: "Details" })
    .click();
  await page.getByRole("button", { name: "+ Register vehicle" }).click();
  await page.getByLabel("Registration number").fill("qa-101");
  await page.getByLabel("Vehicle type").selectOption("Car");
  await page.getByLabel("Brand", { exact: true }).fill("Toyota");
  await page.getByLabel("Model", { exact: true }).fill("Yaris");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("QA101", { exact: true }).waitFor();
  await page.goto("http://localhost:3000/#/bookings");
  await page.getByRole("button", { name: "+ New booking" }).click();
  await page
    .getByLabel("Vehicle", { exact: true })
    .selectOption({ label: "QA101 · Browser Test" });
  await page.getByLabel("Assigned employee").selectOption("1");
  await page.getByLabel("Choose service").selectOption("1");
  await page.getByRole("button", { name: "Add service", exact: true }).click();
  await page.getByRole("button", { name: "Add service", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "QA101" })
    .getByRole("link")
    .click();
  await page.getByRole("button", { name: "Start job", exact: true }).click();
  await page.getByRole("button", { name: "Confirm status" }).click();
  await page.getByRole("button", { name: "Complete job", exact: true }).click();
  await page.getByRole("button", { name: "Confirm status" }).click();
  await page.getByText("Job complete.", { exact: false }).waitFor();
  await page.goto("http://localhost:3000/#/invoices");
  await page
    .getByRole("row")
    .filter({ hasText: "#4" })
    .getByRole("button", { name: "Issue invoice" })
    .click();
  await page
    .getByRole("button", { name: "Issue invoice", exact: true })
    .last()
    .click();
  await page
    .getByRole("row")
    .filter({ hasText: "SS-DEMO-00004" })
    .getByRole("link")
    .click();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page.getByLabel("Amount (PKR)").fill("500");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .last()
    .click();
  await page.getByText(/Outstanding.*1,900/).waitFor();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page.getByLabel("Amount (PKR)").fill("1900");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .last()
    .click();
  await page.getByText(/Outstanding.*0.00/).waitFor();
  await page.screenshot({
    path: "docs/previews/invoice-desktop.png",
    fullPage: true,
  });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "docs/previews/demo-invoice.pdf",
    format: "A4",
    printBackground: true,
  });
  assert.equal(await page.locator(".sidebar").isVisible(), false);
  await page.emulateMedia({ media: "screen" });
  await page.goto("http://localhost:3000/#/reports");
  await page.getByRole("button", { name: "Generate report" }).click();
  await page
    .getByRole("heading", { name: "Bookings by date and status" })
    .waitFor();
  await page.goto("http://localhost:3000/#/inventory");
  await page
    .getByRole("row")
    .filter({ hasText: "Car shampoo" })
    .getByRole("button", { name: "Receive", exact: true })
    .click();
  await page.getByLabel("Quantity", { exact: true }).fill("1.125");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByText("5.625 litre", { exact: true }).waitFor();
  await page.goto("http://localhost:3000/#/dashboard");
  await page.locator("#role-switch").selectOption("Service Staff");
  await page
    .getByRole("heading", { name: "Assigned jobs", exact: true })
    .waitFor();
  assert.equal(await page.getByText("SS-0002", { exact: true }).count(), 0);
  await page.goto("http://localhost:3000/#/employees");
  await page
    .getByRole("heading", { name: "Access denied", exact: true })
    .waitFor();
  await page.locator("#role-switch").selectOption("Administrator");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/#/dashboard");
  await page
    .getByRole("heading", { name: "Your station, at a glance" })
    .waitFor();
  await page.screenshot({
    path: "docs/previews/dashboard-mobile.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.screenshot({
    path: "docs/previews/dashboard-tablet.png",
    fullPage: true,
  });
  await page.goto("http://localhost:3000/#/missing");
  await page.getByRole("heading", { name: "Page not found" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all screens, customer + vehicle, multi-service booking, job lifecycle, invoice, partial/full payment, fractional stock, role denial, desktop/mobile/tablet, print and no browser errors.",
  );
} catch (e) {
  await page.screenshot({
    path: "docs/previews/check-failure.png",
    fullPage: true,
  });
  console.log(await page.locator("body").innerText());
  throw e;
} finally {
  await browser.close();
}
