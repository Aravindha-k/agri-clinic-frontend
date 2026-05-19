import { asDisplayString, DISPLAY_FALLBACK, resolveDistrictLabel, resolveVillageLabel } from "./displayValue";

/**
 * @typedef {Object} VisitLocationDisplay
 * @property {string} formatted_address
 * @property {string} location_name
 * @property {string} locality
 * @property {string} district
 * @property {string} state
 * @property {string} addressLine
 * @property {boolean} fromStoredFields
 */

function pickString(...values) {
  for (const v of values) {
    const s = asDisplayString(v, "");
    if (s && s !== DISPLAY_FALLBACK) return s;
  }
  return "";
}

/**
 * Read human-readable location already saved on the visit (API / DB).
 * @param {object|null} visit
 * @returns {VisitLocationDisplay|null}
 */
export function getStoredVisitLocation(visit) {
  if (!visit || typeof visit !== "object") return null;

  const formatted_address = pickString(
    visit.formatted_address,
    visit.formattedAddress,
    visit.address,
    visit.location_address,
    visit.gps_address
  );

  const location_name = pickString(
    visit.location_name,
    visit.locationName,
    visit.locality
  );

  const locality = pickString(visit.locality, visit.location_name);

  const district = pickString(
    visit.district,
    visit.district_name,
    resolveDistrictLabel(visit.district_ref),
    resolveDistrictLabel(visit.farmer?.district)
  );

  const state = pickString(visit.state, visit.state_name);

  const villageFallback = pickString(
    visit.village_name,
    resolveVillageLabel(visit.village),
    resolveVillageLabel(visit.farmer?.village)
  );

  let addressLine = formatted_address;

  if (!addressLine) {
    const parts = [
      location_name || locality || villageFallback,
      district,
      state,
    ].filter(Boolean);
    addressLine = parts.join(", ");
  }

  if (!addressLine) return null;

  return {
    formatted_address: addressLine,
    location_name: location_name || locality || villageFallback,
    locality: locality || location_name,
    district,
    state,
    addressLine,
    fromStoredFields: true,
  };
}

/**
 * @param {VisitLocationDisplay|null} loc
 */
export function formatVisitLocationPrimary(loc) {
  if (!loc?.addressLine) return null;
  return loc.addressLine;
}

/**
 * @param {number|string|null} lat
 * @param {number|string|null} lng
 */
export function formatCoordinates(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return `${la.toFixed(5)}, ${ln.toFixed(5)}`;
}

/**
 * Payload fields to send when saving a visit (mobile / create visit).
 * @param {import('./reverseGeocode').ResolvedAddress|null} resolved
 */
export function locationFieldsForPayload(resolved) {
  if (!resolved?.formatted_address) return {};
  return {
    location_name: resolved.location_name || resolved.locality || "",
    locality: resolved.locality || "",
    district: resolved.district || "",
    state: resolved.state || "",
    formatted_address: resolved.formatted_address,
    address: resolved.formatted_address,
  };
}

export function visitNeedsClientGeocode(visit) {
  if (getStoredVisitLocation(visit)) return false;
  const lat = Number(visit?.latitude);
  const lng = Number(visit?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}
