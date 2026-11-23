import { esc } from "../utils/format.js";
export const badge = (s) =>
  `<span class="badge ${esc(String(s).toLowerCase().replaceAll(" ", "-"))}">${esc(s)}</span>`;
export const btn = (text, action, data = "", style = "secondary small") =>
  `<button class="${style}" data-action="${action}" ${data}>${text}</button>`;
export function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}
export function empty(
  text = "No matching records",
  hint = "Try another search or add your first record.",
) {
  return `<div class="empty"><strong>${esc(text)}</strong>${esc(hint)}</div>`;
}
export function selectInput(
  name,
  label,
  options,
  value = "",
  required = false,
) {
  return `<label>${esc(label)}<select aria-label="${esc(label)}" name="${name}" ${required ? "required" : ""}><option value="">Select…</option>${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
}
export function input(
  name,
  label,
  type = "text",
  value = "",
  required = false,
  extra = "",
) {
  return `<label>${esc(label)}<input aria-label="${esc(label)}" name="${name}" type="${type}" value="${esc(value ?? "")}" ${required ? "required" : ""} ${extra}></label>`;
}
