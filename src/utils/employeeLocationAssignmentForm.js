/**
 * Form state ↔ backend hierarchy payload for Employee Location Assignments.
 * Reference-only admin metadata — not used for operational scoping.
 */

export const DISTRICT_SCOPE_ENTIRE = "entire";
export const DISTRICT_SCOPE_SELECTIVE = "selective";
export const TALUK_SCOPE_ENTIRE = "entire";
export const TALUK_SCOPE_SELECTIVE = "selective";

export function createEmptyAssignmentFormState() {
  return {
    selectedDistrictIds: [],
    districtScope: {},
    selectedTalukIds: [],
    talukScope: {},
    selectedVillageIds: [],
    villageTalukMap: {},
  };
}

/** Backend grouped assignment → editable form state */
export function parseAssignmentsToFormState(assignments = []) {
  const state = createEmptyAssignmentFormState();
  const districtIds = new Set();
  const talukIds = new Set();
  const villageIds = new Set();
  const districtScope = {};
  const talukScope = {};

  const villageTalukMap = {};

  for (const group of assignments) {
    const districtId = group?.district?.id ?? group?.district_id;
    if (!districtId) continue;

    districtIds.add(Number(districtId));
    const taluk = group?.taluk;
    const talukId = taluk?.id ?? group?.taluk_id;
    const villages = Array.isArray(group?.villages) ? group.villages : [];

    if (!talukId && villages.length === 0) {
      districtScope[districtId] = DISTRICT_SCOPE_ENTIRE;
      continue;
    }

    districtScope[districtId] = DISTRICT_SCOPE_SELECTIVE;

    if (talukId && villages.length === 0) {
      talukIds.add(Number(talukId));
      talukScope[talukId] = TALUK_SCOPE_ENTIRE;
      continue;
    }

    if (talukId) {
      talukIds.add(Number(talukId));
      talukScope[talukId] = TALUK_SCOPE_SELECTIVE;
      for (const village of villages) {
        const vid = village?.id ?? village;
        if (vid != null) {
          villageIds.add(Number(vid));
          villageTalukMap[vid] = Number(talukId);
        }
      }
    }
  }

  state.selectedDistrictIds = [...districtIds];
  state.districtScope = districtScope;
  state.selectedTalukIds = [...talukIds];
  state.talukScope = talukScope;
  state.selectedVillageIds = [...villageIds];
  state.villageTalukMap = villageTalukMap;
  return state;
}

/** Editable form state → backend { assignments: [...] } payload */
export function buildAssignmentsPayload(formState, talukDistrictMap = {}) {
  const groups = [];
  const {
    selectedDistrictIds = [],
    districtScope = {},
    selectedTalukIds = [],
    talukScope = {},
    selectedVillageIds = [],
  } = formState;

  const villageSet = new Set(selectedVillageIds.map(Number));

  for (const districtId of selectedDistrictIds.map(Number)) {
    const scope = districtScope[districtId] ?? DISTRICT_SCOPE_SELECTIVE;

    if (scope === DISTRICT_SCOPE_ENTIRE) {
      groups.push({ district_id: districtId, village_ids: [] });
      continue;
    }

    const taluksInDistrict = selectedTalukIds
      .map(Number)
      .filter((talukId) => Number(talukDistrictMap[talukId]) === districtId);

    for (const talukId of taluksInDistrict) {
      const tScope = talukScope[talukId] ?? TALUK_SCOPE_SELECTIVE;

      if (tScope === TALUK_SCOPE_ENTIRE) {
        groups.push({ district_id: districtId, taluk_id: talukId, village_ids: [] });
        continue;
      }

      const villagesForTaluk = [...villageSet].filter((vid) =>
        formState.villageTalukMap?.[vid] === talukId
      );

      if (villagesForTaluk.length > 0) {
        groups.push({
          district_id: districtId,
          taluk_id: talukId,
          village_ids: villagesForTaluk,
        });
      }
    }
  }

  return { assignments: groups };
}

export function toggleDistrictSelection(formState, districtId, selected, talukDistrictMap = {}) {
  const id = Number(districtId);
  const next = {
    ...formState,
    districtScope: { ...formState.districtScope },
    talukScope: { ...formState.talukScope },
    villageTalukMap: { ...(formState.villageTalukMap || {}) },
  };

  if (selected) {
    if (!next.selectedDistrictIds.includes(id)) {
      next.selectedDistrictIds = [...next.selectedDistrictIds, id];
    }
    if (!next.districtScope[id]) {
      next.districtScope[id] = DISTRICT_SCOPE_SELECTIVE;
    }
    return next;
  }

  next.selectedDistrictIds = next.selectedDistrictIds.filter((d) => d !== id);
  delete next.districtScope[id];

  const taluksToRemove = next.selectedTalukIds.filter(
    (t) => Number(talukDistrictMap[t]) === id
  );
  next.selectedTalukIds = next.selectedTalukIds.filter(
    (t) => Number(talukDistrictMap[t]) !== id
  );
  for (const talukId of taluksToRemove) {
    delete next.talukScope[talukId];
  }

  const villagesToRemove = new Set(
    next.selectedVillageIds.filter((v) => next.villageTalukMap?.[v] != null &&
      taluksToRemove.includes(next.villageTalukMap[v]))
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
    districtScope: { ...formState.districtScope },
    talukScope: { ...formState.talukScope },
    villageTalukMap: { ...(formState.villageTalukMap || {}) },
  };

  if (selected) {
    if (!next.selectedDistrictIds.includes(did)) {
      next.selectedDistrictIds = [...next.selectedDistrictIds, did];
    }
    next.districtScope[did] = DISTRICT_SCOPE_SELECTIVE;
    if (!next.selectedTalukIds.includes(tid)) {
      next.selectedTalukIds = [...next.selectedTalukIds, tid];
    }
    if (!next.talukScope[tid]) {
      next.talukScope[tid] = TALUK_SCOPE_SELECTIVE;
    }
    return next;
  }

  next.selectedTalukIds = next.selectedTalukIds.filter((t) => t !== tid);
  delete next.talukScope[tid];

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
    districtScope: { ...formState.districtScope, [did]: DISTRICT_SCOPE_SELECTIVE },
    talukScope: { ...formState.talukScope, [tid]: TALUK_SCOPE_SELECTIVE },
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

export function countFormStateSummary(formState, talukDistrictMap = {}) {
  const districtCount = formState.selectedDistrictIds.length;
  const talukCount = formState.selectedTalukIds.length;
  const villageCount = formState.selectedVillageIds.length;

  let effectiveTalukCount = 0;
  for (const districtId of formState.selectedDistrictIds.map(Number)) {
    if (formState.districtScope[districtId] === DISTRICT_SCOPE_ENTIRE) continue;
    effectiveTalukCount += formState.selectedTalukIds.filter(
      (t) => Number(talukDistrictMap[t]) === districtId
    ).length;
  }

  return {
    district_count: districtCount,
    taluk_count: effectiveTalukCount || talukCount,
    village_count: villageCount,
  };
}

/** Assignable villages — excludes legacy taluk=null rows */
export function filterAssignableVillages(villages = []) {
  return villages.filter((v) => {
    const talukId = v?.taluk ?? v?.taluk_id;
    if (talukId == null || talukId === "") return false;
    if (v?.is_active === false) return false;
    return true;
  });
}
