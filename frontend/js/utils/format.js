export const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
export const cents = (value) => {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value)))
    throw Error("Enter a nonnegative amount with at most two decimals");
  const [a, b = ""] = String(value).split(".");
  const n = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n > 9999999999)
    throw Error("Amount is too large");
  return n;
};
export const decimal = (n) => (n / 100).toFixed(2);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Karachi",
      }).format(new Date(value))
    : "—";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function csv(rows, name) {
  if (!rows.length) throw Error("No rows to export");
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[\s]*[=+@\-]|^[\t\r\n]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const keys = Object.keys(rows[0]);
  const text = [
    keys.map(cell).join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
