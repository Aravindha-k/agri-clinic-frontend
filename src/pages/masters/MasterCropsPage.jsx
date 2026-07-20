import { PageLoader } from "../../components/ui/command";
import { useEffect, useState, useCallback } from "react";
import { fetchAllMasterCrops, createCrop, updateCrop, deleteCrop } from "../../api/master.api";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import {
    Wheat, Search, X, RefreshCw, Edit3, Trash2, Plus, AlertCircle,
    Loader2, Leaf,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const inputClass = "masters-admin-field";

function CropForm({ initial = {}, onSubmit, onCancel, loading }) {
    const [form, setForm] = useState({
        name_en: initial.name_en || "",
        name_ta: initial.name_ta || "",
        scientific_name: initial.scientific_name || "",
        crop_category: initial.crop_category || "",
        typical_season: initial.typical_season || "",
        is_active: initial.is_active !== false,
    });
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="masters-admin-form">
            <div className={inputClass}>
                <label>Crop Name (English) *</label>
                <input type="text" required value={form.name_en} onChange={(e) => set("name_en", e.target.value)}
                    placeholder="e.g. Paddy" />
            </div>
            <div className={inputClass}>
                <label>Crop Name (Tamil)</label>
                <input type="text" value={form.name_ta} onChange={(e) => set("name_ta", e.target.value)}
                    placeholder="e.g. நெல்" />
            </div>
            <div className={inputClass}>
                <label>Scientific Name</label>
                <input type="text" value={form.scientific_name} onChange={(e) => set("scientific_name", e.target.value)}
                    placeholder="e.g. Oryza sativa" />
            </div>
            <div className={inputClass}>
                <label>Category</label>
                <select value={form.crop_category} onChange={(e) => set("crop_category", e.target.value)}>
                    <option value="">Select Category</option>
                    {["cereal", "vegetable", "fruit", "pulse", "oilseed", "spice", "other"].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>
            <div className={inputClass}>
                <label>Typical Season</label>
                <select value={form.typical_season} onChange={(e) => set("typical_season", e.target.value)}>
                    <option value="">Select Season</option>
                    {["kharif", "rabi", "zaid", "all_season"].map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                </select>
            </div>
            <label className="masters-admin-check">
                <input type="checkbox" id="crop-active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
                Active
            </label>
            <div className="masters-admin-form__foot">
                <button type="submit" disabled={loading || !form.name_en.trim()} className="btn btn-primary btn-md">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {initial.id ? "Update" : "Create"} Crop
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">Cancel</button>
                )}
            </div>
        </form>
    );
}

