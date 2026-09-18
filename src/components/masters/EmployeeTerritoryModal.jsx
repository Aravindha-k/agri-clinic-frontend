import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  MapPin,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
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
  addVillagesToGroups,
  buildAssignmentsPayloadFromGroups,
  countsFromGroups,
  diffVillageIds,
  filterAssignableVillages,
  filterVillagesByPrefix,
  formatTerritorySummary,
  parseAssignmentGroups,
  removeDistrictFromGroups,
  removeTalukFromGroups,
  removeVillagesFromGroups,
  summarizeRemoval,
  villageIdsFromGroups,
} from "../../utils/employeeLocationAssignmentForm";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { useOverlayLock } from "../../utils/overlayLock";
import EmployeeTerritoryTree from "./EmployeeTerritoryTree";

function empDisplayName(employee) {
  if (!employee) return "\u2014";
  return (
    employee.display_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    employee.username ||
    employee.employee_id
  );
}

function empCode(employee) {
  return employee?.employee_id || employee?.employee_code || employee?.username || "";
}

export default function EmployeeTerritoryModal({ open, employee, onClose, onSaved }) {
  const panelRef = useRef(null);
  const hydrateRequestRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [groups, setGroups] = useState([]);
  const [originalIds, setOriginalIds] = useState([]);

  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState("");
  const [districtId, setDistrictId] = useState("");

  const [taluks, setTaluks] = useState([]);
  const [taluksLoading, setTaluksLoading] = useState(false);
  const [taluksError, setTaluksError] = useState("");
  const [talukId, setTalukId] = useState("");

  const [villages, setVillages] = useState([]);
  const [villagesLoading, setVillagesLoading] = useState(false);
  const [villagesError, setVillagesError] = useState("");
  const [draftVillageIds, setDraftVillageIds] = useState([]);
  const [villageSearch, setVillageSearch] = useState("");

  const [confirm, setConfirm] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const selectedDistrict = districts.find((d) => String(d.id) === String(districtId));
  const selectedTaluk = taluks.find((t) => String(t.id) === String(talukId));

  const assignableVillages = useMemo(
    () => filterAssignableVillages(villages, talukId || null, districtId || null),
    [villages, talukId, districtId]
  );

  const filteredVillages = useMemo(
    () => filterVillagesByPrefix(assignableVillages, villageSearch),
    [assignableVillages, villageSearch]
  );

  const assignedIds = useMemo(() => villageIdsFromGroups(groups), [groups]);
  const dirty = useMemo(
    () => {
      const diff = diffVillageIds(originalIds, assignedIds);
      return diff.added.length > 0 || diff.removed.length > 0;
    },
    [originalIds, assignedIds]
  );

  const summary = formatTerritorySummary(countsFromGroups(groups));
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const resetComposer = useCallback(() => {
    setDistrictId("");
    setTalukId("");
    setTaluks([]);
    setVillages([]);
    setDraftVillageIds([]);
    setVillageSearch("");
    setTaluksError("");
    setVillagesError("");
  }, []);

  const hydrate = useCallback(async () => {
    if (!employee?.id) return;
    const requestId = hydrateRequestRef.current + 1;
    hydrateRequestRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaved(false);
    resetComposer();
    try {
      const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
      if (hydrateRequestRef.current !== requestId) return;
      const parsed = parseAssignmentGroups(detail?.assignments || []);
      setGroups(parsed);
      setOriginalIds(villageIdsFromGroups(parsed));
    } catch (err) {
      if (hydrateRequestRef.current !== requestId) return;
      setLoadError(friendlyErrorMessage(err, "Could not load territory assignments."));
      setGroups([]);
      setOriginalIds([]);
    } finally {
      if (hydrateRequestRef.current === requestId) setLoading(false);
    }
  }, [employee?.id, resetComposer]);

  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true);
    setDistrictsError("");
    try {
      const { results } = await fetchAllDistricts({ is_active: true });
      setDistricts((results || []).filter((d) => d.is_active !== false));
    } catch (err) {
      setDistrictsError(friendlyErrorMessage(err, "Could not load districts."));
      setDistricts([]);
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      hydrateRequestRef.current += 1;
      setGroups([]);
      setOriginalIds([]);
      setLoadError(null);
      setSaveError(null);
      setSaved(false);
      setConfirm(null);
      setDiscardOpen(false);
      resetComposer();
      return;
    }
    loadDistricts();
    if (employee?.id) hydrate();
  }, [open, employee?.id, hydrate, loadDistricts, resetComposer]);

  useEffect(() => {
    if (!open || !districtId) {
      setTaluks([]);
      return;
    }
    let active = true;
    setTaluksLoading(true);
    setTaluksError("");
    fetchTaluksByDistrict(districtId, { is_active: true })
      .then((rows) => {
        if (!active) return;
        setTaluks((rows || []).filter((t) => t.is_active !== false));
      })
      .catch((err) => {
        if (!active) return;
        setTaluks([]);
        setTaluksError(friendlyErrorMessage(err, "Could not load taluks."));
      })
      .finally(() => {
        if (active) setTaluksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, districtId]);

  useEffect(() => {
    if (!open || !talukId) {
      setVillages([]);
      return;
    }
    let active = true;
    setVillagesLoading(true);
    setVillagesError("");
    fetchAllVillagesByTaluk(talukId, { is_active: true })
      .then(({ results }) => {
        if (!active) return;
        setVillages(filterAssignableVillages(results || [], talukId, districtId));
      })
      .catch((err) => {
        if (!active) return;
        setVillages([]);
        setVillagesError(friendlyErrorMessage(err, "Could not load villages."));
      })
      .finally(() => {
        if (active) setVillagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, talukId, districtId]);

  const handleDistrictChange = (value) => {
    setDistrictId(value);
    setTalukId("");
    setVillages([]);
    setDraftVillageIds([]);
    setVillageSearch("");
    setVillagesError("");
    setTaluksError("");
  };

  const handleTalukChange = (value) => {
    setTalukId(value);
    setDraftVillageIds([]);
    setVillageSearch("");
    setVillagesError("");
  };

  const toggleDraftVillage = (villageId, checked) => {
    const id = Number(villageId);
    setDraftVillageIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((v) => v !== id);
    });
  };

  const handleSelectAll = () => {
    setDraftVillageIds(assignableVillages.map((v) => Number(v.id)));
  };

  const handleClearDraft = () => {
    setDraftVillageIds([]);
  };

  const handleAddTerritory = () => {
    if (!selectedDistrict || !selectedTaluk || draftVillageIds.length === 0) return;
    const selectedVillages = assignableVillages.filter((v) =>
      draftVillageIds.includes(Number(v.id))
    );
    setGroups((prev) =>
      addVillagesToGroups(prev, {
        district_id: selectedDistrict.id,
        district_name: selectedDistrict.name,
        taluk_id: selectedTaluk.id,
        taluk_name: selectedTaluk.name,
        villages: selectedVillages,
      })
    );
    setDraftVillageIds([]);
    setSaved(false);
    setSaveError(null);
  };

  const persistGroups = async (nextGroups, { closeOnSuccess = false } = {}) => {
    if (!employee?.id) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload = buildAssignmentsPayloadFromGroups(nextGroups);
      const { data } = await updateEmployeeLocationAssignments(employee.id, payload);
      let parsed = parseAssignmentGroups(payload.assignments);
      try {
        const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
        parsed = parseAssignmentGroups(detail?.assignments || payload.assignments);
      } catch {
        /* PUT succeeded — keep constructed set if refetch fails */
      }
      setGroups(parsed);
      setOriginalIds(villageIdsFromGroups(parsed));
      setSaved(true);
      onSaved?.(employee.id, data?.location_assignment_summary ?? countsFromGroups(parsed));
      if (closeOnSuccess) {
        setTimeout(() => onClose?.(), 400);
      }
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Could not save territory assignments."));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => persistGroups(groups);

  const handleRequestClose = useCallback(() => {
    if (saving) return;
    if (dirtyRef.current) {
      setDiscardOpen(true);
      return;
    }
    onClose?.();
  }, [saving, onClose]);

  useOverlayLock({
    open,
    onClose: handleRequestClose,
    panelRef,
    closeOnEscape: !saving && !confirm && !discardOpen,
  });

  const requestRemoveVillages = (villageIds, label) => {
    const names = summarizeRemoval(groups, villageIds);
    setConfirm({
      villageIds,
      title: "Remove territory?",
      message:
        names.length > 0
          ? `This will remove: ${names.join(", ")}. Other assigned villages will be kept.`
          : label || "This will remove the selected territory. Other assigned villages will be kept.",
    });
  };

  const handleConfirmRemove = async () => {
    if (!confirm?.villageIds) {
      setConfirm(null);
      return;
    }
    const next = removeVillagesFromGroups(groups, confirm.villageIds);
    setConfirm(null);
    setGroups(next);
    await persistGroups(next);
  };

  if (!open) return null;

  const canAdd = Boolean(selectedDistrict && selectedTaluk && draftVillageIds.length > 0 && !saving);

  return createPortal(
    <>
      <div
        className="emp-territory-backdrop"
        onClick={handleRequestClose}
        aria-hidden="true"
      />
      <div className="emp-territory-overlay">
        <div
          ref={panelRef}
          className="emp-territory-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-territory-title"
        >
          <header className="emp-territory-modal__head">
            <div className="min-w-0">
              <p className="emp-territory-modal__kicker">Manage Territory</p>
              <h2 id="emp-territory-title" className="emp-territory-modal__title">
                {empDisplayName(employee)}
                {empCode(employee) ? <span> · {empCode(employee)}</span> : null}
              </h2>
              <p className="emp-territory-modal__summary">
                {summary}
                {dirty ? <span className="emp-territory-unsaved"> · Unsaved changes</span> : null}
              </p>
            </div>
            <button
              type="button"
              className="enterprise-drawer__close"
              onClick={handleRequestClose}
              aria-label="Close"
              disabled={saving}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </header>

          <div className="emp-territory-modal__body">
            {loading ? (
              <PageLoader label="Loading territory…" />
            ) : loadError ? (
              <ErrorRetry message={loadError} onRetry={hydrate} />
            ) : (
              <div className="emp-territory-layout">
                <section className="emp-territory-composer" aria-label="Add territory">
                  <h3 className="emp-territory-section-title">Add territory</h3>

                  <div className="emp-territory-field">
                    <label htmlFor="territory-district">District</label>
                    <select
                      id="territory-district"
                      className="select"
                      value={districtId}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={districtsLoading || saving}
                    >
                      <option value="">
                        {districtsLoading ? "Loading districts…" : "Select district"}
                      </option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {districtsError ? (
                      <ErrorRetry compact message={districtsError} onRetry={loadDistricts} />
                    ) : null}
                  </div>

                  <div className="emp-territory-field">
                    <label htmlFor="territory-taluk">Taluk</label>
                    <select
                      id="territory-taluk"
                      className="select"
                      value={talukId}
                      onChange={(e) => handleTalukChange(e.target.value)}
                      disabled={!districtId || taluksLoading || saving}
                    >
                      <option value="">
                        {!districtId
                          ? "Select district first"
                          : taluksLoading
                            ? "Loading taluks…"
                            : taluks.length === 0
                              ? "No taluks in this district"
                              : "Select taluk"}
                      </option>
                      {taluks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {taluksError ? (
                      <p className="emp-territory-inline-error">{taluksError}</p>
                    ) : districtId && !taluksLoading && taluks.length === 0 ? (
                      <p className="emp-territory-hint">No taluks in this district.</p>
                    ) : null}
                  </div>

                  <div className="emp-territory-field">
                    <label>Villages</label>
                    {!talukId ? (
                      <p className="emp-territory-hint">Select taluk first</p>
                    ) : villagesLoading ? (
                      <div className="emp-loc-inline-loading" aria-busy="true">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Loading villages…
                      </div>
                    ) : villagesError ? (
                      <p className="emp-territory-inline-error">{villagesError}</p>
                    ) : assignableVillages.length === 0 ? (
                      <p className="emp-territory-hint">No villages in this taluk.</p>
                    ) : (
                      <div className="emp-territory-village-panel">
                        <div className="emp-territory-village-panel__toolbar">
                          <div className="search-wrapper emp-territory-village-panel__search">
                            <Search className="search-icon" aria-hidden="true" />
                            <input
                              type="search"
                              className="search-input"
                              value={villageSearch}
                              onChange={(e) => setVillageSearch(e.target.value)}
                              placeholder="Search villages…"
                              aria-label={`Search villages in ${selectedTaluk?.name || "taluk"}`}
                            />
                          </div>
                          <span className="emp-territory-village-panel__count">
                            Selected: {draftVillageIds.length}{" "}
                            {draftVillageIds.length === 1 ? "village" : "villages"}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleSelectAll}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleClearDraft}
                            disabled={draftVillageIds.length === 0}
                          >
                            Clear
                          </button>
                        </div>
                        {filteredVillages.length === 0 ? (
                          <p className="emp-territory-hint">Search returned no villages.</p>
                        ) : (
                          <ul className="emp-territory-village-list" role="group">
                            {filteredVillages.map((village) => {
                              const vid = Number(village.id);
                              const already = assignedIds.includes(vid);
                              return (
                                <li key={vid}>
                                  <label className="emp-loc-check-row">
                                    <input
                                      type="checkbox"
                                      checked={draftVillageIds.includes(vid)}
                                      onChange={(e) => toggleDraftVillage(vid, e.target.checked)}
                                    />
                                    <span>{village.name}</span>
                                    {already ? (
                                      <span className="emp-territory-assigned-tag">Assigned</span>
                                    ) : null}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-md"
                    onClick={handleAddTerritory}
                    disabled={!canAdd}
                  >
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    Add territory
                  </button>
                </section>

                <section className="emp-territory-review" aria-label="Assigned territory">
                  <div className="emp-territory-review__head">
                    <h3 className="emp-territory-section-title">Assigned territory</h3>
                    {groups.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-red-600"
                        onClick={() =>
                          requestRemoveVillages(
                            assignedIds,
                            "This clears every assigned village for this employee."
                          )
                        }
                        disabled={saving}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Remove all
                      </button>
                    ) : null}
                  </div>
                  <EmployeeTerritoryTree
                    groups={groups}
                    onEditTaluk={(group) => {
                      setDistrictId(String(group.district_id));
                      setTalukId(String(group.taluk_id));
                      setDraftVillageIds([]);
                      setVillageSearch("");
                    }}
                    onRemoveVillage={(village) => requestRemoveVillages([village.id])}
                    onRemoveTaluk={(taluk) =>
                      requestRemoveVillages(
                        (taluk.villages || []).map((v) => v.id),
                        `Remove all villages in ${taluk.taluk_name}? Other taluks will be kept.`
                      )
                    }
                    onRemoveDistrict={(district) =>
                      requestRemoveVillages(
                        district.taluks.flatMap((t) => t.villages.map((v) => v.id)),
                        `Remove all villages in ${district.district_name}? Other districts will be kept.`
                      )
                    }
                  />
                </section>
              </div>
            )}
          </div>

          {saveError ? (
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
          ) : null}

          {saved ? (
            <p className="emp-territory-success" role="status">
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              Territory saved
            </p>
          ) : null}

          <footer className="emp-territory-modal__foot">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={handleRequestClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={handleSave}
              disabled={saving || loading || Boolean(loadError)}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? "Saving…" : "Save territory"}
            </button>
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Remove territory?"}
        message={confirm?.message}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirm(null)}
        loading={saving}
        variant="danger"
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={discardOpen}
        title="Discard unsaved territory?"
        message="You have territory changes that have not been saved."
        onConfirm={() => {
          setDiscardOpen(false);
          onClose?.();
        }}
        onCancel={() => setDiscardOpen(false)}
        variant="danger"
        confirmLabel="Discard"
      />
    </>,
    document.body
  );
}
