function sortRecords(rows, fallback) {
  return rows.sort(
    (a, b) =>
      String(a[query.sort || fallback] ?? "").localeCompare(
        String(b[query.sort || fallback] ?? ""),
        undefined,
        { numeric: true },
      ) * (query.direction === "desc" ? -1 : 1),
  );
}
import {
  badge,
  btn,
  table,
  empty,
  selectInput,
  input,
} from "./components/ui.js";
import { fields } from "./pages/masters.js";
import { DemoAdapter, ids } from "./adapters/demo.js";
import { ApiAdapter } from "./adapters/api.js";
import {
  esc,
  money,
  cents,
  decimal,
  date,
  today,
  csv,
} from "./utils/format.js";
const demo = new DemoAdapter(),
  api = new ApiAdapter();
let mode = sessionStorage.getItem("station.mode") || "demo",
  user = null,
  role = "Administrator",
  staffId = 1,
  query = { search: "", page: 1, sort: "", direction: "asc", archived: false },
  route = "",
  cache = {},
  generation = 0;
const app = document.querySelector("#app"),
  dialog = document.querySelector("#modal");
const titles = {
  dashboard: "Overview",
  customers: "Customers",
  vehicles: "Vehicles",
  employees: "Employees",
  services: "Service menu",
  bookings: "Bookings",
  jobs: "Assigned jobs",
  invoices: "Invoices",
  payments: "Payments",
  inventory: "Inventory",
  reports: "Reports",
};
const permissions = {
  Administrator: Object.keys(titles),
  Receptionist: ["dashboard", "customers", "vehicles", "services", "bookings"],
  "Service Staff": ["jobs"],
  Cashier: ["dashboard", "invoices", "payments"],
  Manager: ["dashboard", "services", "inventory", "reports"],
};
const masterKinds = ["customers", "vehicles", "employees", "services"];
const adapter = (k) => (mode === "api" && masterKinds.includes(k) ? api : demo);
const canWrite = (kind) =>
  role === "Administrator" ||
  (["customers", "vehicles"].includes(kind) && role === "Receptionist") ||
  (kind === "inventory" && role === "Manager");
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4500);
}
function preview(kind) {
  return mode === "api" && !masterKinds.includes(kind)
    ? '<div class="notice"><strong>Demo preview · separate synthetic data.</strong> This workflow is scheduled for a later backend milestone. Nothing on this screen writes to MySQL.</div>'
    : "";
}
function head(title, sub, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">Workspace / ${esc(titles[route] || title)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="actions">${actions}</div></div>`;
}
function pagination(total) {
  const pages = Math.max(1, Math.ceil(total / 10));
  return `<div class="pagination"><span>${total} records · Page ${query.page} of ${pages}</span><div class="actions"><button class="secondary small" data-action="prev" ${query.page <= 1 ? "disabled" : ""}>Previous</button><button class="secondary small" data-action="next" ${query.page >= pages ? "disabled" : ""}>Next</button></div></div>`;
}
function toolbar(extra = "", sorts = []) {
  return `<form class="toolbar" id="filters"><input name="search" type="search" placeholder="Search records…" aria-label="Search records" value="${esc(query.search)}">${extra}<select name="sort" aria-label="Sort by">${sorts.map(([v, l]) => `<option value="${v}" ${query.sort === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select><select name="direction" aria-label="Sort direction"><option value="asc">Ascending</option><option value="desc" ${query.direction === "desc" ? "selected" : ""}>Descending</option></select><button class="secondary">Apply filters</button></form>`;
}
function shell() {
  const links = Object.keys(titles).filter((k) =>
    permissions[role].includes(k),
  );
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand">station<span> /</span></div><div class="nav-label">STATION WORKSPACE</div>${links.map((k, i) => `<a href="#/${k}" class="${k === route ? "active" : ""}"><span class="nav-icon">${["◫", "♧", "◇", "♙", "✧", "▤", "✓", "▧", "◉", "▦", "↗"][Object.keys(titles).indexOf(k)]}</span><span>${titles[k]}</span></a>`).join("")}</aside><main class="workspace"><header class="topbar"><button class="secondary small" data-action="sidebar" aria-label="Toggle navigation">☰</button><span class="muted">Station workspace</span><span class="spacer"></span><span class="mode">${mode === "demo" ? "● Demo mode" : "● API mode"}</span>${
    mode === "demo"
      ? `<select id="role-switch" aria-label="Demo role"><option>${role}</option>${Object.keys(
          permissions,
        )
          .filter((r) => r !== role)
          .map((r) => `<option>${r}</option>`)
          .join("")}</select>`
      : ""
  }<span class="avatar">${esc(
    (user?.FullName || "Demo User")
      .split(" ")
      .map((v) => v[0])
      .slice(0, 2)
      .join(""),
  )}</span><span class="user-name">${esc(user?.FullName || "Demo User")}<br><small class="muted">${esc(role)}</small></span>${btn("Sign out", "logout")}</header><section class="content" id="content"><div class="loading" role="status">Loading workspace…</div></section></main></div>`;
}
function login() {
  app.innerHTML = `<div class="login"><section class="login-art"><div class="brand">station<span> /</span></div><div class="eyebrow">SERVICE STATION MANAGEMENT</div><h1>A smoother day.<br>Every service.</h1><p>Customers, vehicles and your entire station workflow, together in one organized workspace.</p><p>University DBMS project · Backend milestone 50%</p></section><section class="login-form"><div class="eyebrow">WELCOME BACK</div><h1>Sign in to your station</h1><p class="muted">Use your local employee account for real database records.</p><form id="login"><label>Username<input name="username" autocomplete="username" required maxlength="50"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="128"></label><button>Sign in to API mode →</button><p id="login-error" role="alert"></p></form><button class="secondary" data-action="demo">Explore interactive demo →</button><p class="muted">No database required for demo. All demo data is synthetic and stored only in this browser.</p></section></div>`;
}
async function load(kind) {
  if (!cache[kind]) cache[kind] = await adapter(kind).all(kind);
  return cache[kind];
}
const name = (kind, id, field) =>
  cache[kind]?.find((r) => r[ids[kind]] === Number(id))?.[field] ||
  "Archived / unavailable";
async function render() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const next = parts[0] || "dashboard";
  if (next === "login" || !user) {
    login();
    return;
  }
  if (route !== next) {
    query = {
      search: "",
      page: 1,
      sort: "",
      direction: "asc",
      archived: false,
    };
  }
  route = next;
  cache = {};
  const run = ++generation;
  shell();
  const content = document.querySelector("#content");
  try {
    if (!titles[route]) {
      content.innerHTML =
        head("Page not found", "This page does not exist.") +
        '<a class="link" href="#/dashboard">Return to workspace →</a>';
      return;
    }
    if (!permissions[role].includes(route)) {
      content.innerHTML = head(
        "Access denied",
        "Your role does not have access to this screen.",
      );
      return;
    }
    let html;
    if (masterKinds.includes(route))
      html = parts[1] ? await customerDetail(parts[1]) : await masterPage();
    else if (route === "dashboard") html = await dashboard();
    else if (["bookings", "jobs"].includes(route))
      html = parts[1] ? await bookingDetail(parts[1]) : await bookingsPage();
    else if (route === "invoices")
      html = parts[1] ? await invoicePage(parts[1]) : await invoiceList();
    else if (route === "payments") html = await paymentsPage();
    else if (route === "inventory") html = await inventoryPage();
    else html = await reportsPage();
    if (run === generation) content.innerHTML = html;
  } catch (e) {
    if (run === generation)
      content.innerHTML =
        head("Unable to load this screen", e.message) +
        btn("Try again", "retry", "", "secondary");
  }
}
async function masterPage() {
  const kind = route;
  const result = await adapter(kind).list(kind, query);
  const cols = {
    customers: ["FullName", "Phone", "Email"],
    vehicles: ["RegistrationNo", "VehicleType", "Brand", "Model"],
    employees: ["FullName", "JobRole", "Phone", "Salary", "AccessRole"],
    services: ["ServiceName", "Price", "EstimatedDuration"],
  }[kind];
  return (
    head(
      titles[kind],
      "Keep your station records organized and up to date.",
      canWrite(kind)
        ? btn(
            "+ Add " + kind.replace(/s$/, ""),
            "add",
            `data-kind="${kind}"`,
            "primary",
          )
        : "",
    ) +
    `<div class="card">${toolbar(
      `<select name="archived" aria-label="Record state"><option value="false">Active records</option><option value="true" ${query.archived ? "selected" : ""}>Archived records</option></select>`,
      cols.map((c) => [c, c.replace(/([A-Z])/g, " $1")]),
    )}${
      result.data.length
        ? table(
            [...cols.map((c) => c.replace(/([A-Z])/g, " $1")), "Actions"],
            result.data.map(
              (r) =>
                `<tr>${cols.map((c) => `<td>${["Price", "Salary"].includes(c) ? money(r[c]) : esc(r[c] || "—")}</td>`).join("")}<td><div class="actions">${kind === "customers" ? `<a class="link" href="#/customers/${r[ids[kind]]}">Details</a>` : ""}${canWrite(kind) && r.IsActive ? btn("Edit", "edit", `data-kind="${kind}" data-id="${r[ids[kind]]}"`) + btn("Archive", "archive", `data-kind="${kind}" data-id="${r[ids[kind]]}"`, "danger small") : ""}</div></td></tr>`,
            ),
          )
        : empty()
    }${pagination(result.total)}</div>`
  );
}
async function customerDetail(id) {
  if (route !== "customers")
    return head(
      "Record detail",
      "Use the edit action on the list to review this record.",
    );
  const c = await adapter("customers").get("customers", id);
  if (!c) throw Error("Customer not found");
  await load("vehicles");
  const vehicles = cache.vehicles.filter((v) => v.CustomerID === Number(id));
  const bookings =
    mode === "demo"
      ? (await demo.all("bookings")).filter((b) =>
          vehicles.some((v) => v.VehicleID === b.VehicleID),
        )
      : [];
  await load("services");
  return (
    head(
      c.FullName,
      "Customer profile & service history",
      `<a class="link" href="#/customers">← Customers</a>`,
    ) +
    `<div class="card card-pad"><div class="detail-list">${["Phone", "Email", "Address"].map((k) => `<div><span class="muted">${k}</span><strong>${esc(c[k] || "—")}</strong></div>`).join("")}</div></div><div class="card"><div class="card-heading"><h2>Registered vehicles</h2>${canWrite("vehicles") ? btn("+ Register vehicle", "add", `data-kind="vehicles" data-customer="${id}"`) : ""}</div>${
      vehicles.length
        ? table(
            ["Registration", "Vehicle", "State"],
            vehicles.map(
              (v) =>
                `<tr><td>${esc(v.RegistrationNo)}</td><td>${esc(v.Brand + " " + v.Model)}</td><td>${badge(v.IsActive ? "Active" : "Archived")}</td></tr>`,
            ),
          )
        : empty("No registered vehicles")
    }</div><div class="card"><div class="card-heading"><h2>Service history</h2></div>${
      mode === "api"
        ? '<div class="notice">Real booking history becomes available at milestone 75%. Demo bookings are not mixed with this customer.</div>'
        : bookings.length
          ? table(
              ["Booking", "Date", "Services", "Status"],
              bookings.map(
                (b) =>
                  `<tr><td><a class="link" href="#/bookings/${b.BookingID}">#${b.BookingID}</a></td><td>${date(b.BookingDate)}</td><td>${b.lines.map((l) => esc(name("services", l.ServiceID, "ServiceName")) + " × " + l.Quantity).join("<br>")}</td><td>${badge(b.Status)}</td></tr>`,
              ),
            )
          : empty("No service history")
    }</div>`
  );
}
async function previewData() {
  // Preview joins always use demo masters, even when API mode is active.
  for (const k of [
    "customers",
    "vehicles",
    "employees",
    "services",
    "bookings",
    "payments",
    "inventory",
  ])
    cache[k] = await demo.all(k);
}
function bookingRows(rows) {
  return rows.map((b) => {
    const v = cache.vehicles.find((v) => v.VehicleID === b.VehicleID);
    return `<tr><td><a class="link" href="#/${route === "jobs" ? "jobs" : "bookings"}/${b.BookingID}">SS-${String(b.BookingID).padStart(4, "0")}</a></td><td><strong>${esc(v?.RegistrationNo)}</strong><br><small class="muted">${esc(name("customers", v?.CustomerID, "FullName"))}</small></td><td>${date(b.BookingDate)}</td><td>${esc(b.AssignedEmployeeID ? name("employees", b.AssignedEmployeeID, "FullName") : "Unassigned")}</td><td>${badge(b.Status)}</td><td>${money(decimal(b.lines.reduce((n, l) => n + cents(l.AgreedPrice) * l.Quantity, 0)))}</td></tr>`;
  });
}
async function dashboard() {
  await previewData();
  const b = cache.bookings,
    issued = b.filter((v) => v.InvoiceNumber),
    paid = cache.payments
      .filter((p) => p.PaymentStatus === "Paid")
      .reduce((n, p) => n + cents(p.Amount), 0),
    out = issued.reduce((n, v) => n + demo.balance(v.BookingID), 0);
  return (
    head(
      "Your station, at a glance",
      "A clear view of the work happening today. · Asia/Karachi",
      btn("Reset demo data", "reset", "", "secondary"),
    ) +
    (mode === "api"
      ? '<div class="notice"><strong>Dashboard demo preview.</strong> All operational metrics below are synthetic. Real dashboard and reports arrive at milestone 100%.</div>'
      : "") +
    `<div class="welcome"><div><div class="eyebrow" style="color:#8fdad1">READY FOR A PRODUCTIVE DAY</div><h2>Good work starts with a clear overview.</h2><p>${b.filter((v) => !["Completed", "Cancelled"].includes(v.Status)).length} open jobs in your demo station. Let’s keep things moving.</p></div><div class="outline">◈</div></div><div class="stats">${[
      ["▤", "Bookings", b.length, "All synthetic bookings"],
      [
        "✓",
        "Completed jobs",
        b.filter((v) => v.Status === "Completed").length,
        "Ready for billing",
      ],
      ["◉", "Paid collections", money(decimal(paid)), "Paid records only"],
      ["↗", "Outstanding", money(decimal(out)), "Issued invoices less paid"],
    ]
      .map(
        ([i, t, v, s]) =>
          `<div class="stat"><span class="icon">${i}</span><span class="muted">${t}</span><strong>${v}</strong><small>${s}</small></div>`,
      )
      .join(
        "",
      )}</div><div class="grid"><div class="card"><div class="card-heading"><h2>Recent bookings</h2>${permissions[role].includes("bookings") ? '<a class="link" href="#/bookings">View all →</a>' : ""}</div>${table(["Booking", "Vehicle / customer", "Scheduled", "Assigned to", "Status", "Charges"], bookingRows(b.slice(-5).reverse()))}</div><div><div class="card card-pad"><h2>Workload by status</h2>${["Pending", "In Progress", "Completed", "Cancelled"].map((s) => `<p>${badge(s)} <span style="float:right">${b.filter((v) => v.Status === s).length}</span></p><div class="bar"><span style="width:${b.length ? (b.filter((v) => v.Status === s).length / b.length) * 100 : 0}%"></span></div>`).join("")}</div><div class="card card-pad"><h2>Stock watch</h2>${
      cache.inventory
        .filter(
          (i) =>
            i.IsActive && Number(i.QuantityAvailable) <= Number(i.ReorderLevel),
        )
        .map(
          (i) =>
            `<p><strong>${esc(i.ItemName)}</strong><br><span class="muted">${esc(i.QuantityAvailable)} ${esc(i.Unit)} remaining</span> ${badge("Low stock")}</p>`,
        )
        .join("") || "<p>All stock above reorder levels.</p>"
    }</div></div></div>`
  );
}
async function bookingsPage() {
  await previewData();
  let rows = cache.bookings
    .filter((b) => route !== "jobs" || b.AssignedEmployeeID === staffId)
    .filter((b) => !query.status || b.Status === query.status)
    .filter(
      (b) =>
        JSON.stringify(b).toLowerCase().includes(query.search.toLowerCase()) ||
        name("vehicles", b.VehicleID, "RegistrationNo")
          .toLowerCase()
          .includes(query.search.toLowerCase()),
    );
  rows.sort(
    (a, b) =>
      String(a[query.sort || "BookingID"]).localeCompare(
        String(b[query.sort || "BookingID"]),
        undefined,
        { numeric: true },
      ) * (query.direction === "desc" ? -1 : 1),
  );
  const total = rows.length;
  rows = rows.slice((query.page - 1) * 10, query.page * 10);
  return (
    head(
      titles[route],
      route === "jobs"
        ? "Your assigned work and permitted status changes."
        : "Manage service requests from arrival to completion.",
      route === "bookings"
        ? btn("+ New booking", "booking-new", "", "primary")
        : "",
    ) +
    preview(route) +
    `<div class="card">${toolbar(
      `<select name="status" aria-label="Status"><option value="">All statuses</option>${["Pending", "In Progress", "Completed", "Cancelled"].map((s) => `<option ${query.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>`,
      [
        ["BookingID", "Booking number"],
        ["BookingDate", "Scheduled date"],
        ["Status", "Status"],
      ],
    )}${rows.length ? table(["Booking", "Vehicle / customer", "Scheduled", "Assigned to", "Status", "Charges"], bookingRows(rows)) : empty("No bookings found")}${pagination(total)}</div>${route === "jobs" ? '<p class="muted">Demo service staff identity: Yasir Ahmed, employee #1. API assigned-job access is deferred to 75%.</p>' : ""}`
  );
}
async function bookingDetail(id) {
  await previewData();
  const b = cache.bookings.find((b) => b.BookingID === Number(id));
  if (!b) throw Error("Booking not found");
  if (route === "jobs" && b.AssignedEmployeeID !== staffId)
    throw Error("Access denied: this job is assigned to another employee");
  const v = cache.vehicles.find((v) => v.VehicleID === b.VehicleID);
  const actions =
    (b.Status === "Pending" && role !== "Service Staff"
      ? btn("Edit booking", "booking-edit", `data-id="${id}"`)
      : "") +
    (["Pending", "In Progress"].includes(b.Status)
      ? btn(
          b.Status === "Pending" ? "Start job" : "Complete job",
          "status",
          `data-id="${id}" data-status="${b.Status === "Pending" ? "In Progress" : "Completed"}"`,
          "primary",
        ) +
        btn(
          "Cancel job",
          "status",
          `data-id="${id}" data-status="Cancelled"`,
          "danger small",
        )
      : "");
  return (
    head(
      "Booking SS-" + String(id).padStart(4, "0"),
      "Service request details",
      actions,
    ) +
    preview("bookings") +
    `<div class="card card-pad"><div class="detail-list"><div><span class="muted">Customer / vehicle</span><strong>${esc(name("customers", v?.CustomerID, "FullName"))}</strong>${esc(v?.RegistrationNo)} · ${esc(v?.Brand)} ${esc(v?.Model)}</div><div><span class="muted">Scheduled (Karachi)</span><strong>${date(b.BookingDate)}</strong></div><div><span class="muted">Job status</span><strong>${badge(b.Status)}</strong></div><div><span class="muted">Assigned employee</span><strong>${esc(b.AssignedEmployeeID ? name("employees", b.AssignedEmployeeID, "FullName") : "Unassigned")}</strong></div><div class="full"><span class="muted">Notes</span><p>${esc(b.Notes || "No additional notes")}</p></div></div></div><div class="card"><div class="card-heading"><h2>Selected services</h2><span class="muted">Historical agreed prices</span></div>${table(
      ["Service", "Quantity", "Agreed price", "Line total"],
      b.lines.map(
        (l) =>
          `<tr><td>${esc(name("services", l.ServiceID, "ServiceName"))}</td><td>${l.Quantity}</td><td>${money(l.AgreedPrice)}</td><td>${money(decimal(cents(l.AgreedPrice) * l.Quantity))}</td></tr>`,
      ),
    )}<div class="invoice-total">Charges: <strong>${money(decimal(b.lines.reduce((n, l) => n + cents(l.AgreedPrice) * l.Quantity, 0)))}</strong></div></div>${b.InvoiceNumber ? `<div class="notice">Invoice ${esc(b.InvoiceNumber)} issued. Financial lines are frozen. ${permissions[role].includes("invoices") ? `<a class="link" href="#/invoices/${id}">View invoice →</a>` : ""}</div>` : b.Status === "Completed" ? '<div class="notice">Job complete. An Administrator or Cashier can issue the invoice from Invoices.</div>' : ""}`
  );
}
async function invoiceList() {
  await previewData();
  let rows = cache.bookings
    .filter((b) => b.Status === "Completed")
    .filter((b) =>
      JSON.stringify(b).toLowerCase().includes(query.search.toLowerCase()),
    );
  rows = sortRecords(rows, "BookingID");
  const total = rows.length;
  rows = rows.slice((query.page - 1) * 10, query.page * 10);
  return (
    head("Invoices", "Issue completed work and track customer balances.") +
    preview("invoices") +
    `<div class="card">${toolbar("", [
      ["BookingID", "Booking number"],
      ["InvoiceDate", "Issue date"],
    ])}${
      rows.length
        ? table(
            ["Invoice", "Booking", "Issued", "Total", "Balance", "Action"],
            rows.map(
              (b) =>
                `<tr><td>${esc(b.InvoiceNumber || "Not issued")}</td><td>#${b.BookingID}</td><td>${date(b.InvoiceDate)}</td><td>${b.InvoiceNumber ? money(b.TotalAmount) : "—"}</td><td>${b.InvoiceNumber ? money(decimal(demo.balance(b.BookingID))) : "—"}</td><td>${b.InvoiceNumber ? `<a class="link" href="#/invoices/${b.BookingID}">View invoice →</a>` : btn("Issue invoice", "issue", `data-id="${b.BookingID}"`)}</td></tr>`,
            ),
          )
        : empty("No completed bookings")
    }${pagination(total)}</div>`
  );
}
async function invoicePage(id) {
  await previewData();
  const b = cache.bookings.find((b) => b.BookingID === Number(id));
  if (!b?.InvoiceNumber) throw Error("Invoice not issued");
  const v = cache.vehicles.find((v) => v.VehicleID === b.VehicleID),
    c = cache.customers.find((c) => c.CustomerID === v?.CustomerID);
  const payments = cache.payments.filter((p) => p.BookingID === b.BookingID);
  return (
    head(
      b.InvoiceNumber,
      "Invoice details & payment history",
      btn("Print invoice", "print") +
        (demo.balance(id) > 0
          ? btn("Record payment", "pay", `data-id="${id}"`, "primary")
          : ""),
    ) +
    preview("invoices") +
    `<article class="invoice card"><div class="invoice-head"><div><h1>station /</h1><p>Vehicle care & service centre<br>Lahore, Pakistan<br>Business time: Asia/Karachi</p><span class="mode">DEMO INVOICE · SYNTHETIC DATA</span></div><div><h2>INVOICE</h2><strong>${esc(b.InvoiceNumber)}</strong><p>${date(b.InvoiceDate)}<br>Booking #${id}</p></div></div><div class="invoice-head"><div><span class="eyebrow">BILL TO</span><h3>${esc(c?.FullName)}</h3><p>${esc(c?.Phone)}<br>${esc(c?.Address)}</p></div><div><span class="eyebrow">VEHICLE</span><h3>${esc(v?.RegistrationNo)}</h3><p>${esc(v?.Brand)} ${esc(v?.Model)}</p></div></div>${table(
      ["Description", "Qty", "Unit price", "Amount"],
      b.lines.map(
        (l) =>
          `<tr><td>${esc(name("services", l.ServiceID, "ServiceName"))}</td><td>${l.Quantity}</td><td>${money(l.AgreedPrice)}</td><td>${money(decimal(cents(l.AgreedPrice) * l.Quantity))}</td></tr>`,
      ),
    )}<div class="invoice-total"><p>Subtotal ${money(b.Subtotal)}</p><p>Discount −${money(b.Discount)}</p><p><strong>Total ${money(b.TotalAmount)}</strong></p><p>Paid ${money(decimal(cents(b.TotalAmount) - demo.balance(id)))}</p><p><strong>Outstanding ${money(decimal(demo.balance(id)))}</strong></p></div><p class="muted">No tax configured. Payments shown record money received externally. Thank you for choosing our station.</p></article><div class="card"><div class="card-heading"><h2>Payment history</h2></div>${payments.length ? paymentTable(payments) : empty("No payments recorded")}</div>`
  );
}
function paymentTable(rows) {
  return table(
    [
      "Payment",
      "Invoice / booking",
      "Date",
      "Method",
      "Amount",
      "State",
      "Action",
    ],
    rows.map(
      (p) =>
        `<tr><td>#${p.PaymentID}</td><td>${esc(cache.bookings.find((b) => b.BookingID === p.BookingID)?.InvoiceNumber || p.BookingID)}</td><td>${date(p.PaymentDate)}</td><td>${esc(p.PaymentMethod)}</td><td>${money(p.Amount)}</td><td>${badge(p.PaymentStatus)}</td><td>${p.PaymentStatus !== "Paid" ? btn("Mark paid", "payment-state", `data-id="${p.PaymentID}" data-status="Paid"`) + btn("Mark failed", "payment-state", `data-id="${p.PaymentID}" data-status="Failed"`) : "Preserved history"}</td></tr>`,
    ),
  );
}
async function paymentsPage() {
  await previewData();
  let rows = cache.payments.filter(
    (p) =>
      (!query.status || p.PaymentStatus === query.status) &&
      JSON.stringify(p).toLowerCase().includes(query.search.toLowerCase()),
  );
  rows = sortRecords(rows, "PaymentID");
  const total = rows.length;
  rows = rows.slice((query.page - 1) * 10, query.page * 10);
  return (
    head(
      "Payments",
      "Paid records reduce the balance. Pending and failed records do not.",
      btn("+ Record payment", "pay", "", "primary"),
    ) +
    preview("payments") +
    `<div class="card">${toolbar(
      `<select name="status" aria-label="Payment state"><option value="">All states</option>${["Paid", "Pending", "Failed"].map((s) => `<option ${query.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>`,
      [
        ["PaymentID", "Payment number"],
        ["PaymentDate", "Date"],
      ],
    )}${rows.length ? paymentTable(rows) : empty("No matching payments")}${pagination(total)}</div>`
  );
}
async function inventoryPage() {
  await previewData();
  let rows = cache.inventory
    .filter((i) => Boolean(i.IsActive) !== query.archived)
    .filter(
      (i) =>
        !query.low || Number(i.QuantityAvailable) <= Number(i.ReorderLevel),
    )
    .filter((i) =>
      i.ItemName.toLowerCase().includes(query.search.toLowerCase()),
    );
  rows.sort(
    (a, b) =>
      String(a[query.sort || "ItemName"]).localeCompare(
        String(b[query.sort || "ItemName"]),
        undefined,
        { numeric: true },
      ) * (query.direction === "desc" ? -1 : 1),
  );
  const total = rows.length;
  rows = rows.slice((query.page - 1) * 10, query.page * 10);
  return (
    head(
      "Inventory",
      "Manual stock management. Receive, consume and monitor your supplies.",
      btn("+ Add item", "add", 'data-kind="inventory"', "primary"),
    ) +
    preview("inventory") +
    '<div class="notice">Stock adjustments are manual. Automatic service deductions and a stock movement ledger are outside this eight-table design.</div>' +
    `<div class="card">${toolbar(
      `<select name="low" aria-label="Stock filter"><option value="">All stock levels</option><option value="true" ${query.low ? "selected" : ""}>Low stock only</option></select><select name="archived" aria-label="Record state"><option value="false">Active</option><option value="true" ${query.archived ? "selected" : ""}>Archived</option></select>`,
      [
        ["ItemName", "Item name"],
        ["QuantityAvailable", "Quantity"],
      ],
    )}${
      rows.length
        ? table(
            [
              "Item",
              "Available",
              "Reorder level",
              "Unit cost",
              "State",
              "Actions",
            ],
            rows.map(
              (i) =>
                `<tr><td><strong>${esc(i.ItemName)}</strong></td><td>${esc(i.QuantityAvailable)} ${esc(i.Unit)}</td><td>${esc(i.ReorderLevel)}</td><td>${money(i.UnitCost)}</td><td>${badge(Number(i.QuantityAvailable) <= Number(i.ReorderLevel) ? "Low stock" : "In stock")}</td><td>${i.IsActive ? `<div class="actions">${btn("Receive", "stock", `data-id="${i.InventoryID}" data-direction="receive"`)}${btn("Consume", "stock", `data-id="${i.InventoryID}" data-direction="consume"`)}${btn("Edit", "edit", `data-kind="inventory" data-id="${i.InventoryID}"`)}${btn("Archive", "archive", `data-kind="inventory" data-id="${i.InventoryID}"`, "danger small")}</div>` : ""}</td></tr>`,
            ),
          )
        : empty()
    }${pagination(total)}</div>`
  );
}
let reportRows = [];
async function reportsPage() {
  await previewData();
  const type = query.type || "bookings",
    start = query.start || "",
    end = query.end || "";
  const inRange = (v) => {
    if (!v) return false;
    const d = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(v));
    return (!start || d >= start) && (!end || d <= end);
  };
  let rows, meaning;
  const bookings = cache.bookings.filter((b) => inRange(b.BookingDate));
  if (["bookings", "completed"].includes(type)) {
    meaning = "BookingDate in Asia/Karachi";
    rows = bookings
      .filter(
        (b) =>
          (type !== "completed" || b.Status === "Completed") &&
          (!query.status || b.Status === query.status),
      )
      .map((b) => ({
        Booking: b.BookingID,
        Date: date(b.BookingDate),
        Vehicle: name("vehicles", b.VehicleID, "RegistrationNo"),
        Status: b.Status,
        Employee: b.AssignedEmployeeID
          ? name("employees", b.AssignedEmployeeID, "FullName")
          : "Unassigned",
      }));
  } else if (["invoiced", "outstanding"].includes(type)) {
    meaning = "InvoiceDate in Asia/Karachi; outstanding balance as of now";
    rows = cache.bookings
      .filter((b) => b.InvoiceNumber && inRange(b.InvoiceDate))
      .map((b) => ({
        Invoice: b.InvoiceNumber,
        Issued: date(b.InvoiceDate),
        InvoicedPKR: b.TotalAmount,
        OutstandingPKR: decimal(demo.balance(b.BookingID)),
      }))
      .filter((r) => type !== "outstanding" || cents(r.OutstandingPKR) > 0);
  } else if (type === "collections") {
    meaning = "PaymentDate in Asia/Karachi; Paid records only";
    rows = cache.payments
      .filter((p) => p.PaymentStatus === "Paid" && inRange(p.PaymentDate))
      .map((p) => ({
        Payment: p.PaymentID,
        Date: date(p.PaymentDate),
        Method: p.PaymentMethod,
        CollectedPKR: p.Amount,
      }));
  } else if (type === "popular") {
    meaning = "BookingDate in Asia/Karachi; completed booking quantities only";
    const counts = {};
    for (const b of bookings.filter((b) => b.Status === "Completed"))
      for (const l of b.lines)
        counts[l.ServiceID] = (counts[l.ServiceID] || 0) + l.Quantity;
    rows = Object.entries(counts)
      .map(([id, n]) => ({
        Service: name("services", id, "ServiceName"),
        Quantity: n,
      }))
      .sort((a, b) => b.Quantity - a.Quantity);
  } else if (type === "employee") {
    meaning = "BookingDate in Asia/Karachi; completed-job counts";
    rows = cache.employees.map((e) => ({
      Employee: e.FullName,
      CompletedJobs: bookings.filter(
        (b) =>
          b.Status === "Completed" && b.AssignedEmployeeID === e.EmployeeID,
      ).length,
    }));
  } else {
    meaning = "Current inventory snapshot; date filters do not apply";
    rows = cache.inventory
      .filter(
        (i) =>
          i.IsActive &&
          (type !== "low" ||
            Number(i.QuantityAvailable) <= Number(i.ReorderLevel)),
      )
      .map((i) => ({
        Item: i.ItemName,
        Quantity: i.QuantityAvailable,
        Unit: i.Unit,
        ReorderLevel: i.ReorderLevel,
        UnitCostPKR: i.UnitCost,
      }));
  }
  reportRows = rows;
  const types = {
    bookings: "Bookings by date and status",
    completed: "Completed jobs",
    invoiced: "Issued invoice totals",
    collections: "Paid collections",
    outstanding: "Outstanding balances",
    popular: "Popular services",
    employee: "Employee completed jobs",
    inventory: "Current inventory",
    low: "Low inventory",
  };
  const sum = (field) =>
    decimal(rows.reduce((n, r) => n + cents(r[field] || 0), 0));
  return (
    head(
      "Reports",
      "Operational insights with explicit dates and financial definitions.",
      btn("Export CSV", "export") + btn("Print report", "print"),
    ) +
    preview("reports") +
    `<div class="card"><form class="toolbar" id="report-filters"><label>Report<select name="type">${Object.entries(
      types,
    )
      .map(
        ([v, t]) =>
          `<option value="${v}" ${v === type ? "selected" : ""}>${t}</option>`,
      )
      .join(
        "",
      )}</select></label><label>From (Karachi)<input type="date" name="start" value="${esc(start)}"></label><label>To (Karachi)<input type="date" name="end" value="${esc(end)}"></label><label>Status<select name="status"><option value="">All</option>${["Pending", "In Progress", "Completed", "Cancelled"].map((s) => `<option ${query.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><button>Generate report</button></form><div class="card-pad"><h2>${types[type]}</h2><p class="muted">DEMO REPORT · ${esc(meaning)} · ${esc(start || "Beginning")} to ${esc(end || "Now")}</p>${type === "invoiced" ? `<h3>Invoiced: ${money(sum("InvoicedPKR"))}</h3>` : type === "collections" ? `<h3>Collected: ${money(sum("CollectedPKR"))}</h3>` : type === "outstanding" ? `<h3>Outstanding: ${money(sum("OutstandingPKR"))}</h3>` : ""}</div>${
      rows.length
        ? table(
            Object.keys(rows[0]),
            rows.map(
              (r) =>
                `<tr>${Object.values(r)
                  .map((v) => `<td>${esc(v)}</td>`)
                  .join("")}</tr>`,
            ),
          )
        : empty("No results in this range")
    }</div>`
  );
}
let modalSave = null;
function openModal(title, html, save, submit = "Save changes") {
  document.querySelector("#modal-body").innerHTML =
    `<h2>${esc(title)}</h2>${html}`;
  document.querySelector("#form-error").textContent = "";
  document.querySelector('#modal-form button[type="submit"]').textContent =
    submit;
  modalSave = save;
  dialog.showModal();
}
async function masterForm(kind, id, customer) {
  let record = id ? await adapter(kind).get(kind, id) : {};
  if (customer) record.CustomerID = customer;
  if (kind === "vehicles") await load("customers");
  const html = fields[kind]
    .filter(([k]) => !(kind === "inventory" && id && k === "QuantityAvailable"))
    .map(([k, label, type, required]) => {
      if (type === "customer")
        return selectInput(
          k,
          label,
          (cache.customers || [])
            .filter((c) => c.IsActive)
            .map((c) => [c.CustomerID, c.FullName]),
          record[k],
          required,
        );
      if (type === "role")
        return selectInput(
          k,
          label,
          Object.keys(permissions).map((r) => [r, r]),
          record[k],
        );
      if (type === "vehicleType")
        return selectInput(
          k,
          label,
          ["Car", "Bike", "Van", "SUV", "Other"].map((v) => [v, v]),
          record[k],
          required,
        );
      const numeric = ["money", "integer", "stock"].includes(type);
      return input(
        k,
        label,
        numeric ? "number" : type,
        record[k],
        required,
        numeric
          ? `min="${type === "integer" ? 1 : 0}" max="99999999" step="${type === "integer" ? 1 : type === "stock" ? ".001" : ".01"}"`
          : `maxlength="${k === "Password" ? 128 : k === "Phone" ? 20 : k === "Address" ? 200 : k === "Description" ? 250 : 100}" ${k === "Password" ? 'minlength="12" autocomplete="new-password"' : ""}`,
      );
    })
    .join("");
  openModal(
    (id ? "Edit " : "Add ") + kind.replace(/s$/, ""),
    `<div class="form-grid">${html}</div>${kind === "employees" ? '<p class="muted">Work designation and access role are separate. Leave username and role empty for employees without login access.</p>' : ""}`,
    async (form) => {
      const data = Object.fromEntries(form);
      if (kind === "inventory" && id)
        data.QuantityAvailable = record.QuantityAvailable;
      await adapter(kind).save(kind, data, id);
    },
  );
}
let bookingLines = [];
function lineEditor() {
  return `<div id="booking-lines">${bookingLines.map((l, i) => `<div class="toolbar" style="padding:10px 0"><span style="flex:1">${esc(name("services", l.ServiceID, "ServiceName"))}</span><label>Quantity<input style="width:90px" type="number" min="1" max="999" step="1" value="${l.Quantity}" data-line="${i}" aria-label="Quantity for ${esc(name("services", l.ServiceID, "ServiceName"))}"></label><span>${money(decimal(cents(l.AgreedPrice) * l.Quantity))}</span><button type="button" class="danger small" data-action="line-remove" data-index="${i}">Remove</button></div>`).join("")}</div><h3 id="charge-preview">Estimated charges: ${money(decimal(bookingLines.reduce((n, l) => n + cents(l.AgreedPrice) * l.Quantity, 0)))}</h3>`;
}
async function bookingForm(id) {
  await previewData();
  const b = id ? cache.bookings.find((b) => b.BookingID === Number(id)) : {};
  bookingLines = structuredClone(b.lines || []);
  const dateValue = b.BookingDate
    ? new Date(new Date(b.BookingDate).getTime() + 5 * 3600000)
        .toISOString()
        .slice(0, 16)
    : today() + "T09:00";
  openModal(
    id ? "Edit booking" : "New service booking",
    `<p class="muted">${mode === "api" ? "Demo preview · uses synthetic vehicles and services." : "Select a vehicle, assign an employee, and add services."}</p><div class="form-grid">${selectInput(
      "VehicleID",
      "Vehicle",
      cache.vehicles
        .filter((v) => v.IsActive)
        .map((v) => [
          v.VehicleID,
          v.RegistrationNo +
            " · " +
            name("customers", v.CustomerID, "FullName"),
        ]),
      b.VehicleID,
      true,
    )}${selectInput(
      "AssignedEmployeeID",
      "Assigned employee",
      cache.employees
        .filter((e) => e.IsActive)
        .map((e) => [e.EmployeeID, e.FullName]),
      b.AssignedEmployeeID,
    )}${input("BookingDate", "Scheduled (Asia/Karachi)", "datetime-local", dateValue, true)}${input("Notes", "Notes", "text", b.Notes || "", false, 'maxlength="1000"')}</div><h3>Services</h3><div class="actions">${selectInput(
      "addService",
      "Choose service",
      cache.services
        .filter((s) => s.IsActive)
        .map((s) => [s.ServiceID, s.ServiceName + " · " + money(s.Price)]),
    )}<button type="button" class="secondary" data-action="line-add">Add service</button></div><div id="line-area">${lineEditor()}</div>`,
    async (form) => {
      await demo.saveBooking(
        {
          VehicleID: form.get("VehicleID"),
          AssignedEmployeeID: form.get("AssignedEmployeeID"),
          BookingDate: new Date(
            form.get("BookingDate") + ":00+05:00",
          ).toISOString(),
          Notes: form.get("Notes"),
          lines: bookingLines,
        },
        id,
      );
    },
  );
}
async function payForm(id) {
  await previewData();
  const options = cache.bookings
    .filter((b) => b.InvoiceNumber && demo.balance(b.BookingID) > 0)
    .map((b) => [
      b.BookingID,
      b.InvoiceNumber +
        " · balance " +
        money(decimal(demo.balance(b.BookingID))),
    ]);
  if (!options.length) throw Error("There are no outstanding issued invoices");
  const token = crypto.randomUUID();
  openModal(
    "Record a payment",
    `<p class="muted">Record an externally received payment. Only Paid reduces the balance.</p><div class="form-grid">${selectInput("BookingID", "Invoice", options, id, true)}${input("Amount", "Amount (PKR)", "number", "", true, 'min="0.01" step="0.01" max="99999999"')}${selectInput(
      "PaymentMethod",
      "Payment method",
      ["Cash", "Card", "Digital"].map((v) => [v, v]),
      "Cash",
      true,
    )}${selectInput(
      "PaymentStatus",
      "Payment state",
      ["Paid", "Pending", "Failed"].map((v) => [v, v]),
      "Paid",
      true,
    )}${input("ReferenceNo", "Reference (optional)", "text", "", false, 'maxlength="100"')}</div>`,
    async (form) =>
      demo.pay({ ...Object.fromEntries(form), IdempotencyKey: token }),
    "Record payment",
  );
}
async function action(button) {
  const { action: a, kind, id } = button.dataset;
  if (a === "demo") {
    mode = "demo";
    sessionStorage.setItem("station.mode", mode);
    user = { FullName: "Demo User" };
    role = "Administrator";
    location.hash = "#/dashboard";
    await render();
    return;
  }
  if (a === "logout") {
    if (mode === "api") await api.logout();
    user = null;
    location.hash = "#/login";
    login();
    return;
  }
  if (a === "sidebar") {
    document
      .querySelector(".shell")
      .classList.toggle(innerWidth < 761 ? "mobile-open" : "closed");
    return;
  }
  if (a === "retry") {
    await render();
    return;
  }
  if (a === "prev" || a === "next") {
    query.page += a === "next" ? 1 : -1;
    await render();
    return;
  }
  if (a === "add" || a === "edit") {
    if (!canWrite(kind)) throw Error("Access denied");
    await masterForm(kind, id, button.dataset.customer);
    return;
  }
  if (a === "archive") {
    if (!canWrite(kind)) throw Error("Access denied");
    openModal(
      "Archive this record?",
      `<p>The record is retained for history and removed from active lists.</p>`,
      async () => adapter(kind).archive(kind, id),
      "Archive record",
    );
    return;
  }
  if (a === "reset") {
    openModal(
      "Reset all demo data?",
      "<p>This replaces all synthetic records in this browser. Real MySQL data is unaffected.</p>",
      async () => demo.reset(),
      "Reset demo data",
    );
    return;
  }
  if (a === "booking-new" || a === "booking-edit") {
    await bookingForm(id);
    return;
  }
  if (a === "line-add") {
    const service = cache.services.find(
      (s) =>
        s.ServiceID ===
        Number(document.querySelector('[name="addService"]').value),
    );
    if (!service) throw Error("Select a service first");
    const line = bookingLines.find((l) => l.ServiceID === service.ServiceID);
    if (line) line.Quantity++;
    else
      bookingLines.push({
        ServiceID: service.ServiceID,
        Quantity: 1,
        AgreedPrice: service.Price,
      });
    document.querySelector("#line-area").innerHTML = lineEditor();
    return;
  }
  if (a === "line-remove") {
    bookingLines.splice(Number(button.dataset.index), 1);
    document.querySelector("#line-area").innerHTML = lineEditor();
    return;
  }
  if (a === "status") {
    openModal(
      "Change job status?",
      `<p>Change booking #${esc(id)} to <strong>${esc(button.dataset.status)}</strong>?</p>`,
      async () =>
        demo.transition(
          id,
          button.dataset.status,
          role === "Service Staff" ? staffId : null,
        ),
      "Confirm status",
    );
    return;
  }
  if (a === "issue") {
    openModal(
      "Issue invoice",
      `<p>Only completed jobs can be invoiced. Issuance freezes agreed prices and totals. No tax is configured.</p>${input("Discount", "Fixed discount (PKR)", "number", "0.00", true, 'min="0" step="0.01"')}`,
      async (form) => demo.issue(id, form.get("Discount")),
      "Issue invoice",
    );
    return;
  }
  if (a === "pay") {
    await payForm(id);
    return;
  }
  if (a === "payment-state") {
    openModal(
      "Update payment state?",
      `<p>Change payment #${esc(id)} to ${esc(button.dataset.status)}? Paid records are preserved.</p>`,
      async () => demo.paymentStatus(id, button.dataset.status),
      "Confirm",
    );
    return;
  }
  if (a === "stock") {
    openModal(
      button.dataset.direction === "receive"
        ? "Receive stock"
        : "Consume stock",
      input(
        "quantity",
        "Quantity",
        "number",
        "",
        true,
        'min="0.001" step="0.001" max="99999999"',
      ),
      async (form) =>
        demo.stock(id, form.get("quantity"), button.dataset.direction),
    );
    return;
  }
  if (a === "print") {
    window.print();
    return;
  }
  if (a === "export") {
    csv(reportRows, "station-demo-report");
    return;
  }
}
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  try {
    await action(button);
  } catch (err) {
    toast(err.message);
  }
});
document
  .querySelector("#cancel")
  .addEventListener("click", () => dialog.close());
