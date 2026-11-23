export const specs = {
  customers: {
    table: "Customer",
    id: "CustomerID",
    search: "FullName",
    fields: { FullName: 100, Phone: 20, Email: 100, Address: 200 },
    required: ["FullName", "Phone"],
  },
  vehicles: {
    table: "Vehicle",
    id: "VehicleID",
    search: "RegistrationNo",
    fields: {
      CustomerID: "id",
      RegistrationNo: 30,
      VehicleType: 30,
      Brand: 50,
      Model: 50,
    },
    required: ["CustomerID", "RegistrationNo", "VehicleType", "Brand", "Model"],
  },
  services: {
    table: "Service",
    id: "ServiceID",
    search: "ServiceName",
    fields: {
      ServiceName: 100,
      Description: 250,
      Price: "money",
      EstimatedDuration: "positive",
    },
    required: ["ServiceName", "Price", "EstimatedDuration"],
  },
  employees: {
    table: "Employee",
    id: "EmployeeID",
    search: "FullName",
    fields: {
      FullName: 100,
      Phone: 20,
      JobRole: 50,
      Salary: "money",
      Username: 50,
      AccessRole: 30,
    },
    required: ["FullName", "Phone", "JobRole", "Salary"],
  },
};
export const roles = [
  "Administrator",
  "Receptionist",
  "Service Staff",
  "Cashier",
  "Manager",
];
export function validate(kind, body) {
  const s = specs[kind],
    out = {};
  for (const [key, type] of Object.entries(s.fields)) {
    let v = body[key];
    if (v === undefined) continue;
    if (v === "" || v === null) {
      if (s.required.includes(key)) throw Error(key + " is required");
      out[key] = null;
      continue;
    }
    if (typeof type === "number") {
      if (typeof v !== "string" || v.trim().length > type || !v.trim())
        throw Error("Invalid " + key);
      v = v.trim();
    } else if (type === "money") {
      if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(v)))
        throw Error("Invalid " + key);
      v = String(v);
    } else {
      v = Number(v);
      if (!Number.isSafeInteger(v) || v <= 0) throw Error("Invalid " + key);
    }
    out[key] = v;
  }
  for (const k of s.required)
    if (out[k] === undefined) throw Error(k + " is required");
  if (out.Phone && !/^[+\d ()-]{5,20}$/.test(out.Phone))
    throw Error("Invalid Phone");
  if (out.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.Email))
    throw Error("Invalid Email");
  if (out.RegistrationNo) {
    out.RegistrationNo = out.RegistrationNo.toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z0-9]{2,30}$/.test(out.RegistrationNo))
      throw Error("Invalid RegistrationNo");
  }
  if (out.AccessRole && !roles.includes(out.AccessRole))
    throw Error("Invalid AccessRole");
  return out;
}
