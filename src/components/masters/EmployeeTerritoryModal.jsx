import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import ConfirmDialog from "../ui/ConfirmDialog";
import ErrorRetry from "../ui/ErrorRetry";
import { PageLoader } from "../ui/command";
import { fetchCachedActiveVillages } from "../../api/master.api";
import {
  fetchEmployeeLocationAssignmentDetail,
  updateEmployeeLocationAssignments,
} from "../../api/employeeLocationAssignments.api";
import {
  buildAssignmentsPayloadFromVillages,
  countsFromVillages,
  diffVillageIds,
  filterAssignableVillages,
  filterVillagesByPrefix,
  formatTerritorySummary,
  indexVillagesById,
  parseAssignedVillages,
  removeVillagesFromList,
  summarizeRemoval,
  villageIdsFromList,
  villageTamilName,
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

  const [masterVillages, setMasterVillages] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [originalIds, setOriginalIds] = useState([]);

  const [villageSearch, setVillageSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const masterById = useMemo(() => indexVillagesById(masterVillages), [masterVillages]);
  const assignableVillages = useMemo(
    () => filterAssignableVillages(masterVillages),
    [masterVillages]
  );
  const filteredVillages = useMemo(
    () => filterVillagesByPrefix(assignableVillages, villageSearch),
    [assignableVillages, villageSearch]
  );

  const assignedIds = useMemo(() => villageIdsFromList(assigned), [assigned]);
  const dirty = useMemo(() => {
    const diff = diffVillageIds(originalIds, assignedIds);
    return diff.added.length > 0 || diff.removed.length > 0;
  }, [originalIds, assignedIds]);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const summary = formatTerritorySummary(countsFromVillages(assigned));

  const hydrate = useCallback(async () => {
    if (!employee?.id) return;
    const requestId = ++hydrateRequestRef.current;
    setLoading(true);
    setLoadError(null);
    setSaved(false);
    setSaveError(null);
    try {
      const [masterPage, detail] = await Promise.all([
        fetchCachedActiveVillages(),
        fetchEmployeeLocationAssignmentDetail(employee.id),
      ]);
      if (requestId !== hydrateRequestRef.current) return;
      const masters = masterPage.results || [];
      setMasterVillages(masters);
      const parsed = parseAssignedVillages(detail, indexVillagesById(masters));
      setAssigned(parsed);
      setOriginalIds(villageIdsFromList(parsed));
    } catch (err) {
      if (requestId !== hydrateRequestRef.current) return;
      setLoadError(friendlyErrorMessage(err, "Could not load assigned villages."));
      setAssigned([]);
      setOriginalIds([]);
    } finally {
      if (requestId === hydrateRequestRef.current) setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (!open) return undefined;
    setVillageSearch("");
    hydrate();
    return () => {
      hydrateRequestRef.current += 1;
    };
  }, [open, employee?.id, hydrate]);

  const persistVillages = async (nextVillages, { closeOnSuccess = false } = {}) => {
    if (!employee?.id) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const payload = buildAssignmentsPayloadFromVillages(nextVillages);
      const { data } = await updateEmployeeLocationAssignments(employee.id, payload);
      let parsed = nextVillages;
      try {
        const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
        parsed = parseAssignedVillages(detail, masterById);
      } catch {
        /* PUT succeeded — keep constructed set if refetch fails */
      }
      setAssigned(parsed);
      setOriginalIds(villageIdsFromList(parsed));
      setSaved(true);
      onSaved?.(employee.id, data?.location_assignment_summary ?? countsFromVillages(parsed));
      if (closeOnSuccess) {
        setTimeout(() => onClose?.(), 400);
      }
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Could not save assigned villages."));
    } finally {
      setSaving(false);
    }
  };

  const toggleVillage = (village, checked) => {
    const row = masterById.get(Number(village.id)) || village;
    setAssigned((prev) => {
      if (checked) {
        if (prev.some((item) => Number(item.id) === Number(row.id))) return prev;
        return [...prev, row].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      }
      return prev.filter((item) => Number(item.id) !== Number(row.id));
    });
    setSaved(false);
    setSaveError(null);
  };

  const handleSelectAll = () => {
    setAssigned((prev) => {
      const byId = new Map(prev.map((v) => [Number(v.id), v]));
      for (const village of filteredVillages) {
        byId.set(Number(village.id), masterById.get(Number(village.id)) || village);
      }
      return [...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
  };

  const handleClearFiltered = () => {
    const remove = new Set(filteredVillages.map((v) => Number(v.id)));
    setAssigned((prev) => prev.filter((v) => !remove.has(Number(v.id))));
  };

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
    const names = summarizeRemoval(assigned, villageIds);
    setConfirm({
      villageIds,
      title: "Remove villages?",
      message:
        names.length > 0
          ? `This will remove: ${names.join(", ")}. Other assigned villages will be kept.`
          : label || "This will remove the selected villages. Other assigned villages will be kept.",
    });
  };

  const handleConfirmRemove = async () => {
    if (!confirm?.villageIds) {
      setConfirm(null);
      return;
    }
    const next = removeVillagesFromList(assigned, confirm.villageIds);
    setConfirm(null);
    setAssigned(next);
    await persistVillages(next);
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="emp-territory-backdrop" onClick={handleRequestClose} aria-hidden="true" />
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
              <p className="emp-territory-modal__kicker">Manage Villages</p>
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
              <PageLoader label="Loading villages…" />
            ) : loadError ? (
              <ErrorRetry message={loadError} onRetry={hydrate} />
            ) : (
              <div className="emp-territory-layout">
                <section className="emp-territory-composer" aria-label="Select villages">
                  <h3 className="emp-territory-section-title">Villages</h3>
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
                          aria-label="Search villages"
                        />
                      </div>
                      <span className="emp-territory-village-panel__count">
                        Selected: {assignedIds.length}
                      </span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleSelectAll}>
                        Select all
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleClearFiltered}
                        disabled={filteredVillages.every((v) => !assignedIds.includes(Number(v.id)))}
                      >
                        Clear
                      </button>
                    </div>
                    {assignableVillages.length === 0 ? (
                      <p className="emp-territory-hint">
                        No villages created yet. Create villages before assigning employees.
                      </p>
                    ) : filteredVillages.length === 0 ? (
                      <p className="emp-territory-hint">No villages found.</p>
                    ) : (
                      <ul className="emp-territory-village-list" role="group">
                        {filteredVillages.map((village) => {
                          const vid = Number(village.id);
                          const tamil = villageTamilName(village);
                          return (
                            <li key={vid}>
                              <label className="emp-loc-check-row">
                                <input
                                  type="checkbox"
                                  checked={assignedIds.includes(vid)}
                                  onChange={(e) => toggleVillage(village, e.target.checked)}
                                  disabled={saving}
                                />
                                <span>
                                  {village.name}
                                  {tamil ? (
                                    <span className="village-picker__tamil"> · {tamil}</span>
                                  ) : null}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="emp-territory-review" aria-label="Assigned villages">
                  <div className="emp-territory-review__head">
                    <h3 className="emp-territory-section-title">Assigned Villages</h3>
                    {assigned.length > 0 ? (
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
                    villages={assigned}
                    onRemoveVillage={(village) => requestRemoveVillages([village.id])}
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
              Villages saved
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
              onClick={() => persistVillages(assigned)}
              disabled={saving || loading || Boolean(loadError)}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? "Saving…" : "Save Assigned Villages"}
            </button>
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || "Remove villages?"}
        message={confirm?.message}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirm(null)}
        loading={saving}
        variant="danger"
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={discardOpen}
        title="Discard unsaved villages?"
        message="You have village assignment changes that have not been saved."
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
