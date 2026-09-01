import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  MapPin,
  Search,
  Trash2,
  X,
} from "lucide-react";
import SlidePanel from "../ui/SlidePanel";
import ConfirmDialog from "../ui/ConfirmDialog";
import ErrorRetry from "../ui/ErrorRetry";
import { PageLoader } from "../ui/command";
import {
  fetchAllDistricts,
  fetchAllVillagesByTaluk,
  fetchTaluksByDistrict,
} from "../../api/master.api";
import {
  fetchEmployeeLocationAssignmentDetail,
  updateEmployeeLocationAssignments,
} from "../../api/employeeLocationAssignments.api";
import {
  buildAssignmentsPayload,
  countSelectedVillagesInTaluk,
  createEmptyAssignmentFormState,
  filterAssignableVillages,
  parseAssignmentsToFormState,
  setAllVillagesForTaluk,
  toggleDistrictSelection,
  toggleTalukSelection,
  toggleVillageSelection,
} from "../../utils/employeeLocationAssignmentForm";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { startsWithSearch } from "../../utils/searchMatch";

function empDisplayName(employee) {
  if (!employee) return "\u2014";
  return (
    employee.display_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    employee.username ||
    employee.employee_id
  );
}

function VillageCheckboxList({
  talukId,
  districtId,
  villages,
  loading,
  loadError,
  onRetry,
  selectedIds,
  villageTalukMap,
  onToggle,
  onSelectAll,
  onClearAll,
  search,
  onSearchChange,
}) {
  const assignable = useMemo(
    () => filterAssignableVillages(villages, talukId),
    [villages, talukId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return assignable;
    return assignable.filter((v) => startsWithSearch(v.name, search));
  }, [assignable, search]);

  const selectedInTaluk = selectedIds.filter(
    (id) => villageTalukMap?.[id] === Number(talukId)
  );

  if (loading) {
    return (
      <div className="emp-loc-inline-loading" aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Loading villages…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="emp-loc-village-error">
        <p>Unable to load villages — {loadError}</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (assignable.length === 0) {
    return <p className="emp-loc-empty-inline">No villages found for this taluk.</p>;
  }

  return (
    <div className="emp-loc-village-panel">
      <div className="emp-loc-village-panel__toolbar">
        <div className="search-wrapper emp-loc-village-panel__search">
          <Search className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search villages…"
            className="search-input"
            aria-label={`Search villages in taluk ${talukId}`}
          />
        </div>
        <span className="emp-loc-village-panel__count">{selectedInTaluk.length} selected</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSelectAll}>
          Select all
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClearAll}
          disabled={selectedInTaluk.length === 0}
        >
          Clear
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="emp-loc-empty-inline">No villages match your search.</p>
      ) : (
        <ul className="emp-loc-village-list" role="group">
          {filtered.map((village) => {
            const vid = Number(village.id);
            const checked = selectedIds.includes(vid);
            return (
              <li key={vid}>
                <label className="emp-loc-check-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(vid, e.target.checked)}
                  />
                  <span>{village.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function EmployeeLocationAssignmentDrawer({
  open,
  employee,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [formState, setFormState] = useState(createEmptyAssignmentFormState);
  const [expandedDistrictIds, setExpandedDistrictIds] = useState({});
  const [expandedTalukIds, setExpandedTalukIds] = useState({});

  const [talukCache, setTalukCache] = useState({});
  const [talukLoading, setTalukLoading] = useState({});
  const [villageCache, setVillageCache] = useState({});
  const [villageLoading, setVillageLoading] = useState({});
  const [villageLoadError, setVillageLoadError] = useState({});
  const [villageSearch, setVillageSearch] = useState({});

  const talukCacheRef = useRef(talukCache);
  const villageCacheRef = useRef(villageCache);
  const villageLoadErrorRef = useRef(villageLoadError);
  const hydrateRequestRef = useRef(0);

  talukCacheRef.current = talukCache;
  villageCacheRef.current = villageCache;
  villageLoadErrorRef.current = villageLoadError;

  const talukDistrictMap = useMemo(() => {
    const map = {};
    Object.values(talukCache).forEach((list) => {
      for (const taluk of list) {
        map[taluk.id] = taluk.district ?? taluk.district_id;
      }
    });
    return map;
  }, [talukCache]);

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true);
    try {
      const { results } = await fetchAllDistricts({ is_active: true });
      setDistricts((results || []).filter((d) => d.is_active !== false));
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  const loadTaluks = useCallback(async (districtId) => {
    if (!districtId || talukCacheRef.current[districtId]) return;
    setTalukLoading((prev) => ({ ...prev, [districtId]: true }));
    try {
      const rows = await fetchTaluksByDistrict(districtId, { is_active: true });
      setTalukCache((prev) => ({
        ...prev,
        [districtId]: (rows || []).filter((t) => t.is_active !== false),
      }));
    } finally {
      setTalukLoading((prev) => ({ ...prev, [districtId]: false }));
    }
  }, []);

  const loadVillages = useCallback(async (talukId) => {
    if (!talukId) return;
    if (villageCacheRef.current[talukId] && !villageLoadErrorRef.current[talukId]) return;

    setVillageLoading((prev) => ({ ...prev, [talukId]: true }));
    setVillageLoadError((prev) => ({ ...prev, [talukId]: null }));
    try {
      const { results } = await fetchAllVillagesByTaluk(talukId, { is_active: true });
      setVillageCache((prev) => ({
        ...prev,
        [talukId]: filterAssignableVillages(results || [], talukId),
      }));
    } catch (err) {
      setVillageLoadError((prev) => ({
        ...prev,
        [talukId]: friendlyErrorMessage(err, "Request failed"),
      }));
    } finally {
      setVillageLoading((prev) => ({ ...prev, [talukId]: false }));
    }
  }, []);

  const hydrateFromDetail = useCallback(async () => {
    if (!employee?.id) return;
    const requestId = hydrateRequestRef.current + 1;
    hydrateRequestRef.current = requestId;

    setLoading(true);
    setLoadError(null);
    setSaved(false);
    setSaveError(null);
    try {
      const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
      if (hydrateRequestRef.current !== requestId) return;

      const parsed = parseAssignmentsToFormState(detail?.assignments || []);
      setFormState(parsed);

      const districtExpand = {};
      for (const did of parsed.selectedDistrictIds) {
        districtExpand[did] = true;
      }
      setExpandedDistrictIds(districtExpand);

      const talukExpand = {};
      for (const tid of parsed.selectedTalukIds) {
        talukExpand[tid] = true;
      }
      setExpandedTalukIds(talukExpand);

      await loadDistricts();
      if (hydrateRequestRef.current !== requestId) return;

      for (const did of parsed.selectedDistrictIds) {
        await loadTaluks(did);
      }
      if (hydrateRequestRef.current !== requestId) return;

      for (const tid of parsed.selectedTalukIds) {
        await loadVillages(tid);
      }
    } catch (err) {
      if (hydrateRequestRef.current !== requestId) return;
      setLoadError(friendlyErrorMessage(err, "Could not load location assignments."));
    } finally {
      if (hydrateRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [employee?.id, loadDistricts, loadTaluks, loadVillages]);

  useEffect(() => {
    if (!open) {
      hydrateRequestRef.current += 1;
      setFormState(createEmptyAssignmentFormState());
      setLoadError(null);
      setSaveError(null);
      setSaved(false);
      setConfirmClear(false);
      setExpandedDistrictIds({});
      setExpandedTalukIds({});
      setVillageSearch({});
      setVillageCache({});
      setVillageLoadError({});
      setTalukCache({});
      setTalukLoading({});
      setVillageLoading({});
      return;
    }

    if (employee?.id) {
      hydrateFromDetail();
    }
  }, [open, employee?.id, hydrateFromDetail]);

  const expandDistrict = (districtId) => {
    setExpandedDistrictIds((prev) => ({ ...prev, [districtId]: true }));
    loadTaluks(districtId);
  };

  const collapseDistrict = (districtId) => {
    setExpandedDistrictIds((prev) => ({ ...prev, [districtId]: false }));
  };

  const expandTaluk = (talukId) => {
    setExpandedTalukIds((prev) => ({ ...prev, [talukId]: true }));
    loadVillages(talukId);
  };

  const collapseTaluk = (talukId) => {
    setExpandedTalukIds((prev) => ({ ...prev, [talukId]: false }));
  };

  const handleDistrictToggle = (districtId, checked) => {
    setFormState((prev) => toggleDistrictSelection(prev, districtId, checked, talukDistrictMap));
    if (checked) {
      expandDistrict(districtId);
    } else {
      collapseDistrict(districtId);
    }
  };

  const handleTalukToggle = (talukId, districtId, checked) => {
    setFormState((prev) => toggleTalukSelection(prev, talukId, districtId, checked));
    if (checked) {
      expandTaluk(talukId);
    } else {
      collapseTaluk(talukId);
    }
  };

  const handleVillageToggle = (villageId, talukId, districtId, checked) => {
    setFormState((prev) =>
      toggleVillageSelection(prev, villageId, talukId, districtId, checked)
    );
  };

  const handleSave = async () => {
    if (!employee?.id || saving || formState.selectedVillageIds.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload = buildAssignmentsPayload(formState, talukDistrictMap);
      const { data } = await updateEmployeeLocationAssignments(employee.id, payload);
      setSaved(true);
      onSaved?.(employee.id, data?.location_assignment_summary);
      setTimeout(() => {
        onClose?.();
      }, 600);
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Could not save location assignments."));
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    setConfirmClear(false);
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await updateEmployeeLocationAssignments(employee.id, {
        assignments: [],
      });
      setFormState(createEmptyAssignmentFormState());
      onSaved?.(employee.id, data?.location_assignment_summary);
      setSaved(true);
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Could not remove assignments."));
    } finally {
      setSaving(false);
    }
  };

  const hasSavedVillages = formState.selectedVillageIds.length > 0;
  const canSave = hasSavedVillages && !saving && !loading;

  return (
    <>
      <SlidePanel
        open={open}
        onClose={onClose}
        title="Manage Locations"
        wide
        tone="masters"
      >
        <div className="emp-loc-drawer">
          <header className="emp-loc-drawer__hero">
            <div>
              <p className="emp-loc-drawer__name">{empDisplayName(employee)}</p>
              <p className="emp-loc-drawer__meta">
                {employee?.employee_id || "\u2014"} ·{" "}
                <span
                  className={
                    employee?.is_active
                      ? "emp-loc-status emp-loc-status--active"
                      : "emp-loc-status emp-loc-status--inactive"
                  }
                >
                  {employee?.is_active ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
          </header>

          <div className="emp-loc-drawer__note" role="note">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
            <p>
              Location assignments are for administrative reference only and do not
              restrict employee access, farmers, visits, or tracking.
            </p>
          </div>

          {loading ? (
            <PageLoader label="Loading assignments…" />
          ) : loadError ? (
            <ErrorRetry message={loadError} onRetry={hydrateFromDetail} />
          ) : (
            <>
              <div className="emp-loc-drawer__section-head">
                <h3 className="emp-loc-drawer__section-title">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  Assigned Locations
                </h3>
                {hasSavedVillages && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm emp-loc-drawer__clear-all"
                    onClick={() => setConfirmClear(true)}
                    disabled={saving}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Remove all
                  </button>
                )}
              </div>

              {!hasSavedVillages && (
                <p className="emp-loc-empty">No locations assigned yet.</p>
              )}

              {districtsLoading && districts.length === 0 ? (
                <div className="emp-loc-inline-loading" aria-busy="true">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Loading districts…
                </div>
              ) : (
                <div className="emp-loc-district-list">
                  {districts.map((district) => {
                    const did = Number(district.id);
                    const districtOpen = Boolean(expandedDistrictIds[did]);
                    const districtChecked = formState.selectedDistrictIds.includes(did);
                    const taluks = talukCache[did] || [];

                    return (
                      <section key={did} className="emp-loc-district-block">
                        <div className="emp-loc-district-block__head">
                          <button
                            type="button"
                            className="emp-loc-expand-btn"
                            onClick={() => {
                              if (districtOpen) {
                                collapseDistrict(did);
                              } else {
                                expandDistrict(did);
                              }
                            }}
                            aria-expanded={districtOpen}
                            aria-label={`${districtOpen ? "Collapse" : "Expand"} ${district.name}`}
                          >
                            {districtOpen ? (
                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                          <label className="emp-loc-check-row emp-loc-check-row--strong">
                            <input
                              type="checkbox"
                              checked={districtChecked}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleDistrictToggle(did, e.target.checked)}
                            />
                            <span>{district.name}</span>
                          </label>
                        </div>

                        {districtOpen && (
                          <div className="emp-loc-district-block__body">
                            <div className="emp-loc-taluk-list">
                              {talukLoading[did] ? (
                                <div className="emp-loc-inline-loading" aria-busy="true">
                                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                  Loading taluks…
                                </div>
                              ) : taluks.length === 0 ? (
                                <p className="emp-loc-empty-inline">No taluks available.</p>
                              ) : (
                                taluks.map((taluk) => {
                                  const tid = Number(taluk.id);
                                  const talukChecked = formState.selectedTalukIds.includes(tid);
                                  const talukOpen = Boolean(expandedTalukIds[tid]);

                                  return (
                                    <div key={tid} className="emp-loc-taluk-block">
                                      <div className="emp-loc-taluk-block__head">
                                        <label className="emp-loc-check-row">
                                          <input
                                            type="checkbox"
                                            checked={talukChecked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) =>
                                              handleTalukToggle(tid, did, e.target.checked)
                                            }
                                          />
                                          <span>{taluk.name}</span>
                                          {talukChecked && (
                                            <span className="emp-loc-taluk-block__count">
                                              {countSelectedVillagesInTaluk(formState, tid)}{" "}
                                              selected
                                            </span>
                                          )}
                                        </label>
                                      </div>

                                      {talukOpen && (
                                        <div className="emp-loc-taluk-block__body">
                                          <VillageCheckboxList
                                            talukId={tid}
                                            districtId={did}
                                            villages={villageCache[tid] || []}
                                            loading={villageLoading[tid]}
                                            loadError={villageLoadError[tid]}
                                            onRetry={() => {
                                              setVillageCache((prev) => {
                                                const next = { ...prev };
                                                delete next[tid];
                                                return next;
                                              });
                                              loadVillages(tid);
                                            }}
                                            selectedIds={formState.selectedVillageIds}
                                            villageTalukMap={formState.villageTalukMap}
                                            onToggle={(vid, checked) =>
                                              handleVillageToggle(vid, tid, did, checked)
                                            }
                                            onSelectAll={() => {
                                              const allIds = filterAssignableVillages(
                                                villageCache[tid] || [],
                                                tid
                                              ).map((v) => Number(v.id));
                                              setFormState((prev) =>
                                                setAllVillagesForTaluk(
                                                  prev,
                                                  tid,
                                                  did,
                                                  allIds,
                                                  true
                                                )
                                              );
                                            }}
                                            onClearAll={() => {
                                              const allIds = filterAssignableVillages(
                                                villageCache[tid] || [],
                                                tid
                                              ).map((v) => Number(v.id));
                                              setFormState((prev) =>
                                                setAllVillagesForTaluk(
                                                  prev,
                                                  tid,
                                                  did,
                                                  allIds,
                                                  false
                                                )
                                              );
                                            }}
                                            search={villageSearch[tid] || ""}
                                            onSearchChange={(val) =>
                                              setVillageSearch((prev) => ({
                                                ...prev,
                                                [tid]: val,
                                              }))
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              {saveError && (
                <div className="emp-loc-save-error" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{saveError}</span>
                  <button
                    type="button"
                    className="emp-loc-save-error__dismiss"
                    onClick={() => setSaveError(null)}
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {saved && (
                <p className="emp-loc-save-success" role="status">
                  Saved successfully
                </p>
              )}

              <div className="emp-loc-drawer__foot">
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={handleSave}
                  disabled={!canSave}
                  title={
                    !hasSavedVillages
                      ? "Select at least one village, or use Remove all to clear assignments"
                      : undefined
                  }
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {saving ? "Saving…" : "Save assignments"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-md"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </SlidePanel>

      <ConfirmDialog
        open={confirmClear}
        title="Remove all assigned locations?"
        message="This clears every village reference for this employee. It does not deactivate the employee account."
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
        loading={saving}
        variant="danger"
      />
    </>
  );
}
