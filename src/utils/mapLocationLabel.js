import { asDisplayString, DISPLAY_FALLBACK } from "./displayValue";

function pickString(...values) {
  for (const v of values) {
    const s = asDisplayString(v, "");
    if (s && s !== DISPLAY_FALLBACK) return s;
  }
  return "";
}

/**
 * Human-readable location from API row (tracking/geo/visit fields).
 * Preferred order matches live-tracking marker tooltip/popup.
 * @param {object|null} entity
 * @returns {string|null}
 */
export function getStoredMapLocationLabel(entity) {
  if (!entity || typeof entity !== "object") return null;

  const locationName = pickString(
    entity.location_name,
    entity.locationName,
    entity.area_name,
    entity.areaName,
    entity.locality,
    entity.village_name,
    entity.village,
    entity.city
  );

  const formatted = pickString(
    entity.formatted_address,
    entity.formattedAddress,
    entity.address,
    entity.location_address,
    entity.gps_address
  );

  const district = pickString(entity.district, entity.district_name);
  const state = pickString(entity.state, entity.state_name);
  const branch = pickString(entity.branch_name, entity.branch, entity.location_label);

  if (formatted) return formatted;

  const parts = [locationName || branch, district, state].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  if (branch) return branch;

  return null;
}