export default function MasterCropsPage() {
    const [crops, setCrops] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [saveError, setSaveError] = useState(null);

    const fetchCrops = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const merged = await fetchAllMasterCrops();
            setCrops(merged.results);
            setTotalCount(merged.count);
        } catch {
            setError("Failed to load crops.");
            setCrops([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCrops(); }, [fetchCrops]);

    const handleSave = async (data) => {
        setSaveError(null);
        setSaving(true);
        try {
            if (editTarget?.id) await updateCrop(editTarget.id, data);
            else await createCrop(data);
            setFormOpen(false);
            setEditTarget(null);
            fetchCrops();
        } catch (err) {
            setSaveError(
                err?.response?.data?.detail ||
                Object.values(err?.response?.data || {}).flat().join(" ") ||
                "Save failed. Please try again."
            );
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteError(null);
        setDeleting(true);
        try {
            await deleteCrop(deleteTarget.id);
            setDeleteTarget(null);
            fetchCrops();
        } catch (err) {
            setDeleteError(
                err?.response?.data?.detail ||
                Object.values(err?.response?.data || {}).flat().join(" ") ||
                "Delete failed. The crop may be in use."
            );
        } finally { setDeleting(false); }
    };

    const openCreate = () => { setEditTarget(null); setFormOpen(true); };
    const openEdit = (crop) => { setEditTarget(crop); setFormOpen(true); };

    const filtered = crops.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (c.name_en || "").toLowerCase().includes(q) ||
            (c.name_ta || "").toLowerCase().includes(q) ||
            (c.scientific_name || "").toLowerCase().includes(q) ||
            (c.crop_category || "").toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        logApiDiagnostics({
            label: "masters-crops-ui",
            url: "/api/v1/masters/crops/",
            apiCount: totalCount,
            rowsLoaded: crops.length,
            rowsRendered: filtered.length,
            pagination: { search: search.trim() || null },
        });
    }, [totalCount, crops.length, filtered.length, search]);

    return (
        <div className="masters-admin page-container">
            <header className="masters-admin-header">
                <div className="masters-admin-header__inner">
                    <div className="masters-admin-header__brand">
                        <div className="masters-admin-header__icon" aria-hidden="true">
                            <Wheat className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="masters-admin-header__badge">
                                <Wheat className="w-3 h-3" aria-hidden="true" />
                                Crops
                            </span>
                            <h1 className="masters-admin-header__title">Master Crops</h1>
                            <p className="masters-admin-header__subtitle">
                                Manage crop database for dropdown selection
                                {!loading && <span className="ml-2 font-semibold text-teal-700">{totalCount} total</span>}
                            </p>
                        </div>
                    </div>
                    <div className="masters-admin-header__actions">
                        <button type="button" onClick={openCreate} className="btn btn-primary btn-md">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add crop
                        </button>
                        <button type="button" onClick={fetchCrops} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </div>
                </div>
            </header>

            <section className="masters-admin-filters" aria-label="Search crops">
                <div className="masters-admin-filters__row">
                    <div className="masters-admin-search">
                        <Search className="search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Search crop name or variety…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="search-input"
                            aria-label="Search crops"
                        />
                    </div>
                    {search && (
                        <button type="button" onClick={() => setSearch("")} className="btn btn-ghost btn-sm">
                            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                        </button>
                    )}
                    <p className="masters-admin-filters__meta lg:ml-auto">{filtered.length} crops shown</p>
                </div>
            </section>

            {error && (
                <div className="masters-admin-alert masters-admin-alert--error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                    <button type="button" onClick={fetchCrops} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {loading ? (
                <PageLoader label="Loading crops…" />
            ) : filtered.length === 0 ? (
                <div className="masters-admin-empty">
                    <div className="masters-admin-empty__icon">
                        <Wheat className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <p className="text-base font-semibold text-slate-600">No crops found</p>
                </div>
            ) : (
                <div className="masters-admin-table-card">
                    <div className="masters-admin-table-wrap">
                        <table className="data-table compact-table masters-admin-table w-full">
                            <thead>
                                <tr>
                                    <th>Crop name</th>
                                    <th>Category</th>
                                    <th>Season</th>
                                    <th>Status</th>
                                    <th className="w-28 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, idx) => (
                                    <tr key={c.id || idx}>
                                        <td>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="masters-admin-row-icon">
                                                    <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="masters-admin-row-name">{c.name_en || "\u2014"}</p>
                                                    {c.name_ta && <p className="masters-admin-row-sub">{c.name_ta}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {c.crop_category ? (
                                                <span className="masters-admin-chip masters-admin-chip--category">{c.crop_category}</span>
                                            ) : (
                                                <span className="text-sm text-slate-400">{"\u2014"}</span>
                                            )}
                                        </td>
                                        <td>
                                            {c.typical_season ? (
                                                <span className="masters-admin-chip masters-admin-chip--season">
                                                    {c.typical_season.replace("_", " ").replace(/\b\w/g, ch => ch.toUpperCase())}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400">{"\u2014"}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`masters-admin-status ${c.is_active !== false ? "masters-admin-status--active" : "masters-admin-status--inactive"}`}>
                                                <span className="masters-admin-status__dot" aria-hidden="true" />
                                                {c.is_active !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="masters-admin-actions">
                                                <button type="button" onClick={() => openEdit(c)} title="Edit" className="masters-admin-action-btn masters-admin-action-btn--edit" aria-label="Edit">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setDeleteTarget(c)} title="Delete" className="masters-admin-action-btn masters-admin-action-btn--delete" aria-label="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <SlidePanel
                tone="masters"
                open={formOpen}
                onClose={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }}
                title={editTarget ? "Edit Crop" : "Add Crop"}
            >
                {saveError && (
                    <div className="masters-admin-alert masters-admin-alert--error mb-4">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{saveError}</span>
                    </div>
                )}
                <CropForm
                    initial={editTarget || {}}
                    onSubmit={handleSave}
                    onCancel={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }}
                    loading={saving}
                />
            </SlidePanel>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Crop"
                message={
                    deleteError
                        ? deleteError
                        : `Are you sure you want to delete "${deleteTarget?.name_en || "this crop"}"?`
                }
                onConfirm={handleDelete}
                onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}
