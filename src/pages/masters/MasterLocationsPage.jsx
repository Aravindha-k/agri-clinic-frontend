import { PageLoader, PageHeader } from "../../components/ui/command";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    fetchAllDistricts,
    fetchTaluksByDistrict,
    fetchVillagesPage,
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

function resolveTalukName(item, taluks, districts) {
    const talukId = item.taluk ?? item.taluk_id;
    const tal = taluks.find((t) => String(t.id) === String(talukId));
    if (tal?.name) return tal.name;
    if (item.taluk_name) return item.taluk_name;
    if (typeof item.taluk === "object" && item.taluk?.name) return item.taluk.name;
    return "\u2014";
}

const inputClass = "masters-admin-field";

/* ── Generic Location Form ── */
function DistrictForm({ initial = {}, onSubmit, onCancel, loading }) {
    const [name, setName] = useState(initial.name || "");

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit({ name });
            }}
            className="masters-admin-form"
        >
            <div className={inputClass}>
                <label>Name *</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter district name"
                />
            </div>
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

function VillageForm({ initial = {}, districts = [], onSubmit, onCancel, loading }) {
    const [name, setName] = useState(initial.name || "");
    const [districtId, setDistrictId] = useState(
        String(initial.district ?? initial.district_id ?? "")
    );
    const [talukId, setTalukId] = useState(String(initial.taluk ?? initial.taluk_id ?? ""));
    const [code, setCode] = useState(initial.code ?? initial.village_code ?? "");
    const [isActive, setIsActive] = useState(initial.is_active !== false);
    const [taluks, setTaluks] = useState([]);
    const [taluksLoading, setTaluksLoading] = useState(false);

    useEffect(() => {
        if (!districtId) {
            setTaluks([]);
            return;
        }
        setTaluksLoading(true);
        fetchTaluksByDistrict(districtId)
            .then(setTaluks)
            .catch(() => setTaluks([]))
            .finally(() => setTaluksLoading(false));
    }, [districtId]);

    const handleDistrictChange = (value) => {
        setDistrictId(value);
        setTalukId("");
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                    name: name.trim(),
                    taluk: talukId ? Number(talukId) : talukId,
                    is_active: isActive,
                };
                if (code.trim()) payload.code = code.trim();
                onSubmit(payload);
            }}
            className="masters-admin-form"
        >
            <div className={inputClass}>
                <label>District *</label>
                <select
                    required
                    value={districtId}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                >
                    <option value="">Select district</option>
                    {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
            <div className={inputClass}>
                <label>Taluk *</label>
                <select
                    required
                    value={talukId}
                    onChange={(e) => setTalukId(e.target.value)}
                    disabled={!districtId || taluksLoading}
                >
                    <option value="">
                        {!districtId
                            ? "Select district first"
                            : taluksLoading
                                ? "Loading taluks…"
                                : "Select taluk"}
                    </option>
                    {taluks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
            <div className={inputClass}>
                <label>Village name *</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter village name"
                />
            </div>
            <div className={inputClass}>
                <label>Official code</label>
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Optional village code"
                />
            </div>
            <div className={inputClass}>
                <label>Status</label>
                <select value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
            <div className="masters-admin-form__foot">
                <button
                    type="submit"
                    disabled={loading || !name.trim() || !districtId || !talukId}
                    className="btn btn-primary btn-md"
                >
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

function LocationForm({ type, initial = {}, parents = [], onSubmit, onCancel, loading }) {
    if (type === "villages") {
        return (
            <VillageForm
                initial={initial}
                districts={parents}
                onSubmit={onSubmit}
                onCancel={onCancel}
                loading={loading}
            />
        );
    }

    return (
        <DistrictForm
            initial={initial}
            onSubmit={onSubmit}
            onCancel={onCancel}
            loading={loading}
        />
    );
}

/* ── Main Page ── */
export default function MasterLocationsPage() {
    const [activeTab, setActiveTab] = useState("districts");
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [districtTotal, setDistrictTotal] = useState(0);
    const [villageTotal, setVillageTotal] = useState(0);
    const [filterDistrict, setFilterDistrict] = useState("");
    const [filterTaluk, setFilterTaluk] = useState("");
    const [filterTaluks, setFilterTaluks] = useState([]);
    const [filterTaluksLoading, setFilterTaluksLoading] = useState(false);
    const [tablePage, setTablePage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchDistricts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const dRes = await fetchAllDistricts();
            setDistricts(dRes.results);
            setDistrictTotal(dRes.count);
        } catch {
            setError("Failed to load districts.");
            setDistricts([]);
            setDistrictTotal(0);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchVillages = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: tablePage,
                page_size: TABLE_PAGE_SIZE,
            };
            if (filterDistrict) params.district = filterDistrict;
            if (filterTaluk) params.taluk = filterTaluk;
            if (search.trim()) params.search = search.trim();
            const page = await fetchVillagesPage(params);
            setVillages(page.results);
            setVillageTotal(page.count);
        } catch {
            setError("Failed to load villages.");
            setVillages([]);
            setVillageTotal(0);
        } finally {
            setLoading(false);
        }
    }, [tablePage, filterDistrict, filterTaluk, search]);

    const fetchAll = useCallback(async () => {
        if (activeTab === "districts") {
            await fetchDistricts();
        } else {
            await fetchVillages();
        }
    }, [activeTab, fetchDistricts, fetchVillages]);

    useEffect(() => { fetchDistricts(); }, [fetchDistricts]);

    useEffect(() => {
        if (activeTab !== "villages") return;
        fetchVillages();
    }, [activeTab, fetchVillages]);

    useEffect(() => {
        if (!filterDistrict) {
            setFilterTaluks([]);
            return;
        }
        let active = true;
        (async () => {
            setFilterTaluksLoading(true);
            try {
                const rows = await fetchTaluksByDistrict(filterDistrict);
                if (active) setFilterTaluks(rows);
            } catch {
                if (active) setFilterTaluks([]);
            } finally {
                if (active) setFilterTaluksLoading(false);
            }
        })();
        return () => { active = false; };
    }, [filterDistrict]);

    useEffect(() => {
        setTablePage(1);
    }, [activeTab, search, filterDistrict, filterTaluk]);

    const getCurrentList = () => {
        if (activeTab === "districts") {
            const list = districts;
            if (!search.trim()) return list;
            const q = search.toLowerCase();
            return list.filter((item) => (item.name || "").toLowerCase().includes(q));
        }
        return villages;
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
    const tableTotalPages = activeTab === "districts"
        ? Math.max(1, Math.ceil(currentList.length / TABLE_PAGE_SIZE))
        : Math.max(1, Math.ceil(villageTotal / TABLE_PAGE_SIZE));
    const pagedList = useMemo(
        () => activeTab === "districts"
            ? currentList.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
            : currentList,
        [activeTab, currentList, tablePage]
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
            <PageHeader
                title="Master Locations"
                subtitle="Manage districts, taluks, and villages"
                badge={
                    <span className="masters-admin-header__badge">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        Locations
                    </span>
                }
                actions={
                    <>
                        <button type="button" onClick={openCreate} className="btn btn-primary btn-md">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add {TAB_LABELS[activeTab].slice(0, -1)}
                        </button>
                        <button type="button" onClick={fetchAll} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </>
                }
            />

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
                    {activeTab === "villages" ? (
                        <>
                            <select
                                value={filterDistrict}
                                onChange={(e) => { setFilterDistrict(e.target.value); setFilterTaluk(""); }}
                                className="masters-admin-filter-select min-w-[10rem]"
                                aria-label="Filter by district"
                            >
                                <option value="">All districts</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <select
                                value={filterTaluk}
                                onChange={(e) => setFilterTaluk(e.target.value)}
                                disabled={!filterDistrict || filterTaluksLoading}
                                className="masters-admin-filter-select min-w-[10rem] disabled:opacity-50"
                                aria-label="Filter by taluk"
                            >
                                <option value="">
                                    {!filterDistrict ? "Select district first" : filterTaluksLoading ? "Loading taluks…" : "All taluks"}
                                </option>
                                {filterTaluks.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </>
                    ) : null}
                    {(search || filterDistrict || filterTaluk) ? (
                        <button type="button" onClick={() => { setSearch(""); setFilterDistrict(""); setFilterTaluk(""); }} className="btn btn-ghost btn-md filter-toolbar__clear">
                            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                        </button>
                    ) : null}
                    <p className="masters-admin-filters__meta lg:ml-auto">
                        {activeTab === "districts" ? currentList.length : villageTotal} {TAB_LABELS[activeTab].toLowerCase()} shown
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
                                    <th>{activeTab === "villages" ? "Village" : "Name"}</th>
                                    {activeTab === "villages" ? (
                                        <>
                                            <th>Taluk</th>
                                            <th>District</th>
                                            <th>Code</th>
                                            <th>Status</th>
                                        </>
                                    ) : null}
                                    {parentCol && activeTab !== "villages" && <th>District</th>}
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
                                        {activeTab === "villages" ? (
                                            <>
                                                <td className="text-sm text-slate-600">{resolveTalukName(item, filterTaluks.length ? filterTaluks : [], districts)}</td>
                                                <td className="text-sm text-slate-600">{getParentName(item)}</td>
                                                <td className="text-sm text-slate-500 font-mono">{item.code || item.village_code || "\u2014"}</td>
                                                <td className="text-sm text-slate-600">{item.is_active === false ? "Inactive" : "Active"}</td>
                                            </>
                                        ) : null}
                                        {parentCol && activeTab !== "villages" && <td className="text-sm text-slate-600">{getParentName(item)}</td>}
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
                                Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(tablePage * TABLE_PAGE_SIZE, activeTab === "districts" ? currentList.length : villageTotal)} of {activeTab === "districts" ? currentList.length : villageTotal}
                                {activeTab === "villages" && (filterDistrict || filterTaluk || search.trim()) ? " (filtered)" : ""}
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
