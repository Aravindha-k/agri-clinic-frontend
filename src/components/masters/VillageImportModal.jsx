import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";
import { validateVillageImport, confirmVillageImport } from "../../api/villageImport.api";
import { invalidateVillageCache } from "../../api/master.api";
import {
  VILLAGE_IMPORT_ACCEPT,
  buildSummaryCards,
  canConfirmImport,
  confirmRequestErrorMessage,
  errorTitle,
  filterPreviewRows,
  formatFileSize,
  isConfirmDisabled,
  isExpiredImportError,
  normalizeConfirmResponse,
  normalizeValidateResponse,
  releaseActionLock,
  tryAcquireActionLock,
  validateRequestErrorMessage,
  xlsxFileError,
} from "../../utils/villageImport";
import { downloadVillageImportTemplate } from "../../utils/villageImportTemplate";
import { useOverlayLock } from "../../utils/overlayLock";

function formatCount(value, singular, plural) {
  if (value == null) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

export default function VillageImportModal({ open, onClose, onImported }) {
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);
  const validateLockRef = useRef(false);
  const confirmLockRef = useRef(false);

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [preview, setPreview] = useState(null);
  const [rowQuery, setRowQuery] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [success, setSuccess] = useState(null);

  const busy = validating || confirming;
  useOverlayLock({
    open,
    onClose: busy || confirmOpen ? undefined : onClose,
    panelRef,
    closeOnEscape: !busy && !confirmOpen,
  });

  const reset = useCallback(() => {
    setFile(null);
    setFileError("");
    setDragOver(false);
    setValidating(false);
    setValidateError("");
    setPreview(null);
    setRowQuery("");
    setConfirmOpen(false);
    setConfirming(false);
    setConfirmError("");
    setSuccess(null);
    validateLockRef.current = false;
    confirmLockRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose?.();
  };

  const applyFile = (next) => {
    if (!next) return;
    const error = xlsxFileError(next);
    setPreview(null);
    setSuccess(null);
    setValidateError("");
    setConfirmError("");
    if (error) {
      setFile(null);
      setFileError(error);
      return;
    }
    setFileError("");
    setFile(next);
  };

  const handleValidate = async () => {
    if (!file || validating) return;
    const error = xlsxFileError(file);
    if (error) {
      setFileError(error);
      return;
    }
    if (!tryAcquireActionLock(validateLockRef)) return;
    setValidating(true);
    setValidateError("");
    setConfirmError("");
    setSuccess(null);
    try {
      const data = await validateVillageImport(file);
      setPreview(normalizeValidateResponse(data));
    } catch (err) {
      setPreview(null);
      setValidateError(validateRequestErrorMessage(err));
    } finally {
      setValidating(false);
      releaseActionLock(validateLockRef);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirmImport(preview) || confirming) return;
    if (!tryAcquireActionLock(confirmLockRef)) return;
    setConfirming(true);
    setConfirmError("");
    try {
      const data = await confirmVillageImport(preview.import_token);
      setConfirmOpen(false);
      setSuccess(normalizeConfirmResponse(data));
      invalidateVillageCache();
    } catch (err) {
      setConfirmOpen(false);
      if (isExpiredImportError(err)) {
        setPreview(null);
      }
      setConfirmError(confirmRequestErrorMessage(err));
    } finally {
      setConfirming(false);
      releaseActionLock(confirmLockRef);
    }
  };

  const handleDone = () => {
    onImported?.();
    reset();
    onClose?.();
  };

  const cards = useMemo(() => buildSummaryCards(preview), [preview]);
  const visibleRows = useMemo(
    () => filterPreviewRows(preview?.rows || [], rowQuery),
    [preview, rowQuery]
  );
  const confirmReady = !isConfirmDisabled(preview, busy);

  const confirmMessage = (
    <>
      This will update production Village Master and employee village assignments.
      <span className="village-import-confirm-summary">
        Villages to create: {preview?.summary?.newVillages ?? "—"}
        {"\n"}
        Assignments to create: {preview?.summary?.employeeAssignments ?? "—"}
        {"\n"}
        Existing villages reused: {preview?.summary?.existingVillages ?? "—"}
      </span>
    </>
  );

  if (!open) return null;

  return createPortal(
    <>
      <div className="village-import-backdrop" onClick={busy ? undefined : handleClose} aria-hidden="true" />
      <div className="village-import-overlay">
        <div
          ref={panelRef}
          className="village-import-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="village-import-title"
        >
          <header className="village-import-modal__head">
            <div className="min-w-0">
              <p className="village-import-modal__kicker">Village Master</p>
              <h2 id="village-import-title" className="village-import-modal__title">
                Import Villages &amp; Employee Assignments
              </h2>
              <p className="village-import-modal__summary">
                Bulk create villages and optionally assign them to existing employees.
              </p>
            </div>
            <button
              type="button"
              className="enterprise-close-btn"
              onClick={handleClose}
              disabled={busy}
              aria-label="Close import"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </header>

          <div className="village-import-modal__body">
            {success ? (
              <div className="village-import-success" role="status">
                <CheckCircle className="w-8 h-8 text-emerald-600" aria-hidden="true" />
                <h3>Import completed successfully</h3>
                <ul>
                  <li>Villages created: {success.villagesCreated ?? "—"}</li>
                  <li>Villages reused: {success.villagesReused ?? "—"}</li>
                  <li>Employee assignments created: {success.assignmentsCreated ?? "—"}</li>
                  <li>Assignments reused: {success.assignmentsReused ?? "—"}</li>
                  <li>Rows processed: {success.rowsProcessed ?? "—"}</li>
                </ul>
              </div>
            ) : (
              <>
                <section className="village-import-format" aria-label="Supported format">
                  <div className="village-import-format__cols">
                    <div>
                      <p className="village-import-label">Required</p>
                      <p>Village</p>
                    </div>
                    <div>
                      <p className="village-import-label">Optional</p>
                      <p>Employee ID · Employee Name · Village Tamil Name</p>
                    </div>
                  </div>
                  <ul className="village-import-help">
                    <li><strong>Employee ID</strong> — recommended for assignment. Existing Admin ID, e.g. KAC-0003.</li>
                    <li><strong>Employee Name</strong> — validation / fallback matching, e.g. Kaviyarasan.</li>
                    <li><strong>Village</strong> — required, e.g. Madagadipattu.</li>
                    <li><strong>Village Tamil Name</strong> — optional, e.g. மடகடிப்பட்டு.</li>
                    <li>Same Village can be assigned to multiple employees.</li>
                    <li>Duplicate Villages will not create duplicate Village Master records.</li>
                    <li>Blank Employee ID + Employee Name imports the Village without assignment.</li>
                    <li>Existing employees are reused; this import never creates employees.</li>
                    <li>District / Taluk / Firka are not used.</li>
                  </ul>
                </section>

                <div className="village-import-actions">
                  <button type="button" className="btn btn-secondary btn-md" onClick={downloadVillageImportTemplate}>
                    <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                    Download Sample Excel
                  </button>
                </div>

                <input
                  id="village-import-file"
                  ref={fileInputRef}
                  type="file"
                  accept={VILLAGE_IMPORT_ACCEPT}
                  className="sr-only"
                  aria-label="Choose Excel file"
                  onChange={(e) => {
                    applyFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                <div
                  className={`village-import-drop${dragOver ? " village-import-drop--over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    applyFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <Upload className="w-6 h-6 text-emerald-700" aria-hidden="true" />
                  <p>Drag &amp; drop Excel file here</p>
                  <p className="village-import-drop__or">or</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    Choose File
                  </button>
                  <p className="village-import-drop__hint">Accepted: .xlsx only</p>
                </div>

                {fileError ? (
                  <p className="village-import-error" role="alert">{fileError}</p>
                ) : null}

                {file ? (
                  <div className="village-import-file">
                    <div className="min-w-0">
                      <p className="village-import-file__name">{file.name}</p>
                      <p className="village-import-file__meta">{formatFileSize(file.size)}</p>
                    </div>
                    <div className="village-import-file__actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          setValidateError("");
                        }}
                        disabled={busy}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleValidate}
                        disabled={busy}
                      >
                        {validating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                        {validating ? "Validating Excel…" : "Validate File"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {validating ? (
                  <p className="village-import-loading" role="status">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Validating Excel…
                  </p>
                ) : null}

                {validateError ? (
                  <p className="village-import-error" role="alert">{validateError}</p>
                ) : null}
                {confirmError ? (
                  <p className="village-import-error" role="alert">{confirmError}</p>
                ) : null}

                {preview ? (
                  <div className="village-import-preview">
                    {cards.length > 0 ? (
                      <div className="village-import-cards">
                        {cards.map((card) => (
                          <div key={card.key} className="village-import-card">
                            <p className="village-import-card__label">{card.label}</p>
                            <p className="village-import-card__value">{card.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <section aria-label="Employee assignment preview">
                      <h3 className="village-import-section-title">Employee assignments</h3>
                      {preview.employees.length === 0 ? (
                        <p className="village-import-muted">No employee assignments in this file.</p>
                      ) : (
                        <ul className="village-import-employees">
                          {preview.employees.map((emp) => (
                            <li key={`${emp.employee_id}-${emp.employee_name}`}>
                              <span>
                                {emp.employee_name || "Employee"}
                                {emp.employee_id ? ` · ${emp.employee_id}` : ""}
                              </span>
                              <span>{formatCount(emp.village_count, "village", "villages")}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {preview.unassignedVillages != null ? (
                        <p className="village-import-unassigned">
                          Unassigned Villages: {preview.unassignedVillages}
                        </p>
                      ) : null}
                    </section>

                    {preview.errors.length > 0 ? (
                      <section className="village-import-errors" aria-label="Blocking errors">
                        <h3 className="village-import-section-title">Errors</h3>
                        {preview.errors.map((err, index) => (
                          <article key={`${err.code}-${index}`} className="village-import-error-card">
                            <AlertCircle className="w-4 h-4" aria-hidden="true" />
                            <div>
                              <p className="village-import-error-card__title">
                                {errorTitle(err.code, err.message || "Import error")}
                              </p>
                              {err.village ? <p>Village: {err.village}</p> : null}
                              {err.employee_id || err.employee_name ? (
                                <p>{[err.employee_name, err.employee_id].filter(Boolean).join(" · ")}</p>
                              ) : null}
                              {err.row != null ? <p>Row {err.row}</p> : null}
                              {err.rows.map((row) => (
                                <p key={`${row.row}-${row.name_ta}`}>
                                  {row.row != null ? `Row ${row.row}: ` : ""}
                                  {row.name_ta || row.message}
                                </p>
                              ))}
                              {err.message && err.code === "TAMIL_NAME_CONFLICT" ? null : err.message && err.code ? (
                                <p>{err.message}</p>
                              ) : null}
                              <p className="village-import-error-card__action">
                                Correct the Excel file and upload it again.
                              </p>
                            </div>
                          </article>
                        ))}
                      </section>
                    ) : null}

                    {preview.warnings.length > 0 ? (
                      <section className="village-import-warnings" aria-label="Warnings">
                        <h3 className="village-import-section-title">Warnings</h3>
                        <ul>
                          {preview.warnings.map((warn, index) => (
                            <li key={`${warn.code}-${index}`}>
                              {warn.row != null ? `Row ${warn.row}: ` : ""}
                              {warn.message || warn.code}
                              {warn.village ? ` (${warn.village})` : ""}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    <section aria-label="Row preview">
                      <div className="village-import-preview-head">
                        <h3 className="village-import-section-title">Row preview</h3>
                        <div className="search-wrapper village-import-row-search">
                          <Search className="search-icon" aria-hidden="true" />
                          <input
                            type="search"
                            className="search-input"
                            value={rowQuery}
                            onChange={(e) => setRowQuery(e.target.value)}
                            placeholder="Search rows…"
                            aria-label="Search preview rows"
                          />
                        </div>
                      </div>
                      <div className="village-import-table-wrap">
                        <table className="village-import-table">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Employee ID</th>
                              <th>Employee Name</th>
                              <th>Village</th>
                              <th>Village Tamil Name</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.length === 0 ? (
                              <tr>
                                <td colSpan={6}>No rows to preview.</td>
                              </tr>
                            ) : (
                              visibleRows.map((row) => (
                                <tr key={row.key}>
                                  <td>{row.row}</td>
                                  <td>{row.employee_id || "—"}</td>
                                  <td>{row.employee_name || "—"}</td>
                                  <td>{row.village || "—"}</td>
                                  <td>{row.village_tamil_name || "—"}</td>
                                  <td>
                                    <span className={`village-import-status village-import-status--${row.statusKind}`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <footer className="village-import-modal__foot">
            {success ? (
              <button type="button" className="btn btn-primary btn-md" onClick={handleDone}>
                Done
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-secondary btn-md" onClick={handleClose} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  disabled={!confirmReady}
                  onClick={() => setConfirmOpen(true)}
                >
                  Confirm Import
                </button>
              </>
            )}
          </footer>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Import Villages?"
        message={confirmMessage}
        confirmLabel="Confirm Import"
        cancelLabel="Cancel"
        variant="primary"
        loading={confirming}
        onCancel={() => {
          if (!confirming) setConfirmOpen(false);
        }}
        onConfirm={handleConfirm}
      />
    </>,
    document.body
  );
}
