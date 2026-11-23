import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  sign,
  unsign,
} from "../services/security.js";
import { validate } from "../validators/masters.js";
import { DemoAdapter } from "../../frontend/js/adapters/demo.js";
import { cents, decimal } from "../../frontend/js/utils/format.js";
const storage = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) };
};
test("password hashes are salted and verify safely", async () => {
  const a = await hashPassword("DemoPassword123!"),
    b = await hashPassword("DemoPassword123!");
  assert.notEqual(a, b);
  assert(await verifyPassword("DemoPassword123!", a));
  assert.equal(await verifyPassword("wrong", a), false);
  assert.equal(await verifyPassword("x", null), false);
});
test("signed cookies reject tampering and expiration", () => {
  const p = { id: 1, exp: Date.now() + 10000 };
  const s = sign(p, "test-secret");
  assert.equal(unsign(s, "test-secret").id, 1);
  assert.equal(unsign(s + "x", "test-secret"), null);
  assert.equal(
    unsign(sign({ ...p, exp: 1 }, "test-secret"), "test-secret"),
    null,
  );
});
test("server validators normalize registrations and preserve phone zeros", () => {
  assert.equal(
    validate("customers", { FullName: "Ali", Phone: "03001234567" }).Phone,
    "03001234567",
  );
  assert.equal(
    validate("vehicles", {
      CustomerID: 1,
      RegistrationNo: " lea-123 ",
      VehicleType: "Car",
      Brand: "Honda",
      Model: "City",
    }).RegistrationNo,
    "LEA123",
  );
  assert.throws(() =>
    validate("services", {
      ServiceName: "Wash",
      Price: "-1",
      EstimatedDuration: 30,
    }),
  );
  assert.throws(() =>
    validate("services", {
      ServiceName: "Wash",
      Price: "12.345",
      EstimatedDuration: 1,
    }),
  );
  assert.throws(() =>
    validate("services", {
      ServiceName: "Wash",
      Price: "10",
      EstimatedDuration: 1.2,
    }),
  );
  const r = validate("customers", {
    FullName: "Robert'); DROP TABLE Customer;--",
    Phone: "03001234567",
    PasswordHash: "secret",
  });
  assert.equal(r.PasswordHash, undefined);
});
test("precise monetary arithmetic", () => {
  assert.equal(cents("0.10") + cents("0.20"), 30);
  assert.equal(decimal(30), "0.30");
  assert.throws(() => cents("-1"));
});
test("complete demo workflow preserves prices, issues once, partial/full payments", async () => {
  const d = new DemoAdapter(storage());
  const customer = await d.save("customers", {
    FullName: "Test Person",
    Phone: "03000000001",
  });
  const v = await d.save("vehicles", {
    CustomerID: customer.CustomerID,
    RegistrationNo: "test-1",
    VehicleType: "Car",
    Brand: "Test",
    Model: "One",
  });
  await assert.rejects(() =>
    d.save("vehicles", {
      CustomerID: customer.CustomerID,
      RegistrationNo: "TEST1",
      VehicleType: "Car",
      Brand: "X",
      Model: "X",
    }),
  );
  const b = await d.saveBooking({
    VehicleID: v.VehicleID,
    AssignedEmployeeID: 1,
    BookingDate: new Date().toISOString(),
    lines: [
      { ServiceID: 1, Quantity: 1 },
      { ServiceID: 1, Quantity: 2 },
    ],
  });
  assert.equal(b.lines.length, 1);
  assert.equal(b.lines[0].Quantity, 3);
  d.data.services[0].Price = "999.00";
  assert.equal(b.lines[0].AgreedPrice, "1200.00");
  await d.transition(b.BookingID, "In Progress");
  await d.transition(b.BookingID, "Completed");
  const invoice = await d.issue(b.BookingID, "100.00");
  assert.equal(invoice.TotalAmount, "3500.00");
  assert.equal((await d.issue(b.BookingID, "0")).TotalAmount, "3500.00");
  await assert.rejects(() => d.transition(b.BookingID, "Cancelled"));
  await assert.rejects(() =>
    d.saveBooking({ ...b, lines: b.lines }, b.BookingID),
  );
  await d.pay({
    BookingID: b.BookingID,
    Amount: "500.00",
    PaymentMethod: "Cash",
    PaymentStatus: "Paid",
    IdempotencyKey: "one",
  });
  await d.pay({
    BookingID: b.BookingID,
    Amount: "500.00",
    PaymentMethod: "Cash",
    PaymentStatus: "Paid",
    IdempotencyKey: "one",
  });
  assert.equal(d.balance(b.BookingID), 300000);
  await d.pay({
    BookingID: b.BookingID,
    Amount: "3000.00",
    PaymentMethod: "Card",
    PaymentStatus: "Paid",
    IdempotencyKey: "two",
  });
  assert.equal(d.balance(b.BookingID), 0);
  await assert.rejects(() =>
    d.pay({
      BookingID: b.BookingID,
      Amount: "1",
      PaymentMethod: "Cash",
      PaymentStatus: "Paid",
      IdempotencyKey: "three",
    }),
  );
});
test("demo assignment ownership and terminal status", async () => {
  const d = new DemoAdapter(storage());
  await assert.rejects(() => d.transition(1, "Completed", 2));
  await d.transition(1, "Completed", 1);
  await assert.rejects(() => d.transition(1, "In Progress", 1));
});
test("fractional stock adjustments reject negative stock", async () => {
  const d = new DemoAdapter(storage());
  await d.stock(1, "0.125", "consume");
  assert.equal(d.data.inventory[0].QuantityAvailable, "4.375");
  await assert.rejects(() => d.stock(1, "9", "consume"));
  await d.stock(1, "1.125", "receive");
  assert.equal(d.data.inventory[0].QuantityAvailable, "5.500");
});
test("isolated demo storage and reset", async () => {
  const a = new DemoAdapter(storage()),
    b = new DemoAdapter(storage());
  await a.save("customers", { FullName: "Only A", Phone: "03000000001" });
  assert.equal((await a.all("customers")).length, 4);
  assert.equal((await b.all("customers")).length, 3);
  a.reset();
  assert.equal((await a.all("customers")).length, 3);
});
