import {
  DISPLAY_FALLBACK,
  resolveDistrictLabel,
  resolveVillageLabel,
} from "./displayValue";

export const TALUK_NOT_ASSIGNED = "Not assigned";

export function resolveTalukLabel(taluk, { legacyNull = false } = {}) {
  if (taluk == null || taluk === "") {
    return legacyNull ? TALUK_NOT_ASSIGNED : DISPLAY_FALLBACK;
  }
  if (typeof taluk === "string") return taluk.trim() || (legacyNull ? TALUK_NOT_ASSIGNED : DISPLAY_FALLBACK);
  if (typeof taluk === "number") return legacyNull ? TALUK_NOT_ASSIGNED : DISPLAY_FALLBACK;
  if (typeof taluk === "object") {
    const label = taluk.name ?? taluk.taluk_name ?? taluk.label;
    return label ? String(label) : legacyNull ? TALUK_NOT_ASSIGNED : DISPLAY_FALLBACK;
  }
  return legacyNull ? TALUK_NOT_ASSIGNED : DISPLAY_FALLBACK;
}

export function resolveTalukId(taluk) {
  if (taluk == null || taluk === "") return "";
  if (typeof taluk === "object") {
    const id = taluk.id ?? taluk.pk;
    return id == null ? "" : String(id);
  }
  return String(taluk);
}

export function resolveLocationBlock(entity = {}) {
  const district =
    entity.district_name ||
    resolveDistrictLabel(entity.district ?? entity.district_id, DISPLAY_FALLBACK);

  const talukRaw = entity.taluk ?? entity.taluk_id ?? entity.taluk_name;
  const talukMissing = talukRaw == null || talukRaw === "";
  const taluk = talukMissing
    ? TALUK_NOT_ASSIGNED
    : entity.taluk_name || resolveTalukLabel(talukRaw, { legacyNull: true });

  const village =
    entity.village_name ||
    resolveVillageLabel(entity.village ?? entity.village_id, DISPLAY_FALLBACK);

  return { district, taluk, village, talukMissing };
}

/** Match district record by name (case-insensitive) for safe defaults */
export function findDistrictByName(districts = [], name) {
  const target = String(name || "").trim().toLowerCase();
  if (!target) return null;
  return (
    districts.find((d) => String(d.name || "").trim().toLowerCase() === target) ||
    districts.find((d) => String(d.name || "").trim().toLowerCase().includes(target)) ||
    null
  );
}
