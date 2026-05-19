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
 * @param {object|null} entity
 * @returns {string|null}
 */
export function getStoredMapLocationLabel(entity) {
  if (!entity || typeof entity !== "object") return null;

  const formatted = pickString(
    entity.formatted_address,
    entity.formattedAddress,
    entity.address,
    entity.location_address,
    entity.gps_address
  );

  const locationName = pickString(
    entity.location_name,
    entity.locationName,
    entity.locality,
    entity.village_name,
    entity.village
  );

  const district = pickString(entity.district, entity.district_name);
  const state = pickString(entity.state, entity.state_name);

  if (formatted) return formatted;

  const parts = [locationName, district, state].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");

  return null;
}
