# Explicit demo bootstrap

`npm run seed:demo` is the only account bootstrap. It requires an explicit DEMO_PASSWORD environment variable of at least 12 characters and refuses NODE_ENV=production. It uses the Employee table only. Usernames: admin, reception, staff, cashier, manager. No account is silently created on application startup.

