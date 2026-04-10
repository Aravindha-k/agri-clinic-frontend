import { useEffect, useState, useCallback } from "react";
import { getCrops, createCrop, updateCrop, deleteCrop } from "../../api/master.api";
import {
    Wheat, Search, X, RefreshCw, Edit3, Trash2, Plus, AlertCircle,
    ChevronLeft, ChevronRight, Loader2, Leaf,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const resolveList = (d) => {
    const raw = d?.data ?? d;
    if (Array.isArray(raw)) return raw;
    if (raw?.results) return raw.results;
    if (raw?.data) return raw.data;
    return [];
};

const Bone = ({ className = "" }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;

const inputClass = "w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";

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
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Crop Name (English) *</label>
                <input type="text" required value={form.name_en} onChange={(e) => set("name_en", e.target.value)}
                    placeholder="e.g. Paddy" className={inputClass} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Crop Name (Tamil)</label>
                <input type="text" value={form.name_ta} onChange={(e) => set("name_ta", e.target.value)}
                    placeholder="e.g. நெல்" className={inputClass} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Scientific Name</label>
                <input type="text" value={form.scientific_name} onChange={(e) => set("scientific_name", e.target.value)}
                    placeholder="e.g. Oryza sativa" className={inputClass} />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                <select value={form.crop_category} onChange={(e) => set("crop_category", e.target.value)} className={inputClass + " appearance-none"}>
                    <option value="">Select Category</option>
                    {["cereal", "vegetable", "fruit", "pulse", "oilseed", "spice", "other"].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Typical Season</label>
                <select value={form.typical_season} onChange={(e) => set("typical_season", e.target.value)} className={inputClass + " appearance-none"}>
                    <option value="">Select Season</option>
                    {["kharif", "rabi", "zaid", "all_season"].map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="crop-active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <label htmlFor="crop-active" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button type="submit" disabled={loading || !form.name_en.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initial.id ? "Update" : "Create"} Crop
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

export default function MasterCropsPage() {
    const [crops, setCrops] = useState([]);
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
            const raw = await getCrops();
            setCrops(resolveList(raw));
        } catch {
            setError("Failed to load crops.");
            setCrops([]);
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

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center text-lime-600">
                            <Wheat className="w-5 h-5" />
                        </div>
                        Master Crops
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage crop database for dropdown selection</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm">
                        <Plus className="w-4 h-4" /> Add Crop
                    </button>
                    <button onClick={fetchCrops} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input type="text" placeholder="Search crop name or variety…" value={search} onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                    {search && (
                        <button onClick={() => setSearch("")} className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl transition-all">
                            <X className="w-3.5 h-3.5" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={fetchCrops} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW }}>
                    <div className="p-5 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                            <Bone className="w-8 h-8 !rounded-full" /><Bone className="w-28 h-4" /><Bone className="w-20 h-4" /><Bone className="w-16 h-4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: SHADOW }}>
                    <div className="w-20 h-20 rounded-2xl bg-lime-50 flex items-center justify-center mx-auto mb-5"><Wheat className="w-9 h-9 text-lime-300" /></div>
                    <p className="text-base font-semibold text-gray-500">No crops found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    {["Crop Name", "Category", "Season", "Status", ""].map((h, i) => (
                                        <th key={i} className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, idx) => (
                                    <tr key={c.id || idx} className={`border-b border-gray-50 hover:bg-lime-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-lime-600 flex-shrink-0">
                                                    <Leaf className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{c.name_en || "\u2014"}</p>
                                                    {c.name_ta && <p className="text-xs text-gray-400">{c.name_ta}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-gray-600">{c.crop_category || "\u2014"}</td>
                                        <td className="px-5 py-3.5">
                                            {c.typical_season ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {c.typical_season.replace("_", " ").replace(/\b\w/g, ch => ch.toUpperCase())}
                                                </span>
                                            ) : <span className="text-sm text-gray-400">{"\u2014"}</span>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.is_active !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.is_active !== false ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                {c.is_active !== false ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(c)} title="Edit" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(c)} title="Delete" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
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

            {/* Form Panel */}
            <SlidePanel open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }}
                title={editTarget ? "Edit Crop" : "Add Crop"}>
                {saveError && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                        {saveError}
                    </div>
                )}
                <CropForm initial={editTarget || {}} onSubmit={handleSave}
                    onCancel={() => { setFormOpen(false); setEditTarget(null); setSaveError(null); }} loading={saving} />
            </SlidePanel>

            {/* Delete Confirm */}
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
