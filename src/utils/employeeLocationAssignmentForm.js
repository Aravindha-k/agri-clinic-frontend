/**
 * Employee operational territory is village-level.
 *
 * PUT /admin/employees/{id}/location-assignments/ body is:
 * { village_ids: number[] }
 */

import { matchesAnyFieldPrefix } from "./searchMatch.js";

function toId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    const id = value.id ?? value.pk;
    return id == null || id === "" ? null : Number(id);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toName(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") {
    return String(value.name ?? value.village_name ?? value.label ?? fallback);
  }
  return String(value);
}

function sortByName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
  });
}

/** Display Tamil name. Canonical field is name_ta; tamil_name is a read fallback. */
export function villageTamilName(village) {
  if (!village || typeof village !== "object") return "";
  return String(village.name_ta ?? village.tamil_name ?? village.village_tamil_name ?? "").trim();
}

/** Active villages are assignable, including standalone rows with no parent location. */
export function filterAssignableVillages(villages = []) {
  return (villages || []).filter((v) => {
    if (!v || v.is_active === false) return false;
    return toId(v.id ?? v) != null;
  });
}

export function villageSearchFields(village) {
  if (!village) return [];
  return [village.name, village.village_name, villageTamilName(village)].filter(Boolean);
}

export function filterVillagesByPrefix(villages = [], query = "") {
  if (!String(query || "").trim()) return villages;
  return villages.filter((v) => matchesAnyFieldPrefix(query, villageSearchFields(v)));
}

export function normalizeVillage(village) {
  const id = toId(village?.id ?? village);
  if (id == null) return null;
  return {
    id,
    name: toName(village, ""),
    name_ta: villageTamilName(village),
    is_active: village?.is_active !== false,
  };
}

function mergeVillages(list = []) {
  const byId = new Map();
  for (const village of list) {
    const row = normalizeVillage(village);
    if (!row) continue;
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    byId.set(row.id, {
      ...existing,
      ...row,
      name: row.name || existing.name,
      name_ta: row.name_ta || existing.name_ta,
    });
  }
  return [...byId.values()].sort(sortByName);
}

function collectVillageRows(source) {
  const collected = [];

  const pushItem = (item) => {
    if (item == null || item === "") return;
    if (typeof item === "number" || typeof item === "string") {
      collected.push({ id: item });
      return;
    }
    if (typeof item !== "object") return;
    if (Array.isArray(item.villages)) {
      for (const village of item.villages) collected.push(village);
      return;
    }
    collected.push(item);
  };

  if (source == null) return collected;

  if (Array.isArray(source)) {
    for (const item of source) pushItem(item);
    return collected;
  }

  if (typeof source === "object") {
    if (Array.isArray(source.villages)) {
      for (const village of source.villages) pushItem(village);
    }
    if (Array.isArray(source.village_ids)) {
      for (const id of source.village_ids) pushItem(id);
    }
    if (Array.isArray(source.assignments)) {
      for (const group of source.assignments) pushItem(group);
    }
  }

  return collected;
}

/** Flatten GET assignment detail (village_ids / villages / legacy nested list). */
export function parseAssignedVillages(source = [], masterById = null) {
  let villages = mergeVillages(collectVillageRows(source));
  if (masterById && typeof masterById.get === "function") {
    villages = villages.map((row) => {
      const master = masterById.get(row.id);
      return master ? { ...row, ...normalizeVillage(master) } : row;
    });
  }
  return villages;
}

export function villageIdsFromList(villages = []) {
  return [...new Set((villages || []).map((v) => toId(v?.id ?? v)).filter((id) => id != null))].sort(
    (a, b) => a - b
  );
}

export function villageIdsFromGroups(groups = []) {
  return villageIdsFromList(parseAssignedVillages(groups));
}

export function countsFromVillages(villages = []) {
  return { village_count: villageIdsFromList(villages).length };
}

export function countsFromGroups(groups = []) {
  return countsFromVillages(parseAssignedVillages(groups));
}

export function formatTerritorySummary(summary = {}) {
  const villages = Number(summary.village_count) || 0;
  if (villages === 0) return "No villages assigned";
  return villages === 1 ? "Assigned Villages: 1" : `Assigned Villages: ${villages}`;
}

export function addVillagesToList(current = [], incoming = []) {
  return mergeVillages([...(current || []), ...(incoming || [])]);
}

export function removeVillagesFromList(current = [], villageIds = []) {
  const remove = new Set((villageIds || []).map((id) => Number(id)));
  return (current || []).filter((v) => !remove.has(Number(v.id)));
}

export function addVillagesToGroups(groups = [], incoming) {
  const extra = incoming?.villages || (Array.isArray(incoming) ? incoming : []);
  return addVillagesToList(parseAssignedVillages(groups), extra);
}

export function removeVillagesFromGroups(groups = [], villageIds = []) {
  return removeVillagesFromList(parseAssignedVillages(groups), villageIds);
}

export function summarizeRemoval(villages = [], villageIds = []) {
  const remove = new Set((villageIds || []).map(Number));
  return (villages || [])
    .filter((village) => remove.has(Number(village.id)))
    .map((village) => village.name || `Village ${village.id}`);
}

export function diffVillageIds(originalIds = [], nextIds = []) {
  const original = new Set((originalIds || []).map(Number));
  const next = new Set((nextIds || []).map(Number));
  const added = [...next].filter((id) => !original.has(id)).sort((a, b) => a - b);
  const removed = [...original].filter((id) => !next.has(id)).sort((a, b) => a - b);
  const unchanged = [...next].filter((id) => original.has(id)).sort((a, b) => a - b);
  return { added, removed, unchanged };
}

/** Canonical PUT body: { village_ids: [...] } */
export function buildAssignmentsPayloadFromVillages(villages = []) {
  return { village_ids: villageIdsFromList(villages) };
}

export function indexVillagesById(villages = []) {
  const map = new Map();
  for (const village of villages || []) {
    const row = normalizeVillage(village);
    if (row) map.set(row.id, row);
  }
  return map;
}
