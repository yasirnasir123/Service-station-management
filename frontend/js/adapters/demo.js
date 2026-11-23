import { cents, decimal, today } from "../utils/format.js";
export const key = "station.demo.v1";
export function initial() {
  const now = new Date().toISOString();
  const base = { IsActive: 1, CreatedAt: now, UpdatedAt: now };
  return {
    customers: [
      {
        ...base,
        CustomerID: 1,
        FullName: "Ahmed Khan",
        Phone: "03001234567",
        Email: "ahmed@example.test",
        Address: "Gulberg, Lahore",
      },
      {
        ...base,
        CustomerID: 2,
        FullName: "Sara Ali",
        Phone: "03211234567",
        Email: "sara@example.test",
        Address: "Johar Town, Lahore",
      },
      {
        ...base,
        CustomerID: 3,
        FullName: "Usman Malik",
        Phone: "03331234567",
        Email: "",
        Address: "Model Town, Lahore",
      },
    ],
    vehicles: [
      {
        ...base,
        VehicleID: 1,
        CustomerID: 1,
        RegistrationNo: "LEA2024",
        VehicleType: "Car",
        Brand: "Toyota",
        Model: "Corolla",
      },
      {
        ...base,
        VehicleID: 2,
        CustomerID: 2,
        RegistrationNo: "LEB808",
        VehicleType: "Car",
        Brand: "Honda",
        Model: "City",
      },
      {
        ...base,
        VehicleID: 3,
        CustomerID: 3,
        RegistrationNo: "LEM125",
        VehicleType: "Bike",
        Brand: "Honda",
        Model: "CG 125",
      },
    ],
    employees: [
      {
        ...base,
        EmployeeID: 1,
        FullName: "Yasir Ahmed",
        Phone: "03001112222",
        JobRole: "Senior technician",
        Salary: "45000.00",
        Username: null,
        AccessRole: null,
      },
      {
        ...base,
        EmployeeID: 2,
        FullName: "Ameen Usmani",
        Phone: "03003334444",
        JobRole: "Detailing specialist",
        Salary: "42000.00",
        Username: null,
        AccessRole: null,
      },
    ],
    services: [
      {
        ...base,
        ServiceID: 1,
        ServiceName: "Premium car wash",
        Description: "Exterior foam wash and hand dry",
        Price: "1200.00",
        EstimatedDuration: 35,
      },
      {
        ...base,
        ServiceID: 2,
        ServiceName: "Interior cleaning",
        Description: "Vacuum and interior detail",
        Price: "2500.00",
        EstimatedDuration: 60,
      },
      {
        ...base,
        ServiceID: 3,
        ServiceName: "Oil change",
        Description: "Labour only; oil supplied separately",
        Price: "800.00",
        EstimatedDuration: 25,
      },
      {
        ...base,
        ServiceID: 4,
        ServiceName: "Bike wash",
        Description: "Gentle wash and dry",
        Price: "400.00",
        EstimatedDuration: 20,
      },
      {
        ...base,
        ServiceID: 5,
        ServiceName: "Body polishing",
        Description: "Exterior polish",
        Price: "5000.00",
        EstimatedDuration: 120,
      },
    ],
    bookings: [
      {
        BookingID: 1,
        VehicleID: 1,
        AssignedEmployeeID: 1,
        BookingDate: now,
        Status: "In Progress",
        Notes: "Please check tyre pressure",
        lines: [
          { ServiceID: 1, Quantity: 1, AgreedPrice: "1200.00" },
          { ServiceID: 2, Quantity: 1, AgreedPrice: "2500.00" },
        ],
      },
      {
        BookingID: 2,
        VehicleID: 2,
        AssignedEmployeeID: 2,
        BookingDate: now,
        Status: "Completed",
        Notes: "",
        InvoiceNumber: "SS-DEMO-00002",
        InvoiceDate: now,
        Subtotal: "1200.00",
        Discount: "0.00",
        TotalAmount: "1200.00",
        lines: [{ ServiceID: 1, Quantity: 1, AgreedPrice: "1200.00" }],
      },
      {
        BookingID: 3,
        VehicleID: 3,
        AssignedEmployeeID: 1,
        BookingDate: now,
        Status: "Pending",
        Notes: "",
        lines: [{ ServiceID: 4, Quantity: 1, AgreedPrice: "400.00" }],
      },
    ],
    payments: [
      {
        PaymentID: 1,
        BookingID: 2,
        PaymentDate: now,
        Amount: "500.00",
        PaymentMethod: "Cash",
        PaymentStatus: "Paid",
        ReferenceNo: "",
        IdempotencyKey: "demo-seed",
      },
    ],
    inventory: [
      {
        ...base,
        InventoryID: 1,
        ItemName: "Car shampoo",
        QuantityAvailable: "4.500",
        Unit: "litre",
        ReorderLevel: "5.000",
        UnitCost: "650.00",
      },
      {
        ...base,
        InventoryID: 2,
        ItemName: "Microfibre cloth",
        QuantityAvailable: "24.000",
        Unit: "piece",
        ReorderLevel: "10.000",
        UnitCost: "250.00",
      },
      {
        ...base,
        InventoryID: 3,
        ItemName: "Body polish",
        QuantityAvailable: "8.000",
        Unit: "litre",
        ReorderLevel: "3.000",
        UnitCost: "1800.00",
      },
    ],
  };
}
export const ids = {
  customers: "CustomerID",
  vehicles: "VehicleID",
  employees: "EmployeeID",
  services: "ServiceID",
  bookings: "BookingID",
  payments: "PaymentID",
  inventory: "InventoryID",
};
export class DemoAdapter {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = JSON.parse(storage.getItem(key) || "null") || initial();
    this.persist();
  }
  persist() {
    this.storage.setItem(key, JSON.stringify(this.data));
  }
  reset() {
    this.data = initial();
    this.persist();
  }
  async all(kind) {
    return structuredClone(this.data[kind]);
  }
  async list(
    kind,
    {
      search = "",
      page = 1,
      limit = 10,
      sort = ids[kind],
      direction = "asc",
      archived = false,
    } = {},
  ) {
    let rows = (await this.all(kind))
      .filter(
        (r) => r.IsActive === undefined || Boolean(r.IsActive) !== archived,
      )
      .filter((r) =>
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(search.toLowerCase()),
        ),
      );
    rows.sort(
      (a, b) =>
        String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, {
          numeric: true,
        }) * (direction === "desc" ? -1 : 1),
    );
    return {
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    };
  }
  async get(kind, id) {
    return (await this.all(kind)).find((r) => r[ids[kind]] === Number(id));
  }
  async save(kind, record, id) {
    const data = structuredClone(record);
    delete data.Password;
    if (["customers", "employees"].includes(kind)) {
      if (!data.FullName?.trim() || data.FullName.length > 100)
        throw Error("Full name is required (maximum 100 characters)");
      if (!/^[+\d ()-]{5,20}$/.test(data.Phone))
        throw Error("Enter a valid phone number");
    }
    if (
      kind === "customers" &&
      data.Email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)
    )
      throw Error("Enter a valid email");
    const rows = this.data[kind];
    const old = rows.find((r) => r[ids[kind]] === Number(id));
    if (id && !old) throw Error("Record not found");
    if (kind === "vehicles") {
      data.RegistrationNo = data.RegistrationNo.toUpperCase().replace(
        /[\s-]/g,
        "",
      );
      if (!/^[A-Z0-9]{2,30}$/.test(data.RegistrationNo))
        throw Error("Invalid registration");
      if (
        rows.some((r) => r.RegistrationNo === data.RegistrationNo && r !== old)
      )
        throw Error("Registration already exists");
      if (
        !this.data.customers.some(
          (c) => c.CustomerID === Number(data.CustomerID) && c.IsActive,
        )
      )
        throw Error("Choose an active customer");
      data.CustomerID = Number(data.CustomerID);
    }
    if (kind === "services") {
      cents(data.Price);
      if (
        !Number.isInteger(Number(data.EstimatedDuration)) ||
        Number(data.EstimatedDuration) < 1
      )
        throw Error("Duration must be a positive integer");
    }
    if (kind === "employees") cents(data.Salary);
    if (kind === "inventory") {
      for (const field of ["QuantityAvailable", "ReorderLevel"])
        if (!/^\d{1,8}(\.\d{1,3})?$/.test(String(data[field])))
          throw Error("Stock requires up to three decimals");
      cents(data.UnitCost);
    }
    if (old) Object.assign(old, data, { UpdatedAt: new Date().toISOString() });
    else
      rows.push({
        ...data,
        [ids[kind]]: Math.max(0, ...rows.map((r) => r[ids[kind]])) + 1,
        IsActive: 1,
        CreatedAt: new Date().toISOString(),
      });
    this.persist();
    return old || rows.at(-1);
  }
  async archive(kind, id) {
    if (
      kind === "customers" &&
      this.data.vehicles.some((v) => v.CustomerID === Number(id) && v.IsActive)
    )
      throw Error("Archive active vehicles first");
    const row = this.data[kind].find((r) => r[ids[kind]] === Number(id));
    if (!row) throw Error("Record not found");
    row.IsActive = 0;
    this.persist();
  }
  async saveBooking(body, id) {
    const old = this.data.bookings.find((b) => b.BookingID === Number(id));
    if (old && (old.Status !== "Pending" || old.InvoiceNumber))
      throw Error("Only pending bookings can be edited");
    if (
      !this.data.vehicles.some(
        (v) => v.VehicleID === Number(body.VehicleID) && v.IsActive,
      )
    )
      throw Error("Choose an active vehicle");
    if (
      body.AssignedEmployeeID &&
      !this.data.employees.some(
        (e) => e.EmployeeID === Number(body.AssignedEmployeeID) && e.IsActive,
      )
    )
      throw Error("Choose an active employee");
    if (!body.lines.length) throw Error("Select at least one service");
    const grouped = new Map();
    for (const line of body.lines) {
      const service = this.data.services.find(
        (s) => s.ServiceID === Number(line.ServiceID) && s.IsActive,
      );
      if (
        !service ||
        !Number.isInteger(Number(line.Quantity)) ||
        Number(line.Quantity) < 1 ||
        Number(line.Quantity) > 999
      )
        throw Error("Invalid service or quantity (1–999)");
      const existing = grouped.get(service.ServiceID);
      const quantity = Number(line.Quantity) + (existing?.Quantity || 0);
      if (quantity > 999) throw Error("Maximum quantity is 999");
      grouped.set(service.ServiceID, {
        ServiceID: service.ServiceID,
        Quantity: quantity,
        AgreedPrice:
          old?.lines.find((l) => l.ServiceID === service.ServiceID)
            ?.AgreedPrice || service.Price,
      });
    }
    const booking = {
      ...body,
      VehicleID: Number(body.VehicleID),
      AssignedEmployeeID: Number(body.AssignedEmployeeID) || null,
      lines: [...grouped.values()],
      Status: "Pending",
    };
    return this.save("bookings", booking, id);
  }
  async transition(id, status, employeeId) {
    const row = this.data.bookings.find((b) => b.BookingID === Number(id));
    if (!row) throw Error("Booking not found");
    if (employeeId && row.AssignedEmployeeID !== employeeId)
      throw Error("This job is not assigned to you");
    if (
      !(
        {
          Pending: ["In Progress", "Cancelled"],
          "In Progress": ["Completed", "Cancelled"],
        }[row.Status] || []
      ).includes(status) ||
      row.InvoiceNumber
    )
      throw Error("Invalid status transition");
    if (status === "In Progress" && !row.AssignedEmployeeID)
      throw Error("Assign an employee first");
    row.Status = status;
    this.persist();
  }
  async issue(id, discount) {
    const b = this.data.bookings.find((b) => b.BookingID === Number(id));
    if (b?.InvoiceNumber) return b;
    if (b?.Status !== "Completed")
      throw Error("Complete the job before issuing an invoice");
    const total = b.lines.reduce(
      (n, l) => n + cents(l.AgreedPrice) * l.Quantity,
      0,
    );
    const d = cents(discount);
    if (d > total) throw Error("Discount exceeds subtotal");
    Object.assign(b, {
      InvoiceNumber: "SS-DEMO-" + String(id).padStart(5, "0"),
      InvoiceDate: new Date().toISOString(),
      Subtotal: decimal(total),
      Discount: decimal(d),
      TotalAmount: decimal(total - d),
    });
    this.persist();
    return b;
  }
  balance(id) {
    const b = this.data.bookings.find((b) => b.BookingID === Number(id));
    return (
      cents(b?.TotalAmount || 0) -
      this.data.payments
        .filter((p) => p.BookingID === Number(id) && p.PaymentStatus === "Paid")
        .reduce((n, p) => n + cents(p.Amount), 0)
    );
  }
  async pay(body) {
    if (
      this.data.payments.some((p) => p.IdempotencyKey === body.IdempotencyKey)
    )
      return;
    const b = this.data.bookings.find(
      (b) => b.BookingID === Number(body.BookingID),
    );
    if (!b?.InvoiceNumber) throw Error("Payment requires an invoice");
    const amount = cents(body.Amount);
    if (amount <= 0 || amount > this.balance(body.BookingID))
      throw Error("Amount must be positive and within outstanding balance");
    if (
      !["Cash", "Card", "Digital"].includes(body.PaymentMethod) ||
      !["Paid", "Pending", "Failed"].includes(body.PaymentStatus)
    )
      throw Error("Invalid payment method or state");
    await this.save("payments", {
      ...body,
      BookingID: Number(body.BookingID),
      PaymentDate: new Date().toISOString(),
    });
  }
  async paymentStatus(id, status) {
    const p = this.data.payments.find((p) => p.PaymentID === Number(id));
    if (!p || p.PaymentStatus === "Paid")
      throw Error("Paid history is immutable");
    if (status === "Paid" && cents(p.Amount) > this.balance(p.BookingID))
      throw Error("Amount exceeds remaining balance");
    if (!["Paid", "Failed", "Pending"].includes(status))
      throw Error("Invalid status");
    p.PaymentStatus = status;
    this.persist();
  }
  async stock(id, amount, direction) {
    const row = this.data.inventory.find((i) => i.InventoryID === Number(id));
    if (!row?.IsActive) throw Error("Item unavailable");
    if (!/^\d{1,8}(\.\d{1,3})?$/.test(String(amount)) || Number(amount) <= 0)
      throw Error("Enter a positive quantity, up to 3 decimals");
    const result =
      Math.round(Number(row.QuantityAvailable) * 1000) +
      (direction === "receive" ? 1 : -1) * Math.round(Number(amount) * 1000);
    if (result < 0 || result > 99999999999)
      throw Error("Invalid stock adjustment");
    row.QuantityAvailable = (result / 1000).toFixed(3);
    this.persist();
  }
}
