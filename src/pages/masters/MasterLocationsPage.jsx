import { useEffect, useState, useCallback } from "react";
import {
    getDistricts, createDistrict, updateDistrict, deleteDistrict,
    getVillages, createVillage, updateVillage, deleteVillage,
} from "../../api/master.api";
import {
    MapPin, Search, X, RefreshCw, Edit3, Trash2, Plus, AlertCircle, Loader2,
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

const TABS = ["districts", "villages"];
const TAB_LABELS = { districts: "Districts", villages: "Villages" };

/* ── Generic Location Form ── */
function LocationForm({ type, initial = {}, parents = [], onSubmit, onCancel, loading }) {
    const [name, setName] = useState(initial.name || "");
    const [parentId, setParentId] = useState(
        type === "villages" ? (initial.district || initial.district_id || "") : ""
    );

    const parentLabel = type === "villages" ? "District" : null;

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            const payload = { name };
            if (type === "villages" && parentId) payload.district = parentId;
            onSubmit(payload);
        }} className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter ${type.slice(0, -1)} name`} className={inputClass} />
            </div>
            {parentLabel && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{parentLabel}</label>
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass + " appearance-none"}>
                        <option value="">Select {parentLabel}</option>
                        {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button type="submit" disabled={loading || !name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initial.id ? "Update" : "Create"}
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

/* ── Main Page ── */
export default function MasterLocationsPage() {
    const [activeTab, setActiveTab] = useState("districts");
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [d, v] = await Promise.allSettled([getDistricts(), getVillages()]);
            if (d.status === "fulfilled") setDistricts(resolveList(d.value));
            if (v.status === "fulfilled") setVillages(resolveList(v.value));
        } catch {
            setError("Failed to load locations.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getCurrentList = () => {
        const list = activeTab === "districts" ? districts : villages;
        if (!search.trim()) return list;
        const q = search.toLowerCase();
        return list.filter((item) => (item.name || "").toLowerCase().includes(q));
    };

    const getParents = () => {
        if (activeTab === "villages") return districts;
        return [];
    };

    const getParentName = (item) => {
        if (activeTab === "villages") {
            const d = districts.find((x) => String(x.id) === String(item.district || item.district_id));
            return d?.name || "\u2014";
        }
        return null;
    };

    const apiMap = {
        districts: { create: createDistrict, update: updateDistrict, remove: deleteDistrict },
        villages: { create: createVillage, update: updateVillage, remove: deleteVillage },
    };

    const handleSave = async (data) => {
        setSaving(true);
        try {
            const api = apiMap[activeTab];
            if (editTarget?.id) await api.update(editTarget.id, data);
            else await api.create(data);
            setFormOpen(false);
            setEditTarget(null);
            fetchAll();
        } catch { /* keep panel open */ }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await apiMap[activeTab].remove(deleteTarget.id);
            setDeleteTarget(null);
            fetchAll();
        } catch { /* keep dialog open */ }
        finally { setDeleting(false); }
    };

    const openCreate = () => { setEditTarget(null); setFormOpen(true); };
    const openEdit = (item) => { setEditTarget(item); setFormOpen(true); };

    const currentList = getCurrentList();
    const parentCol = activeTab === "villages";

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                            <MapPin className="w-5 h-5" />
                        </div>
                        Master Locations
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage districts and villages</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm">
                        <Plus className="w-4 h-4" /> Add {TAB_LABELS[activeTab].slice(0, -1)}
                    </button>
                    <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 gap-0 bg-white rounded-t-2xl" style={{ boxShadow: SHADOW }}>
                {TABS.map((tab) => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setSearch(""); }}
                        className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab ? "border-emerald-500 text-emerald-700 bg-emerald-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                        {TAB_LABELS[tab]}
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            {(tab === "districts" ? districts : villages).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input type="text" placeholder={`Search ${TAB_LABELS[activeTab].toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)}
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
                    <button onClick={fetchAll} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW }}>
                    <div className="p-5 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                            <Bone className="w-8 h-8 !rounded-full" /><Bone className="w-36 h-4" /><Bone className="w-24 h-4" />
                        </div>
                    ))}
                </div>
            ) : currentList.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: SHADOW }}>
                    <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5"><MapPin className="w-9 h-9 text-violet-300" /></div>
                    <p className="text-base font-semibold text-gray-500">No {TAB_LABELS[activeTab].toLowerCase()} found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">Name</th>
                                    {parentCol && <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">District</th>}
                                    <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left" />
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map((item, idx) => (
                                    <tr key={item.id || idx} className={`border-b border-gray-50 hover:bg-violet-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                            </div>
                                        </td>
                                        {parentCol && <td className="px-5 py-3.5 text-sm text-gray-600">{getParentName(item)}</td>}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button onClick={() => openEdit(item)} title="Edit" className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(item)} title="Delete" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
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
            <SlidePanel open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null); }}
                title={editTarget ? `Edit ${TAB_LABELS[activeTab].slice(0, -1)}` : `Add ${TAB_LABELS[activeTab].slice(0, -1)}`}>
                <LocationForm
                    type={activeTab}
                    initial={editTarget || {}}
                    parents={getParents()}
                    onSubmit={handleSave}
                    onCancel={() => { setFormOpen(false); setEditTarget(null); }}
                    loading={saving}
                />
            </SlidePanel>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={`Delete ${TAB_LABELS[activeTab].slice(0, -1)}`}
                message={`Are you sure you want to delete "${deleteTarget?.name || ""}"?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleting}
                variant="danger"
            />
        </div>
    );
}