document.querySelector("#modal-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submit = e.submitter;
  submit.disabled = true;
  try {
    await modalSave(new FormData(e.target));
    dialog.close();
    toast("Changes saved successfully");
    cache = {};
    await render();
  } catch (err) {
    document.querySelector("#form-error").textContent = err.message;
  } finally {
    submit.disabled = false;
  }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id === "login") {
    e.preventDefault();
    const form = new FormData(e.target);
    e.submitter.disabled = true;
    try {
      user = await api.login(form.get("username"), form.get("password"));
      role = user.AccessRole;
      mode = "api";
      sessionStorage.setItem("station.mode", mode);
      location.hash = "#/" + permissions[role][0];
      await render();
    } catch (err) {
      document.querySelector("#login-error").textContent = err.message;
    } finally {
      if (e.submitter) e.submitter.disabled = false;
    }
  }
  if (["filters", "report-filters"].includes(e.target.id)) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    if (values.start && values.end && values.start > values.end) {
      toast("From date must be before To date");
      return;
    }
    query = {
      ...query,
      ...values,
      archived: values.archived === "true",
      page: 1,
    };
    await render();
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "role-switch") {
    role = e.target.value;
    cache = {};
    location.hash = "#/" + permissions[role][0];
    await render();
  }
  if (e.target.dataset.line !== undefined) {
    const n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      toast("Quantity must be an integer from 1 to 999");
      return;
    }
    bookingLines[Number(e.target.dataset.line)].Quantity = n;
    document.querySelector("#line-area").innerHTML = lineEditor();
  }
});
window.addEventListener("hashchange", render);
if (mode === "api") {
  try {
    user = await api.me();
    role = user.AccessRole;
  } catch {
    user = null;
  }
} else if (location.hash && location.hash !== "#/login")
  user = { FullName: "Demo User" };
await render();

