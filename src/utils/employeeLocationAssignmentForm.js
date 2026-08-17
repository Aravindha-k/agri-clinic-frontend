/**
 * Form state ↔ backend hierarchy payload for Employee Location Assignments.
 * Reference-only admin metadata — not used for operational scoping.
 *
 * UI persists village-level rows only. District/taluk checkboxes are navigation.
 */

export function createEmptyAssignmentFormState() {
  return {
    selectedDistrictIds: [],
    selectedTalukIds: [],
    selectedVillageIds: [],
    villageTalukMap: {},
  };
}

/** Backend grouped assignment → editable form state (village rows only). */
export function parseAssignmentsToFormState(assignments = []) {
  const state = createEmptyAssignmentFormState();
  const districtIds = new Set();
  const talukIds = new Set();
  const villageIds = new Set();
  const villageTalukMap = {};

  for (const group of assignments) {
    const districtId = group?.district?.id ?? group?.district_id;
    const talukId = group?.taluk?.id ?? group?.taluk_id;
    const villages = Array.isArray(group?.villages) ? group.villages : [];

    if (!villages.length) continue;

    if (districtId) districtIds.add(Number(districtId));
    if (talukId) talukIds.add(Number(talukId));

    for (const village of villages) {
      const vid = village?.id ?? village;
      if (vid == null) continue;
      villageIds.add(Number(vid));
      if (talukId) villageTalukMap[vid] = Number(talukId);
    }
  }

  state.selectedDistrictIds = [...districtIds];
  state.selectedTalukIds = [...talukIds];
  state.selectedVillageIds = [...villageIds];
  state.villageTalukMap = villageTalukMap;
  return state;
}

/** Selected villages → backend { assignments: [...] } payload (village-only groups). */
export function buildAssignmentsPayload(formState, talukDistrictMap = {}) {
  const byTaluk = new Map();

  for (const vid of formState.selectedVillageIds.map(Number)) {
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

export function toggleDistrictSelection(formState, districtId, selected, talukDistrictMap = {}) {
  const id = Number(districtId);
  const next = {
    ...formState,
    villageTalukMap: { ...(formState.villageTalukMap || {}) },
  };

  if (selected) {
    if (!next.selectedDistrictIds.includes(id)) {
      next.selectedDistrictIds = [...next.selectedDistrictIds, id];
    }
    return next;
  }

  next.selectedDistrictIds = next.selectedDistrictIds.filter((d) => d !== id);

  const taluksToRemove = next.selectedTalukIds.filter(
    (t) => Number(talukDistrictMap[t]) === id
  );
  next.selectedTalukIds = next.selectedTalukIds.filter(
    (t) => Number(talukDistrictMap[t]) !== id
  );

  const villagesToRemove = new Set(
    next.selectedVillageIds.filter((v) => taluksToRemove.includes(next.villageTalukMap?.[v]))
  );
  next.selectedVillageIds = next.selectedVillageIds.filter((v) => !villagesToRemove.has(v));
  for (const vid of villagesToRemove) {
    delete next.villageTalukMap[vid];
  }

  return next;
}

export function toggleTalukSelection(formState, talukId, districtId, selected) {
  const tid = Number(talukId);
  const did = Number(districtId);
  const next = {
    ...formState,
    villageTalukMap: { ...(formState.villageTalukMap || {}) },
  };

  if (selected) {
    if (!next.selectedDistrictIds.includes(did)) {
      next.selectedDistrictIds = [...next.selectedDistrictIds, did];
    }
    if (!next.selectedTalukIds.includes(tid)) {
      next.selectedTalukIds = [...next.selectedTalukIds, tid];
    }
    return next;
  }

  next.selectedTalukIds = next.selectedTalukIds.filter((t) => t !== tid);

  const villagesToRemove = next.selectedVillageIds.filter(
    (v) => next.villageTalukMap?.[v] === tid
  );
  next.selectedVillageIds = next.selectedVillageIds.filter(
    (v) => next.villageTalukMap?.[v] !== tid
  );
  for (const vid of villagesToRemove) {
    delete next.villageTalukMap[vid];
  }

  return next;
}

export function toggleVillageSelection(formState, villageId, talukId, districtId, selected) {
  const vid = Number(villageId);
  const tid = Number(talukId);
  const did = Number(districtId);
  const next = {
    ...formState,
    villageTalukMap: { ...(formState.villageTalukMap || {}) },
  };

  if (!next.selectedDistrictIds.includes(did)) {
    next.selectedDistrictIds = [...next.selectedDistrictIds, did];
  }
  if (!next.selectedTalukIds.includes(tid)) {
    next.selectedTalukIds = [...next.selectedTalukIds, tid];
  }

  if (selected) {
    if (!next.selectedVillageIds.includes(vid)) {
      next.selectedVillageIds = [...next.selectedVillageIds, vid];
    }
    next.villageTalukMap[vid] = tid;
  } else {
    next.selectedVillageIds = next.selectedVillageIds.filter((v) => v !== vid);
    delete next.villageTalukMap[vid];
  }

  return next;
}

export function setAllVillagesForTaluk(
  formState,
  talukId,
  districtId,
  villageIds,
  selected
) {
  let next = { ...formState, villageTalukMap: { ...(formState.villageTalukMap || {}) } };
  const ids = villageIds.map(Number);

  if (selected) {
    if (!next.selectedDistrictIds.includes(Number(districtId))) {
      next.selectedDistrictIds = [...next.selectedDistrictIds, Number(districtId)];
    }
    if (!next.selectedTalukIds.includes(Number(talukId))) {
      next.selectedTalukIds = [...next.selectedTalukIds, Number(talukId)];
    }
    for (const vid of ids) {
      if (!next.selectedVillageIds.includes(vid)) {
        next.selectedVillageIds = [...next.selectedVillageIds, vid];
      }
      next.villageTalukMap[vid] = Number(talukId);
    }
  } else {
    next.selectedVillageIds = next.selectedVillageIds.filter(
      (v) => !ids.includes(Number(v)) || next.villageTalukMap?.[v] !== Number(talukId)
    );
    for (const vid of ids) {
      if (next.villageTalukMap?.[vid] === Number(talukId)) {
        delete next.villageTalukMap[vid];
      }
    }
  }

  return next;
}

export function countSelectedVillagesInTaluk(formState, talukId) {
  const tid = Number(talukId);
  return formState.selectedVillageIds.filter(
    (v) => formState.villageTalukMap?.[v] === tid
  ).length;
}

/**
 * Assignable villages for a taluk-scoped fetch.
 * Lightweight API rows omit taluk FK — accept when expectedTalukId is known.
 */
export function filterAssignableVillages(villages = [], expectedTalukId = null) {
  return villages.filter((v) => {
    if (v?.is_active === false) return false;

    const rawTaluk = v?.taluk ?? v?.taluk_id;
    if (rawTaluk == null || rawTaluk === "") {
      return expectedTalukId != null;
    }

    const talukId =
      typeof rawTaluk === "object" && rawTaluk !== null ? rawTaluk.id : rawTaluk;
    if (talukId == null || talukId === "") return false;
    if (expectedTalukId != null && Number(talukId) !== Number(expectedTalukId)) {
      return false;
    }
    return true;
  });
}
