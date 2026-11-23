# Service Station Management System

A responsive vanilla JavaScript staff application with an Express/MySQL backend. Current delivery: all frontend workflows in demo mode; **50% backend milestone only**. No Booking, BookingService, Payment, Inventory, invoice or report backend is implemented.

## Quick start

Requirements: Node.js 22 LTS or newer; MySQL **8.0.16+** for API mode. Demo requires only Node. Tested environment and actual results are in [docs/TEST-RESULTS.md](docs/TEST-RESULTS.md).

```powershell
npm ci
npm start
```

Open http://localhost:3000 and choose **Explore interactive demo**. This works without a `.env` or MySQL. All names are synthetic. Demo records use the browser key `station.demo.v1`; no real passwords or authentication tokens are saved there. Use the role switcher to explore permissions. Dashboard has a confirmed Reset demo data action. Sign out to return to API login.

## Set up MySQL API mode

1. Install MySQL 8.0.16+ and start the server. Execute `database/setup.sql` as a database administrator after replacing its example passwords. No application database is created automatically.
2. Copy `.env.example` to `.env`. Set a random AUTH_SECRET of 32+ characters (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Configure DB_HOST, DB_PORT, DB_NAME and credentials.
3. Temporarily use the `station_migrator` database account in `.env` and run `npm run migrate`. Ordered migration 001 creates exactly Customer, Vehicle, Employee and Service. It is re-runnable using IF NOT EXISTS and adds no migration table. Only run once on a fresh schema; it does not reconcile manually changed schemas. Keep deployment migration records outside this application. Future schema changes must be additive ordered migrations.
4. Switch `.env` to the least-privilege `station_app` account. Explicitly seed **local demonstration accounts**:

```powershell
$env:DEMO_PASSWORD='ChooseYourLocalDemoPassword123!'
npm run seed:demo
Remove-Item Env:DEMO_PASSWORD
npm start
```

Usernames: `admin`, `reception`, `staff`, `cashier`, `manager`. Password is the value you explicitly chose. Existing accounts are not overwritten. The seed command refuses production mode. It creates only employees; add customers, vehicles and services through the UI. Employees may exist without login credentials.

5. Sign in through the login form. API mode masters use MySQL. Bookings, jobs, billing, payments, stock, dashboard and reports show **separate synthetic demo previews**. Failed API requests show errors and never fall back to demo success.
6. For production use HTTPS and `NODE_ENV=production`; Secure HttpOnly SameSite=Strict cookies require HTTPS. Restarting without a configured secret in development invalidates sessions. Never deploy local seed credentials. The application serves one frontend and API origin; no CORS configuration is required.

## Structure

- `frontend/`: HTML/CSS, ES module page rendering, reusable UI helpers, adapters and utilities. `js/app.js` owns page composition and event dispatch; `adapters/demo.js` owns synthetic workflows; `adapters/api.js` owns fetch requests.
- `backend/`: routes, authentication middleware, validators, repositories, security services and configuration. Route handlers act as controllers; no redundant controller layer is needed for this small milestone.
- `database/`: least-privilege setup, current ordered migration, explicit seed documentation.
- `scripts/`: migration and local account bootstrap.
- `backend/tests/`: meaningful domain/security and HTTP checks.
- `docs/`: schema, permission matrix, API contracts, demonstration, viva and verification.

Run `npm test`. See the separate-database integration procedure in docs/TEST-RESULTS.md. Do not use existing user data for tests. No destructive automated database checks run by default.

## Milestones

- [x] Responsive frontend: login, dashboard, customers/detail/history, vehicles, employees, services, bookings/create/edit/detail, jobs, invoices/print, payments/history, inventory/low-stock, reports/print/CSV, denied and missing pages.
- [x] Synthetic workflows: customer/vehicle registration, multi-service quantities, price preview, assignment/status, invoices, partial/full payments, stock, reports.
- [x] Four-table SQL schema and real master CRUD/archive APIs.
- [x] Authentication, permissions, CSRF, rate limiting, hashing, validation, parameterized SQL, safe errors and explicit local seed.
- [ ] **Wait for “Continue to 75%”**: Booking and BookingService migrations, transactional bookings, assignments, real invoices.
- [ ] **Wait for “Continue to 100%”**: Payment and Inventory migrations, concurrency/idempotency, real dashboard/reports, eight-table verification.

The proposal is background reference. The detailed user request controls the milestone and corrects its missing Booking table, separate Invoice table, technology inconsistencies and table-count typo. See docs/DESIGN.md.

## Troubleshooting

- MySQL unavailable / health 503: demo still works. Check service, credentials, host grants, database name and firewall. Use `GET /api/health`.
- Login rejected: run the explicit local seed, use the chosen password, check employee IsActive and credential fields. Existing usernames are deliberately not overwritten by seeding.
- Login succeeds then requests fail: allow first-party cookies; use one host consistently; production requires HTTPS. A server restart with a random development secret requires a new login.
- CSRF error: sign out/in to refresh the in-memory CSRF token. Do not send cookie mutations without `x-csrf-token`.
- Customer archive blocked: archive active vehicles first. Duplicate registrations remain reserved after archive to preserve identity/history.
- Demo changes disappear: localStorage must be available; another browser has separate demo data. Demo credentials are never used to authenticate API requests.
- Port conflict: set PORT to another free port.

Source ZIP excludes node_modules, real .env files, secrets and temporary files. Install with npm ci after extracting.

Rebuild the source ZIP with `powershell -ExecutionPolicy Bypass -File scripts/package.ps1` from the project root. This uses an explicit file allowlist.

