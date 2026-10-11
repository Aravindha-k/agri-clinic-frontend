import { PageLoader, PageHeader } from "../../components/ui/command";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    fetchAllVillages,
    createVillage,
    updateVillage,
    deleteVillage,
    invalidateVillageCache,
} from "../../api/master.api";
import { villageTamilName } from "../../utils/employeeLocationAssignmentForm";
import { matchesAnyFieldPrefix } from "../../utils/searchMatch";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import {
    MapPin, Search, RefreshCw, Edit3, Trash2, Plus, AlertCircle, Loader2, Upload,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import VillageImportModal from "../../components/masters/VillageImportModal";
import { IMPORT_BUTTON_LABEL } from "../../utils/villageImport";

const inputClass = "masters-admin-field";
const TABLE_PAGE_SIZE = 25;

function VillageForm({ initial = {}, onSubmit, onCancel, loading, saveError }) {
    const [name, setName] = useState(initial.name || "");
    const [tamilName, setTamilName] = useState(villageTamilName(initial));
    const [isActive, setIsActive] = useState(initial.is_active !== false);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({
                    name: name.trim(),
                    name_ta: tamilName.trim(),
                    is_active: isActive,
                });
            }}
            className="masters-admin-form"
        >
            <div className={inputClass}>
                <label htmlFor="village-name">Village Name *</label>
                <input
                    id="village-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter village name"
                />
            </div>
            <div className={inputClass}>
                <label htmlFor="village-tamil">Village Tamil Name</label>
                <input
                    id="village-tamil"
                    type="text"
                    value={tamilName}
                    onChange={(e) => setTamilName(e.target.value)}
                    placeholder="Enter Tamil name"
                />
            </div>
            <div className={inputClass}>
                <label htmlFor="village-status">Status</label>
                <select
                    id="village-status"
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            {saveError ? (
                <p className="text-sm text-red-600" role="alert">{saveError}</p>
            ) : null}
            <div className="masters-admin-form__foot">
                <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary btn-md">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {initial.id ? "Update" : "Create"} Village
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

export default function MasterLocationsPage() {
    const [villages, setVillages] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    const fetchVillages = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const page = await fetchAllVillages();
            setVillages(page.results || []);
            setTotalCount(page.count ?? (page.results || []).length);
        } catch {
            setError("Failed to load villages.");
            setVillages([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVillages();
    }, [fetchVillages]);

    const filtered = useMemo(() => {
        return villages.filter((row) =>
            matchesAnyFieldPrefix(search, [row.name, villageTamilName(row)])
        );
    }, [villages, search]);

    useEffect(() => {
        setTablePage(1);
    }, [search]);

    const tableTotalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
    const paged = filtered.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

    useEffect(() => {
        logApiDiagnostics({
            label: "locations-villages",
            url: "/api/v1/masters/villages/",
            apiCount: totalCount,
            rowsLoaded: villages.length,
            rowsRendered: paged.length,
            pagination: { tablePage, tableTotalPages, search: search.trim() || null },
        });
    }, [totalCount, villages.length, paged.length, tablePage, tableTotalPages, search]);

    const handleSave = async (data) => {
        setSaveError(null);
        setSaving(true);
        try {
            if (editTarget?.id) await updateVillage(editTarget.id, data);
            else await createVillage(data);
            invalidateVillageCache();
            setFormOpen(false);
            setEditTarget(null);
            fetchVillages();
        } catch (err) {
            setSaveError(friendlyErrorMessage(err, "Could not save village."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteVillage(deleteTarget.id);
            invalidateVillageCache();
            setDeleteTarget(null);
            fetchVillages();
        } catch {
            /* keep dialog open */
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="masters-admin page-container">
            <PageHeader
                title="Village Master"
                subtitle="Manage villages used for employee territories, farmers and visits."
                badge={
                    <span className="masters-admin-header__badge">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        Villages
                    </span>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setImportOpen(true)}
                            className="btn btn-secondary btn-md"
                        >
                            <Upload className="w-4 h-4" aria-hidden="true" /> {IMPORT_BUTTON_LABEL}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setEditTarget(null); setSaveError(null); setFormOpen(true); }}
                            className="btn btn-primary btn-md"
                        >
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add Village
                        </button>
                        <button type="button" onClick={fetchVillages} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </>
                }
            />

            <section className="masters-admin-filters" aria-label="Search villages">
                <div className="masters-admin-filters__row">
                    <div className="masters-admin-search">
                        <Search className="search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Search villages…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="search-input"
                            aria-label="Search villages"
                        />
                    </div>
                </div>
            </section>

            {error ? (
                <div className="alert-error flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {error}
                </div>
            ) : loading ? (
                <PageLoader label="Loading villages…" />
            ) : filtered.length === 0 ? (
                <p className="masters-admin-empty">
                    {search.trim() ? "No villages found." : "No villages created yet."}
                </p>
            ) : (
                <div className="masters-admin-table-card">
                    <div className="masters-admin-table-wrap">
                        <table className="masters-admin-table data-table">
                            <thead>
                                <tr>
                                    <th>Village</th>
                                    <th>Village Tamil Name</th>
                                    <th>Status</th>
                                    <th aria-label="Actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <p className="masters-admin-row-name break-words">{item.name}</p>
                                        </td>
                                        <td className="text-sm text-slate-600">
                                            {villageTamilName(item) || "—"}
                                        </td>
                                        <td className="text-sm text-slate-600">
                                            {item.is_active === false ? "Inactive" : "Active"}
                                        </td>
                                        <td>
                                            <div className="masters-admin-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditTarget(item); setSaveError(null); setFormOpen(true); }}
                                                    title="Edit"
                                                    className="masters-admin-action-btn masters-admin-action-btn--edit"
                                                    aria-label={`Edit ${item.name}`}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(item)}
                                                    title="Delete"
                                                    className="masters-admin-action-btn masters-admin-action-btn--delete"
                                                    aria-label={`Delete ${item.name}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {tableTotalPages > 1 ? (
                        <div className="masters-admin-pager">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={tablePage <= 1}
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </button>
                            <span className="text-sm text-slate-500">
                                Page {tablePage} of {tableTotalPages}
                            </span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={tablePage >= tableTotalPages}
                                onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                            >
                                Next
                            </button>
                        </div>
                    ) : null}
                </div>
            )}

            <SlidePanel
                open={formOpen}
                onClose={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }}
                title={editTarget ? "Edit Village" : "Add Village"}
                tone="masters"
            >
                <VillageForm
                    key={editTarget?.id ?? "new"}
                    initial={editTarget || {}}
                    onSubmit={handleSave}
                    onCancel={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }}
                    loading={saving}
                    saveError={saveError}
                />
            </SlidePanel>

            <VillageImportModal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImported={fetchVillages}
            />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete village?"
                message={deleteTarget ? `Delete ${deleteTarget.name}? This cannot be undone if the village is unused.` : ""}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleting}
                variant="danger"
                confirmLabel="Delete"
            />
        </div>
    );
}
