# HTTP API and future contracts

All real data endpoints are same-origin `/api`. Responses use JSON. Validation errors 422; duplicate/FK conflicts 409; unauthenticated 401; unauthorized/CSRF 403; missing record 404; unavailable database 503. Unknown authenticated API routes return 404. SQL values are parameterized and sorting identifiers come from an allowlist.

## Authentication

```http
POST /api/auth/login
Content-Type: application/json

{"username":"admin","password":"your explicitly seeded local password"}
```

The response sets an eight-hour signed HttpOnly SameSite=Strict cookie. GET `/api/auth/me` returns `{user:{EmployeeID,FullName,AccessRole},csrf}`. Keep csrf in memory. Send `x-csrf-token` for POST, PUT and DELETE. POST `/api/auth/logout` clears the cookie. Signed tokens are stateless; logout clears this browser cookie, while an independently copied valid cookie expires naturally. Immediate account deactivation/role changes take effect because Employee is read on each protected request. Rotating AUTH_SECRET invalidates all tokens. Login is limited to 15 attempts per IP per 15 minutes.

GET `/api/health` is public and returns database connectivity and milestone; it exposes no connection secrets.

## Real master endpoints

Kinds: `customers`, `vehicles`, `services`, `employees`.

- GET `/api/{kind}?search=Ali&page=1&limit=10&sort=FullName&direction=asc&archived=false` → `{data,total,page,limit}`. Sort must be a field of that resource. Search covers name or registration. Limits 1–100; archived=true selects archived rows.
- GET `/api/{kind}/:id` → resource.
- POST `/api/{kind}` → 201 resource.
- PUT `/api/{kind}/:id` → full validated update, 200 resource.
- DELETE `/api/{kind}/:id` → archive only `{ok:true}`.

Example customer body: `{"FullName":"Ali Khan","Phone":"03001234567","Email":"ali@example.test","Address":"Lahore"}`.

Example vehicle: `{"CustomerID":1,"RegistrationNo":"LEA-123","VehicleType":"Car","Brand":"Toyota","Model":"Corolla"}`. Registration is normalized to `LEA123`; owner must be active.

Example service: `{"ServiceName":"Car wash","Description":"Foam wash","Price":"1200.00","EstimatedDuration":35}`.

Example employee without login: `{"FullName":"Ali","Phone":"03001234567","JobRole":"Technician","Salary":"45000.00","Username":null,"AccessRole":null}`.

For login access supply Username, one of the documented AccessRole values, and Password of 12–128 characters. Password may be omitted on an existing login update to preserve its hash. Clear Username and AccessRole to revoke login. JobRole is work designation and is independent of permissions. Never send PasswordHash; it is ignored and never returned.

## Planned only — no functioning backend routes yet

75%:

- GET/POST `/api/bookings`, GET/PUT `/api/bookings/:id` (Pending edits only), POST `/api/bookings/:id/status`, GET `/api/jobs` scoped to assigned employee.
- POST `/api/bookings/:id/invoice` with fixed discount; GET `/api/invoices` and `/api/invoices/:id`.
- Booking input: VehicleID, AssignedEmployeeID, BookingDate, Notes, lines [{ServiceID,Quantity}]. Server looks up prices, saves header and lines atomically and preserves AgreedPrice snapshots.
- Invoice issuance transaction locks booking, calculates exact totals, enforces uniqueness and returns existing invoice on retries. Issued financial lines are immutable.

100%:

- GET/POST `/api/payments`, POST `/api/payments/:id/status`, mandatory IdempotencyKey. Lock booking/invoice balance and recheck Paid transition against Paid sum to prevent overpayment.
- GET/POST/PUT/archive `/api/inventory`; POST `/api/inventory/:id/adjustments` with receive/consume quantity. Atomic stock update must never go negative.
- GET `/api/dashboard`, GET `/api/reports/:type?from=YYYY-MM-DD&to=YYYY-MM-DD` using Asia/Karachi inclusive dates converted to UTC half-open intervals. Aggregate line and payment totals separately.

Future routes must validate active references, enforce documented roles, use safe transactions and never mix preview IDs with real records. No future SQL migration is executed or included as a runnable migration in this delivery.
