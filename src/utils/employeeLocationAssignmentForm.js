/**
 * Employee operational territory is village-level.
 * District / Taluk are grouping context derived from Village → Taluk → District.
 *
 * PUT /admin/employees/{id}/location-assignments/ replaces the entire set.
 * Always build the complete desired village set before save.
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
    return String(value.name ?? value.village_name ?? value.taluk_name ?? value.label ?? fallback);
  }
  return String(value);
}

function sortByName(a, b) {
  return String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
  });
}

export function villageTalukId(village) {
  if (!village || typeof village !== "object") return null;
  if (village.taluk === null || village.taluk_id === null) return null;
  if (village.taluk === "" || village.taluk_id === "") return null;
  return toId(village.taluk) ?? toId(village.taluk_id);
}

export function villageDistrictId(village) {
  if (!village || typeof village !== "object") return null;
  return toId(village.district) ?? toId(village.district_id);
}

/** True when village is an explicit orphan (taluk missing). Omitted FK is not an orphan. */
export function isOrphanVillage(village) {
  if (!village || typeof village !== "object") return true;
  if (village.taluk === null || village.taluk_id === null) return true;
  if (village.taluk === "" || village.taluk_id === "") return true;
  return false;
}

/**
 * Assignable villages for operational territory.
 * Exclude inactive and explicit orphan (no taluk) rows.
 * Lightweight taluk-scoped rows that omit taluk FK are accepted only when expectedTalukId is known.
 */
export function filterAssignableVillages(villages = [], expectedTalukId = null, expectedDistrictId = null) {
  const expectedTaluk =
    expectedTalukId && typeof expectedTalukId === "object"
      ? toId(expectedTalukId.expectedTalukId ?? expectedTalukId.talukId)
      : toId(expectedTalukId);
  const expectedDistrict =
    expectedTalukId && typeof expectedTalukId === "object"
      ? toId(expectedTalukId.expectedDistrictId ?? expectedTalukId.districtId)
      : toId(expectedDistrictId);

  return (villages || []).filter((v) => {
    if (!v || v.is_active === false) return false;
    if (isOrphanVillage(v)) return false;

    const talukId = villageTalukId(v);
    if (talukId == null) {
      return expectedTaluk != null;
    }
    if (expectedTaluk != null && talukId !== expectedTaluk) return false;

    const districtId = villageDistrictId(v);
    if (expectedDistrict != null && districtId != null && districtId !== expectedDistrict) {
      return false;
    }
    return true;
  });
}

export function villageSearchFields(village) {
  if (!village) return [];
  return [
    village.name,
    village.village_name,
    village.code,
    village.village_code,
    village.official_code,
    village.tamil_name,
    village.name_ta,
  ].filter(Boolean);
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
    code: village?.code ?? village?.village_code ?? "",
  };
}

export function parseAssignmentGroups(assignments = []) {
  const groups = [];

  for (const group of assignments || []) {
    const districtId = toId(group?.district) ?? toId(group?.district_id);
    const talukId = toId(group?.taluk) ?? toId(group?.taluk_id);
    const villages = (Array.isArray(group?.villages) ? group.villages : [])
      .map(normalizeVillage)
      .filter(Boolean);

    if (!districtId || !talukId || villages.length === 0) continue;

    groups.push({
      district_id: districtId,
      district_name: toName(group?.district, group?.district_name || ""),
      taluk_id: talukId,
      taluk_name: toName(group?.taluk, group?.taluk_name || ""),
      villages: villages.sort(sortByName),
    });
  }

  return mergeAssignmentGroups(groups);
}

export function mergeAssignmentGroups(groups = []) {
  const byTaluk = new Map();

  for (const group of groups) {
    const talukId = toId(group?.taluk_id);
    const districtId = toId(group?.district_id);
    if (!talukId || !districtId) continue;

    if (!byTaluk.has(talukId)) {
      byTaluk.set(talukId, {
        district_id: districtId,
        district_name: group.district_name || "",
        taluk_id: talukId,
        taluk_name: group.taluk_name || "",
        villages: [],
      });
    }

    const target = byTaluk.get(talukId);
    const seen = new Set(target.villages.map((v) => v.id));
    for (const village of group.villages || []) {
      const row = normalizeVillage(village);
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      target.villages.push(row);
    }
    target.villages.sort(sortByName);
    if (group.district_name && !target.district_name) target.district_name = group.district_name;
    if (group.taluk_name && !target.taluk_name) target.taluk_name = group.taluk_name;
  }

  return [...byTaluk.values()].sort((a, b) => {
    const districtCmp = sortByName(
      { name: a.district_name },
      { name: b.district_name }
    );
    if (districtCmp !== 0) return districtCmp;
    return sortByName({ name: a.taluk_name }, { name: b.taluk_name });
  });
}

export function nestAssignmentGroups(groups = []) {
  const byDistrict = new Map();

  for (const group of mergeAssignmentGroups(groups)) {
    const key = group.district_id;
    if (!byDistrict.has(key)) {
      byDistrict.set(key, {
        district_id: group.district_id,
        district_name: group.district_name || "District",
        taluks: [],
      });
    }
    byDistrict.get(key).taluks.push({
      taluk_id: group.taluk_id,
      taluk_name: group.taluk_name || "Taluk",
      villages: group.villages,
    });
  }

  return [...byDistrict.values()]
    .map((district) => ({
      ...district,
      village_count: district.taluks.reduce((n, t) => n + t.villages.length, 0),
      taluks: district.taluks.sort((a, b) => sortByName({ name: a.taluk_name }, { name: b.taluk_name })),
    }))
    .sort((a, b) => sortByName({ name: a.district_name }, { name: b.district_name }));
}

