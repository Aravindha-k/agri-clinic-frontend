import { PageLoader } from "../../components/ui/command";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    fetchAllDistricts, fetchAllVillages,
    createDistrict, updateDistrict, deleteDistrict,
    createVillage, updateVillage, deleteVillage,
} from "../../api/master.api";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import {
    MapPin, Search, X, RefreshCw, Edit3, Trash2, Plus, AlertCircle, Loader2,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const TABLE_PAGE_SIZE = 25;
const TABS = ["districts", "villages"];
const TAB_LABELS = { districts: "Districts", villages: "Villages" };

const inputClass = "masters-admin-field";

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
        }} className="masters-admin-form">
            <div className={inputClass}>
                <label>Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter ${type.slice(0, -1)} name`} />
            </div>
            {parentLabel && (
                <div className={inputClass}>
                    <label>{parentLabel}</label>
                    <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                        <option value="">Select {parentLabel}</option>
                        {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}
            <div className="masters-admin-form__foot">
                <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary btn-md">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {initial.id ? "Update" : "Create"}
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

/* ── Main Page ── */
export default function MasterLocationsPage() {
    const [activeTab, setActiveTab] = useState("districts");
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [districtTotal, setDistrictTotal] = useState(0);
    const [villageTotal, setVillageTotal] = useState(0);
    const [tablePage, setTablePage] = useState(1);
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
            const [dRes, vRes] = await Promise.all([
                fetchAllDistricts(),
                fetchAllVillages(),
            ]);
            setDistricts(dRes.results);
            setDistrictTotal(dRes.count);
            setVillages(vRes.results);
            setVillageTotal(vRes.count);
        } catch {
            setError("Failed to load locations.");
            setDistricts([]);
            setVillages([]);
            setDistrictTotal(0);
            setVillageTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        setTablePage(1);
    }, [activeTab, search]);

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
    const apiTotal = activeTab === "districts" ? districtTotal : villageTotal;
    const tableTotalPages = Math.max(1, Math.ceil(currentList.length / TABLE_PAGE_SIZE));
    const pagedList = useMemo(
        () => currentList.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE),
        [currentList, tablePage]
    );
    const parentCol = activeTab === "villages";

    useEffect(() => {
        logApiDiagnostics({
            label: `locations-${activeTab}`,
            url: `/api/v1/masters/${activeTab}/`,
            apiCount: apiTotal,
            rowsLoaded: activeTab === "districts" ? districts.length : villages.length,
            rowsRendered: pagedList.length,
            pagination: { tablePage, tableTotalPages, search: search.trim() || null },
        });
    }, [activeTab, apiTotal, districts.length, villages.length, pagedList.length, tablePage, tableTotalPages, search]);

    return (
        <div className="masters-admin page-container">
            <header className="masters-admin-header">
                <div className="masters-admin-header__inner">
                    <div className="masters-admin-header__brand">
                        <div className="masters-admin-header__icon" aria-hidden="true">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="masters-admin-header__badge">
                                <MapPin className="w-3 h-3" aria-hidden="true" />
                                Locations
                            </span>
                            <h1 className="masters-admin-header__title">Master Locations</h1>
                            <p className="masters-admin-header__subtitle">Manage districts and villages</p>
                        </div>
                    </div>
                    <div className="masters-admin-header__actions">
                        <button type="button" onClick={openCreate} className="btn btn-primary btn-md">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add {TAB_LABELS[activeTab].slice(0, -1)}
                        </button>
                        <button type="button" onClick={fetchAll} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </div>
                </div>
            </header>

            <div className="masters-admin-toolbar">
                <div className="masters-admin-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => { setActiveTab(tab); setSearch(""); }}
                            className={`masters-admin-tab ${activeTab === tab ? "masters-admin-tab--active" : ""}`}
                        >
                            {TAB_LABELS[tab]}
                            <span className="masters-admin-tab__count">
                                {tab === "districts" ? districtTotal : villageTotal}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <section className="masters-admin-filters" aria-label="Search locations">
                <div className="masters-admin-filters__row">
                    <div className="masters-admin-search">
                        <Search className="search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder={`Search ${TAB_LABELS[activeTab].toLowerCase()}…`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="search-input"
                            aria-label={`Search ${TAB_LABELS[activeTab].toLowerCase()}`}
                        />
                    </div>
                    {search && (
                        <button type="button" onClick={() => setSearch("")} className="btn btn-ghost btn-sm">
                            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                        </button>
                    )}
                    <p className="masters-admin-filters__meta lg:ml-auto">
                        {currentList.length} {TAB_LABELS[activeTab].toLowerCase()} shown
                    </p>
                </div>
            </section>

            {error && (
                <div className="masters-admin-alert masters-admin-alert--error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                    <button type="button" onClick={fetchAll} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {loading ? (
                <PageLoader label="Loading locations…" />
            ) : currentList.length === 0 ? (
                <div className="masters-admin-empty">
                    <div className="masters-admin-empty__icon">
                        <MapPin className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <p className="text-base font-semibold text-slate-600">No {TAB_LABELS[activeTab].toLowerCase()} found</p>
                    <p className="text-sm text-slate-400 mt-1">Add a new record or adjust your search.</p>
                </div>
            ) : (
                <div className="masters-admin-table-card">
                    <div className="masters-admin-table-wrap">
                        <table className="data-table compact-table masters-admin-table w-full">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    {parentCol && <th>District</th>}
                                    <th className="w-28 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedList.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="masters-admin-row-icon">
                                                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                                </div>
                                                <p className="masters-admin-row-name">{item.name}</p>
                                            </div>
                                        </td>
                                        {parentCol && <td className="text-sm text-slate-600">{getParentName(item)}</td>}
                                        <td>
                                            <div className="masters-admin-actions">
                                                <button type="button" onClick={() => openEdit(item)} title="Edit" className="masters-admin-action-btn masters-admin-action-btn--edit" aria-label="Edit">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setDeleteTarget(item)} title="Delete" className="masters-admin-action-btn masters-admin-action-btn--delete" aria-label="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {tableTotalPages > 1 && (
                        <div className="masters-admin-pagination">
                            <span>
                                Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, currentList.length)} of {currentList.length}
                                {search.trim() ? ` (filtered from ${apiTotal} total)` : ` (${apiTotal} total)`}
                            </span>
                            <div className="masters-admin-pagination__controls">
                                <button
                                    type="button"
                                    disabled={tablePage <= 1}
                                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                    className="masters-admin-pagination__btn"
                                >
                                    Previous
                                </button>
                                <span className="text-xs font-semibold tabular-nums">{tablePage} / {tableTotalPages}</span>
                                <button
                                    type="button"
                                    disabled={tablePage >= tableTotalPages}
                                    onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                                    className="masters-admin-pagination__btn"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <SlidePanel
                tone="masters"
                open={formOpen}
                onClose={() => { setFormOpen(false); setEditTarget(null); }}
                title={editTarget ? `Edit ${TAB_LABELS[activeTab].slice(0, -1)}` : `Add ${TAB_LABELS[activeTab].slice(0, -1)}`}
            >
                <LocationForm
                    type={activeTab}
                    initial={editTarget || {}}
                    parents={getParents()}
                    onSubmit={handleSave}
                    onCancel={() => { setFormOpen(false); setEditTarget(null); }}
                    loading={saving}
                />
            </SlidePanel>

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
