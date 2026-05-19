/**
 * OpenStreetMap Nominatim reverse geocoding with in-memory + localStorage cache.
 * Respects ~1 req/s — do not call on every render; use cached/stored visit fields first.
 */

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `agri_geocode_${CACHE_VERSION}:`;
const MIN_REQUEST_INTERVAL_MS = 1100;
const USER_AGENT = "KavyaAgriClinic/1.0 (admin-panel; contact@kavyaagri.local)";

const memoryCache = new Map();
let lastRequestAt = 0;

function cacheKey(lat, lng) {
  return `${CACHE_PREFIX}${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
}

/**
 * @typedef {Object} ResolvedAddress
 * @property {string} location_name
 * @property {string} locality
 * @property {string} district
 * @property {string} state
 * @property {string} formatted_address
 */

/**
 * @param {Record<string, unknown>} address
 * @returns {ResolvedAddress}
 */
export function parseNominatimAddress(address = {}) {
  const locality =
    address.village ||
    address.town ||
    address.city ||
    address.hamlet ||
    address.suburb ||
    address.locality ||
    address.neighbourhood ||
    "";

  const district =
    address.county ||
    address.state_district ||
    address.district ||
    address.region ||
    "";

  const state = address.state || "";

  const parts = [locality, district, state]
    .map((p) => String(p).trim())
    .filter(Boolean);

  const formatted_address = parts.length > 0 ? parts.join(", ") : "";

  return {
    location_name: String(locality || parts[0] || "").trim(),
    locality: String(locality).trim(),
    district: String(district).trim(),
    state: String(state).trim(),
    formatted_address,
  };
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<ResolvedAddress|null>}
 */
export async function reverseGeocode(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;

  const key = cacheKey(la, ln);
  if (memoryCache.has(key)) return memoryCache.get(key);

  const stored = readStorage(key);
  if (stored?.formatted_address) {
    memoryCache.set(key, stored);
    return stored;
  }

  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(la),
    lon: String(ln),
    addressdetails: "1",
    "accept-language": "en",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const display = data?.display_name ? String(data.display_name) : "";
  const parsed = parseNominatimAddress(data?.address || {});

  if (!parsed.formatted_address && display) {
    parsed.formatted_address = display;
    if (!parsed.location_name) {
      parsed.location_name = display.split(",")[0]?.trim() || "";
    }
  }

  if (!parsed.formatted_address) return null;

  memoryCache.set(key, parsed);
  writeStorage(key, parsed);
  return parsed;
}

/**
 * Non-blocking geocode for visit submit — never throws.
 * @returns {Promise<ResolvedAddress|null>}
 */
export async function reverseGeocodeSafe(lat, lng) {
  try {
    return await reverseGeocode(lat, lng);
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn("[reverseGeocode] failed:", err?.message || err);
    }
    return null;
  }
}
