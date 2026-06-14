import { asDisplayString, resolveDistrictLabel, resolveVillageLabel } from "./displayValue";

export function farmerPhone(f) {
  return asDisplayString(f?.mobile ?? f?.phone, "");
}

export function farmerVillage(f) {
  return asDisplayString(f?.village_name ?? resolveVillageLabel(f?.village), "");
}

export function farmerDistrict(f) {
  return asDisplayString(f?.district_name ?? resolveDistrictLabel(f?.district), "");
}

export function farmerState(f) {
  return asDisplayString(f?.state, "");
}

export function farmerSourceQuarter(f) {
  const q = f?.source_quarter;
  if (!q) return "";
  return String(q).trim();
}

export function farmerIsActive(f) {
  return f?.is_active !== false;
}

export function formatSourceQuarterLabel(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "—";
  if (raw === "quarter1" || raw === "q1") return "Quarter 1";
  if (raw === "quarter2" || raw === "q2") return "Quarter 2";
  return value;
}
