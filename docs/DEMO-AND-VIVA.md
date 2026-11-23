# Five-minute demonstration and viva

## Demonstration

1. **0:00–0:40** Run npm start, open localhost:3000, Explore interactive demo. Explain Demo mode and the current four real backend tables. Reset demo data from the dashboard if desired.
2. **0:40–1:30** Customers → Add customer. Open Details → Register vehicle. Explain CustomerID foreign key, text phone numbers, normalized unique registration and archive preservation.
3. **1:30–2:30** Bookings → New booking. Select the new vehicle, choose Yasir, add car wash twice (quantity increments), add interior cleaning, review estimated charges. Save, open detail, start and complete job. Optionally switch to Service Staff to show assigned jobs, then return to Administrator.
4. **2:30–3:30** Invoices → Issue invoice, enter fixed discount, open invoice and Print. Record a partial Paid cash payment, then the remaining balance. Show outstanding reaching zero and immutable paid history.
5. **3:30–4:10** Inventory → Low stock only. Receive fractional shampoo quantity, consume some stock and explain the nonnegative rule and manual adjustments.
6. **4:10–4:40** Reports → issued invoices versus paid collections. Select dates, Generate, Export CSV and Print. Explain each report's business date.
7. **4:40–5:00** Show docs/DESIGN.md current and planned diagrams. If MySQL is installed, sign out and use explicit seeded admin to demonstrate real customer/service CRUD. Explain that 75% and 100% backend work is deliberately deferred.

## Viva notes

- **Primary key:** uniquely identifies a row, e.g. Customer.CustomerID. Natural registration is a unique alternate key; VehicleID is a stable surrogate key.
- **Foreign key:** Vehicle.CustomerID references Customer.CustomerID and prevents orphan owners. Restrictive deletes preserve relationships.
- **Join:** `SELECT v.RegistrationNo,c.FullName FROM Vehicle v JOIN Customer c ON c.CustomerID=v.CustomerID WHERE v.IsActive=1`.
- **CRUD:** create/insert, read/select, update, delete. This project implements archive via UPDATE IsActive=0 instead of physical deletion.
- **Normalization:** Customer details live once in Customer. Vehicle links to owner. Booking ownership is derived through Vehicle. BookingService resolves the planned many-to-many Booking↔Service relationship.
- **Snapshot versus normalization:** AgreedPrice intentionally records historical transaction price independently of the current Service.Price. Changing the menu must not rewrite old invoices.
- **JobRole versus AccessRole:** a technician's designation differs from application permission. Employee may have no login. No extra User table is needed.
- **Authentication:** proves identity via scrypt password verification and a signed expiring cookie. Passwords are salted, never plaintext. A signature prevents token modification; HttpOnly blocks JavaScript from reading the cookie.
- **Authorization:** checks current server-side AccessRole on every protected request; hiding a button is insufficient. CSRF token protects cookie-authenticated mutations.
- **Transactions:** later booking header/line writes and invoice/payment/stock operations must succeed together or roll back. Locks will serialize balance and stock changes.
- **DECIMAL:** avoids binary floating-point money storage. Frontend demo calculations use integer paisa and exact decimal parsing. Inventory supports three fractional decimal places.
- **Eight-table correction:** combine booking and invoice headers in Booking, remove separate Invoice, keep Employee credentials optional and Payment.BookingID. Only the first four tables exist at 50%.
- **Reporting:** sums of service lines joined directly to multiple payments can multiply rows. Aggregate each child set first. Invoiced totals measure billing; Paid collections measure received cash, not the same event/date.
- **Limitations:** one station, no payment gateway/refunds/credit notes, no automatic service-stock deduction, no stock movement history, no production multi-user guarantees in browser demo.
