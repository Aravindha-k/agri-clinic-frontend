/**
 * Safe Google Maps search URLs for admin map actions.
 */

export function buildGoogleMapsSearchUrl(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  if (la === 0 && ln === 0) return null;
  const query = `${la},${ln}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Parse "lat,lng" or "lat lng" strings from farmer field GPS text.
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseGpsLocationPair(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object" && value !== null) {
    const lat = Number(value.latitude ?? value.lat);
    const lng = Number(value.longitude ?? value.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const parts = raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}
