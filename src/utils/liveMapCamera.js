/**
 * Live map camera helpers — save/restore view and bounds checks.
 */

import L from "leaflet";
import {
  fitEmployeeBounds,
  isValidTamilNaduCoordinate,
  LIVE_FIT_OPTIONS,
  LIVE_FULLSCREEN_FIT_OPTIONS,
} from "./mapCoordinates.js";

/**
 * @param {Array<{lat:number,lng:number}>} locations
 * @returns {Array<{lat:number,lng:number}>}
 */
export function filterFitLocations(locations) {
  if (!Array.isArray(locations)) return [];
  return locations.filter(
    (loc) => loc && isValidTamilNaduCoordinate(loc.lat, loc.lng)
  );
}

/**
 * @param {L.Map} map
 * @returns {{ center: [number, number], zoom: number } | null}
 */
export function saveMapCamera(map) {
  if (!map) return null;
  try {
    const c = map.getCenter();
    const z = map.getZoom();
    if (!Number.isFinite(c?.lat) || !Number.isFinite(c?.lng) || !Number.isFinite(z)) {
      return null;
    }
    return { center: [c.lat, c.lng], zoom: z };
  } catch {
    return null;
  }
}

/**
 * @param {L.Map} map
 * @param {{ center: [number, number], zoom: number } | null} saved
 */
export function restoreMapCamera(map, saved) {
  if (!map || !saved?.center || saved.zoom == null) return;
  try {
    map.setView(saved.center, saved.zoom, { animate: false });
  } catch {
    /* unmounting */
  }
}

/**
 * True when every valid employee marker lies inside the current map bounds.
 * @param {L.Map} map
 * @param {Array<{lat:number,lng:number}>} locations
 */
export function mapViewContainsAllMarkers(map, locations) {
  const points = filterFitLocations(locations);
  if (!map || !points.length) return true;
  try {
    const bounds = map.getBounds();
    if (!bounds?.isValid()) return false;
    return points.every((loc) => bounds.contains([loc.lat, loc.lng]));
  } catch {
    return false;
  }
}

/**
 * Fit live employee markers; uses fullscreen padding when requested.
 * @param {L.Map} map
 * @param {Array<{lat:number,lng:number}>} locations
 * @param {"normal"|"fullscreen"} [mode]
 */
export function fitLiveEmployeeCamera(map, locations, mode = "normal") {
  if (!map) return;
  const opts = mode === "fullscreen" ? LIVE_FULLSCREEN_FIT_OPTIONS : LIVE_FIT_OPTIONS;
  fitEmployeeBounds(map, locations, opts);
}

/**
 * Spread markers that share identical coordinates so pins remain visible.
 * @param {Array<object>} employees
 * @returns {Array<{ emp: object, lat: number, lng: number, stacked?: boolean, stackSize?: number }>}
 */
export function spreadStackedEmployeeMarkers(employees) {
  if (!Array.isArray(employees)) return [];
  const groups = new Map();

  for (const emp of employees) {
    const lat = Number(emp.latitude);
    const lng = Number(emp.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(emp);
  }

  const out = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const emp = group[0];
      out.push({
        emp,
        lat: Number(emp.latitude),
        lng: Number(emp.longitude),
      });
      continue;
    }
    group.forEach((emp, index) => {
      const lat = Number(emp.latitude);
      const lng = Number(emp.longitude);
      const angle = (2 * Math.PI * index) / group.length;
      const offsetM = 28;
      const dLat = (offsetM / 111320) * Math.cos(angle);
      const dLng = (offsetM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      out.push({
        emp,
        lat: lat + dLat,
        lng: lng + dLng,
        stacked: true,
        stackSize: group.length,
      });
    });
  }
  return out;
}
