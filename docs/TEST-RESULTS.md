# Verification results

Execution environment: Windows 10, Node.js **22.13.0**, npm **10.9.2**, installed Google Chrome via Playwright. Dependency installation completed and npm audit reported **0 vulnerabilities**. MySQL is not installed/running in this environment: no MySQL command or service was found. MySQL compatibility target is **8.0.16+**; no MySQL version is claimed tested.

## Executed

- `npm install`: completed; package-lock.json generated.
- `node --check`: frontend app and backend master routes passed.
- `npm start`: Express started at http://localhost:3000; static frontend served successfully without MySQL.
- `npm test`: **10 tests passed**, zero failures. Password salt/verification, token signature/tampering/expiry, validation, registration normalization, exact paisa arithmetic, synthetic booking→invoice→partial/full payment flow, frozen invoices, assignment ownership, stock bounds, demo reset/isolation, static HTTP, unauthenticated access, malformed JSON and health behavior.
- Auth HTTP test with an **isolated repository stub**, not MySQL: correct/incorrect login, HttpOnly cookie, `/me` without hash, receptionist denied employee/service writes, missing CSRF rejected, unsafe search kept in bound SQL parameters and unsafe sort excluded, inactive employee denied, logout cookie clearing.
- `node scripts/browser-check.js`: headless installed Chrome passed all page loads, customer + vehicle creation, repeated service selection and quantities, start/complete booking, invoice issue, partial/full payments, stock receive, role restrictions, desktop 1440px/mobile 390px/tablet 820px, missing page, print CSS sidebar hiding, and zero uncaught browser errors. PNG previews and a synthetic invoice PDF are in docs/previews. Visual screenshots were inspected for desktop and mobile.

- `node scripts/browser-api-check.js`: intercepted network test passed real-adapter/preview record isolation and failed-API error display without demo fallback. This uses synthetic HTTP stubs, not a database.

## Not executed / practical limitations

Actual MySQL connectivity, migration execution, real SQL constraints, account seeding, and database-backed CRUD/auth workflows could not be executed without a MySQL server. Repository-stub tests do **not** establish MySQL behavior. Demo uses localStorage and intentionally offers no multi-user/concurrent accounting guarantees. Future backend modules, transactional financial operations and concurrent tests are out of scope until authorized milestones. Browser checks cover Chrome, not Safari/Firefox or a full assistive-technology audit. Browser print PDF was produced; no physical printer was tested.

## Repeat checks

```powershell
npm ci
npm test
npm start
# In a second terminal, with Chrome installed:
node scripts/browser-check.js
```

The browser check uses a fresh browser context and synthetic browser data only. It never mutates MySQL. Tests bind a temporary loopback HTTP port. `npm test` does not migrate, delete or seed database data. Development server is expected on port 3000 for browser-check.js.

## Exact MySQL verification on a separate test database

1. As an administrator, create a **fresh** database named `service_station_test` and distinct test credentials using database/setup.sql as a template. Never use the existing user database. Set DB_NAME and credentials in a separate terminal environment (dotenv does not override explicit environment values).
2. Run `npm run migrate` using the test migrator. Verify `SHOW TABLES` lists exactly Customer, Vehicle, Employee, Service; `SHOW CREATE TABLE` confirms InnoDB, utf8mb4, CHECKs and FK. Run migration again; no data should disappear and no migration table should be added.
3. Set DB_USER/DB_PASSWORD to the test runtime account. Set DEMO_PASSWORD explicitly and `npm run seed:demo`. Start app on a separate PORT, e.g. 3001. GET `/api/health` must return 200 database connected.
4. From the UI, sign in as admin, create a customer, a vehicle, a service, and an employee with and without login. Edit each and check persistence after refresh. Phone `03001234567` must retain zero. `lea-123` and `LEA123` must conflict with 409, including archived rows.
5. Enter negative salary/price and duration 0/fraction: 422. Invalid customer FK: 422. Try quote/SQL strings in search: data must remain intact. Every response must omit PasswordHash, even administrator detail/list.
6. With a separate browser/cookie jar sign in as reception: customer and vehicle writes pass; employee requests and service writes return 403. Service reads pass. Other roles cannot use those master APIs except Manager service read. Unauthenticated lists return 401.
7. Login wrong password returns 401, correct returns 200. `/me` returns identity + csrf. Send a mutation without `x-csrf-token`: 403. Logout with token clears cookie and next `/me` returns 401. Deactivate a second signed-in employee with admin; its next protected request returns 401.
8. Archive a customer with active vehicles: 409. Archive its vehicle then customer: success; archived lists retain history. Confirm runtime MySQL user cannot CREATE or DELETE rows.
9. Attempt database inserts of negative Price/Salary and zero duration only in this test database: CHECK must reject. Verify duplicate normalized registration and invalid FK are rejected by database constraints.
10. Verify API-mode customer lists never include demo names. Disconnect MySQL: master pages show errors rather than demo success; synthetic preview modules still show a prominent preview banner. Back up and retain the test database for review; no automated destructive cleanup is provided.
