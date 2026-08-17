import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchAllDistricts, fetchTaluksByDistrict, fetchVillagesByTaluk } from "../../api/master.api";
import {
  fetchEmployeeLocationAssignmentDetail,
  updateEmployeeLocationAssignments,
} from "../../api/employeeLocationAssignments.api";
import {
  buildAssignmentsPayload,
  createEmptyAssignmentFormState,
  DISTRICT_SCOPE_ENTIRE,
  DISTRICT_SCOPE_SELECTIVE,
  filterAssignableVillages,
  parseAssignmentsToFormState,
  TALUK_SCOPE_ENTIRE,
  TALUK_SCOPE_SELECTIVE,
  toggleDistrictSelection,
  toggleTalukSelection,
  toggleVillageSelection,
} from "../../utils/employeeLocationAssignmentForm";
import { friendlyErrorMessage } from "../../utils/friendlyError";

function empDisplayName(employee) {
  if (!employee) return "\u2014";
  return (
    employee.display_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    employee.username ||
    employee.employee_id
  );
}

function ScopeRadio({ name, value, current, onChange, label, disabled }) {
  return (
    <label className="emp-loc-scope-radio">
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}

function VillageCheckboxList({
  talukId,
  districtId,
  villages,
  loading,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = filterAssignableVillages(villages);
    if (!q) return list;
    return list.filter((v) => String(v.name || "").toLowerCase().includes(q));
  }, [villages, search]);

  const selectedInTaluk = selectedIds.filter((id) =>
    filtered.some((v) => Number(v.id) === Number(id))
  );

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
        <span className="emp-loc-village-panel__count">
          {selectedInTaluk.length} selected
        </span>
        {selectedInTaluk.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              for (const id of selectedInTaluk) {
                onToggle(id, false);
              }
            }}
          >
            Clear
          </button>
        )}
      </div>
      {loading ? (
        <div className="emp-loc-inline-loading" aria-busy="true">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading villages…
        </div>
      ) : filtered.length === 0 ? (
        <p className="emp-loc-empty-inline">No assignable villages for this taluk.</p>
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
  const [expandedDistricts, setExpandedDistricts] = useState({});
  const [expandedTaluks, setExpandedTaluks] = useState({});

  const [talukCache, setTalukCache] = useState({});
  const [talukLoading, setTalukLoading] = useState({});
  const [villageCache, setVillageCache] = useState({});
  const [villageLoading, setVillageLoading] = useState({});
  const [villageSearch, setVillageSearch] = useState({});

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
    if (!districtId || talukCache[districtId]) return;
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
  }, [talukCache]);

  const loadVillages = useCallback(async (talukId) => {
    if (!talukId || villageCache[talukId]) return;
    setVillageLoading((prev) => ({ ...prev, [talukId]: true }));
    try {
      const rows = await fetchVillagesByTaluk(talukId, { is_active: true });
      setVillageCache((prev) => ({
        ...prev,
        [talukId]: filterAssignableVillages(rows || []),
      }));
    } finally {
      setVillageLoading((prev) => ({ ...prev, [talukId]: false }));
    }
  }, [villageCache]);

  const hydrateFromDetail = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setLoadError(null);
    setSaved(false);
    setSaveError(null);
    try {
      const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
      const parsed = parseAssignmentsToFormState(detail?.assignments || []);
      setFormState(parsed);

      const districtExpand = {};
      for (const did of parsed.selectedDistrictIds) {
        districtExpand[did] = true;
      }
      setExpandedDistricts(districtExpand);

      const talukExpand = {};
      for (const tid of parsed.selectedTalukIds) {
        talukExpand[tid] = true;
      }
      setExpandedTaluks(talukExpand);

      await loadDistricts();

      for (const did of parsed.selectedDistrictIds) {
        await loadTaluks(did);
      }
      for (const tid of parsed.selectedTalukIds) {
        if (parsed.talukScope[tid] === TALUK_SCOPE_SELECTIVE) {
          await loadVillages(tid);
        }
      }
    } catch (err) {
      setLoadError(friendlyErrorMessage(err, "Could not load location assignments."));
    } finally {
      setLoading(false);
    }
  }, [employee?.id, loadDistricts, loadTaluks, loadVillages]);

  useEffect(() => {
    if (open && employee?.id) {
      hydrateFromDetail();
    }
    if (!open) {
      setFormState(createEmptyAssignmentFormState());
      setLoadError(null);
      setSaveError(null);
      setSaved(false);
      setConfirmClear(false);
      setVillageSearch({});
    }
  }, [open, employee?.id, hydrateFromDetail]);

  const handleDistrictToggle = (districtId, checked) => {
    setFormState((prev) => toggleDistrictSelection(prev, districtId, checked, talukDistrictMap));
    if (checked) {
      setExpandedDistricts((prev) => ({ ...prev, [districtId]: true }));
      loadTaluks(districtId);
    }
  };

  const handleTalukToggle = (talukId, districtId, checked) => {
    setFormState((prev) => toggleTalukSelection(prev, talukId, districtId, checked));
    if (checked) {
      setExpandedTaluks((prev) => ({ ...prev, [talukId]: true }));
    }
  };

  const handleVillageToggle = (villageId, talukId, districtId, checked) => {
    setFormState((prev) =>
      toggleVillageSelection(prev, villageId, talukId, districtId, checked)
    );
  };

  const handleSave = async () => {
    if (!employee?.id || saving) return;
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

  const hasAssignments =
    formState.selectedDistrictIds.length > 0 ||
    formState.selectedTalukIds.length > 0 ||
    formState.selectedVillageIds.length > 0;

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
                {hasAssignments && (
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

              {!hasAssignments && (
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
                    const selected = formState.selectedDistrictIds.includes(did);
                    const expanded = expandedDistricts[did];
                    const scope =
                      formState.districtScope[did] ?? DISTRICT_SCOPE_SELECTIVE;
                    const taluks = talukCache[did] || [];

                    return (
                      <section key={did} className="emp-loc-district-block">
                        <div className="emp-loc-district-block__head">
                          <button
                            type="button"
                            className="emp-loc-expand-btn"
                            onClick={() => {
                              const next = !expanded;
                              setExpandedDistricts((prev) => ({ ...prev, [did]: next }));
                              if (next) loadTaluks(did);
                            }}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${district.name}`}
                          >
                            {expanded ? (
                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                          <label className="emp-loc-check-row emp-loc-check-row--strong">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => handleDistrictToggle(did, e.target.checked)}
                            />
                            <span>{district.name}</span>
                          </label>
                        </div>

                        {selected && expanded && (
                          <div className="emp-loc-district-block__body">
                            <fieldset className="emp-loc-scope-fieldset">
                              <legend className="sr-only">Assignment scope for {district.name}</legend>
                              <ScopeRadio
                                name={`district-scope-${did}`}
                                value={DISTRICT_SCOPE_ENTIRE}
                                current={scope}
                                onChange={(val) =>
                                  setFormState((prev) => ({
                                    ...prev,
                                    districtScope: { ...prev.districtScope, [did]: val },
                                  }))
                                }
                                label="Entire District"
                              />
                              <ScopeRadio
                                name={`district-scope-${did}`}
                                value={DISTRICT_SCOPE_SELECTIVE}
                                current={scope}
                                onChange={(val) =>
                                  setFormState((prev) => ({
                                    ...prev,
                                    districtScope: { ...prev.districtScope, [did]: val },
                                  }))
                                }
                                label="Select Taluks / Villages"
                              />
                            </fieldset>

                            {scope === DISTRICT_SCOPE_SELECTIVE && (
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
                                    const talukSelected =
                                      formState.selectedTalukIds.includes(tid);
                                    const talukExpanded = expandedTaluks[tid];
                                    const tScope =
                                      formState.talukScope[tid] ?? TALUK_SCOPE_SELECTIVE;

                                    return (
                                      <div key={tid} className="emp-loc-taluk-block">
                                        <div className="emp-loc-taluk-block__head">
                                          <button
                                            type="button"
                                            className="emp-loc-expand-btn"
                                            onClick={() => {
                                              const next = !talukExpanded;
                                              setExpandedTaluks((prev) => ({
                                                ...prev,
                                                [tid]: next,
                                              }));
                                              if (next && tScope === TALUK_SCOPE_SELECTIVE) {
                                                loadVillages(tid);
                                              }
                                            }}
                                            aria-expanded={talukExpanded}
                                          >
                                            {talukExpanded ? (
                                              <ChevronDown className="w-4 h-4" aria-hidden="true" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" aria-hidden="true" />
                                            )}
                                          </button>
                                          <label className="emp-loc-check-row">
                                            <input
                                              type="checkbox"
                                              checked={talukSelected}
                                              onChange={(e) =>
                                                handleTalukToggle(tid, did, e.target.checked)
                                              }
                                            />
                                            <span>{taluk.name}</span>
                                          </label>
                                        </div>

                                        {talukSelected && talukExpanded && (
                                          <div className="emp-loc-taluk-block__body">
                                            <fieldset className="emp-loc-scope-fieldset">
                                              <legend className="sr-only">
                                                Scope for {taluk.name}
                                              </legend>
                                              <ScopeRadio
                                                name={`taluk-scope-${tid}`}
                                                value={TALUK_SCOPE_ENTIRE}
                                                current={tScope}
                                                onChange={(val) => {
                                                  setFormState((prev) => ({
                                                    ...prev,
                                                    talukScope: {
                                                      ...prev.talukScope,
                                                      [tid]: val,
                                                    },
                                                  }));
                                                }}
                                                label="Entire Taluk"
                                              />
                                              <ScopeRadio
                                                name={`taluk-scope-${tid}`}
                                                value={TALUK_SCOPE_SELECTIVE}
                                                current={tScope}
                                                onChange={(val) => {
                                                  setFormState((prev) => ({
                                                    ...prev,
                                                    talukScope: {
                                                      ...prev.talukScope,
                                                      [tid]: val,
                                                    },
                                                  }));
                                                  if (val === TALUK_SCOPE_SELECTIVE) {
                                                    loadVillages(tid);
                                                  }
                                                }}
                                                label="Select Villages"
                                              />
                                            </fieldset>

                                            {tScope === TALUK_SCOPE_SELECTIVE && (
                                              <VillageCheckboxList
                                                talukId={tid}
                                                districtId={did}
                                                villages={villageCache[tid] || []}
                                                loading={villageLoading[tid]}
                                                selectedIds={formState.selectedVillageIds}
                                                onToggle={(vid, checked) =>
                                                  handleVillageToggle(vid, tid, did, checked)
                                                }
                                                search={villageSearch[tid] || ""}
                                                onSearchChange={(val) =>
                                                  setVillageSearch((prev) => ({
                                                    ...prev,
                                                    [tid]: val,
                                                  }))
                                                }
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
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
                  disabled={saving || loading}
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
        message="This clears every district, taluk, and village reference for this employee. It does not deactivate the employee account."
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
        loading={saving}
        variant="danger"
      />
    </>
  );
}
