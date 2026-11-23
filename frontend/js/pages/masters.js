export const fields = {
  customers: [
    ["FullName", "Full name", "text", true],
    ["Phone", "Phone", "tel", true],
    ["Email", "Email", "email"],
    ["Address", "Address", "text"],
  ],
  vehicles: [
    ["CustomerID", "Customer", "customer", true],
    ["RegistrationNo", "Registration number", "text", true],
    ["VehicleType", "Vehicle type", "vehicleType", true],
    ["Brand", "Brand", "text", true],
    ["Model", "Model", "text", true],
  ],
  employees: [
    ["FullName", "Full name", "text", true],
    ["Phone", "Phone", "tel", true],
    ["JobRole", "Work designation", "text", true],
    ["Salary", "Monthly salary (PKR)", "money", true],
    ["Username", "Login username (optional)", "text"],
    ["AccessRole", "Application role", "role"],
    ["Password", "New password (12+ chars; never stored in demo)", "password"],
  ],
  services: [
    ["ServiceName", "Service name", "text", true],
    ["Description", "Description", "text"],
    ["Price", "Price (PKR)", "money", true],
    ["EstimatedDuration", "Duration (minutes)", "integer", true],
  ],
  inventory: [
    ["ItemName", "Item name", "text", true],
    ["QuantityAvailable", "Opening quantity", "stock", true],
    ["Unit", "Unit", "text", true],
    ["ReorderLevel", "Reorder level", "stock", true],
    ["UnitCost", "Unit cost (PKR)", "money", true],
  ],
};