export function villageIdsFromGroups(groups = []) {
  const ids = [];
  for (const group of groups) {
    for (const village of group.villages || []) {
      const id = toId(village?.id ?? village);
      if (id != null) ids.push(id);
    }
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function countsFromGroups(groups = []) {
  const nested = nestAssignmentGroups(groups);
  return {
    district_count: nested.length,
    taluk_count: groups.length,
    village_count: villageIdsFromGroups(groups).length,
  };
}

export function formatTerritorySummary(summary = {}) {
  const districts = Number(summary.district_count) || 0;
  const taluks = Number(summary.taluk_count) || 0;
  const villages = Number(summary.village_count) || 0;
  if (districts === 0 && taluks === 0 && villages === 0) {
    return "No territory assigned";
  }
  const dLabel = districts === 1 ? "District" : "Districts";
  const tLabel = taluks === 1 ? "Taluk" : "Taluks";
  const vLabel = villages === 1 ? "Village" : "Villages";
  return `${districts} ${dLabel} · ${taluks} ${tLabel} · ${villages} ${vLabel}`;
}

export function addVillagesToGroups(
  groups = [],
  { district_id, district_name, taluk_id, taluk_name, villages = [] } = {}
) {
  return mergeAssignmentGroups([
    ...groups,
    {
      district_id,
      district_name,
      taluk_id,
      taluk_name,
      villages,
    },
  ]);
}

export function removeVillagesFromGroups(groups = [], villageIds = []) {
  const remove = new Set((villageIds || []).map((id) => Number(id)));
  return mergeAssignmentGroups(
    groups
      .map((group) => ({
        ...group,
        villages: (group.villages || []).filter((v) => !remove.has(Number(v.id))),
      }))
      .filter((group) => group.villages.length > 0)
  );
}

export function removeTalukFromGroups(groups = [], talukId) {
  const tid = Number(talukId);
  return groups.filter((group) => Number(group.taluk_id) !== tid);
}

export function removeDistrictFromGroups(groups = [], districtId) {
  const did = Number(districtId);
  return groups.filter((group) => Number(group.district_id) !== did);
}

export function villagesInTaluk(groups = [], talukId) {
  const tid = Number(talukId);
  const group = groups.find((g) => Number(g.taluk_id) === tid);
  return group?.villages || [];
}

/** Complete PUT payload — replacement semantics. Never send a partial taluk-only set. */
export function buildAssignmentsPayloadFromGroups(groups = []) {
  const merged = mergeAssignmentGroups(groups);
  return {
    assignments: merged.map((group) => ({
      district_id: group.district_id,
      taluk_id: group.taluk_id,
      village_ids: group.villages.map((v) => v.id).sort((a, b) => a - b),
    })),
  };
}

export function diffVillageIds(originalIds = [], nextIds = []) {
  const original = new Set((originalIds || []).map(Number));
  const next = new Set((nextIds || []).map(Number));
  const added = [...next].filter((id) => !original.has(id)).sort((a, b) => a - b);
  const removed = [...original].filter((id) => !next.has(id)).sort((a, b) => a - b);
  const unchanged = [...next].filter((id) => original.has(id)).sort((a, b) => a - b);
  return { added, removed, unchanged };
}

export function summarizeRemoval(groups = [], villageIds = []) {
  const remove = new Set((villageIds || []).map(Number));
  const names = [];
  for (const group of groups) {
    for (const village of group.villages || []) {
      if (remove.has(Number(village.id))) {
        names.push(village.name || `Village ${village.id}`);
      }
    }
  }
  return names;
}

/* ── Legacy checkbox-tree helpers (kept for compatibility) ── */

export function createEmptyAssignmentFormState() {
  return {
    selectedDistrictIds: [],
    selectedTalukIds: [],
    selectedVillageIds: [],
    villageTalukMap: {},
  };
}

export function parseAssignmentsToFormState(assignments = []) {
  const groups = parseAssignmentGroups(assignments);
  const state = createEmptyAssignmentFormState();
  const villageTalukMap = {};
  const districtIds = new Set();
  const talukIds = new Set();
  const villageIds = [];

  for (const group of groups) {
    districtIds.add(group.district_id);
    talukIds.add(group.taluk_id);
    for (const village of group.villages) {
      villageIds.push(village.id);
      villageTalukMap[village.id] = group.taluk_id;
    }
  }

  state.selectedDistrictIds = [...districtIds];
  state.selectedTalukIds = [...talukIds];
  state.selectedVillageIds = villageIds;
  state.villageTalukMap = villageTalukMap;
  return state;
}

export function buildAssignmentsPayload(formState, talukDistrictMap = {}) {
  const byTaluk = new Map();

  for (const vid of (formState?.selectedVillageIds || []).map(Number)) {
    const talukId = formState.villageTalukMap?.[vid];
    if (!talukId) continue;
    const districtId = Number(talukDistrictMap[talukId]);
    if (!districtId) continue;
    if (!byTaluk.has(talukId)) {
      byTaluk.set(talukId, { district_id: districtId, taluk_id: talukId, village_ids: [] });
    }
    byTaluk.get(talukId).village_ids.push(vid);
  }

  for (const group of byTaluk.values()) {
    group.village_ids.sort((a, b) => a - b);
  }

  return { assignments: [...byTaluk.values()] };
}
