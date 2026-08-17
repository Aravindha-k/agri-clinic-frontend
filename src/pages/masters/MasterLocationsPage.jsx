import { PageLoader, PageHeader } from "../../components/ui/command";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
    fetchAllDistricts,
    fetchTaluksByDistrict,
    fetchTaluksPage,
    fetchVillagesPage,
    fetchLocationSummary,
    createDistrict, updateDistrict, deleteDistrict,
    createVillage, updateVillage, deleteVillage,
} from "../../api/master.api";
import { TALUK_NOT_ASSIGNED } from "../../utils/locationDisplay";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import {
    MapPin, Search, X, RefreshCw, Edit3, Trash2, Plus, AlertCircle, Loader2,
} from "lucide-react";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const TABLE_PAGE_SIZE = 25;
const TABS = ["districts", "taluks", "villages"];
const TAB_LABELS = { districts: "Districts", taluks: "Taluks", villages: "Villages" };

function resolveDistrictName(item, districts = []) {
    if (item?.district_name) return item.district_name;
    if (typeof item?.district === "object" && item.district?.name) return item.district.name;
    const districtId = item?.district ?? item?.district_id;
    const match = districts.find((d) => String(d.id) === String(districtId));
    return match?.name || "\u2014";
}

function resolveCountField(item, field) {
    const value = item?.[field];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (value != null && value !== "" && !Number.isNaN(Number(value))) return Number(value);
    return null;
}

function displayCount(item, ...fields) {
    for (const field of fields) {
        const value = resolveCountField(item, field);
        if (value != null) return value;
    }
    return "\u2014";
}

function resolveStatusLabel(item) {
    if (item?.is_active === false) return "Inactive";
    if (item?.is_active === true) return "Active";
    if (item?.status) return String(item.status);
    return "Active";
}

function resolveVillageTalukName(item, talukOptions = []) {
    const talukId = item?.taluk ?? item?.taluk_id;
    const talukMissing = talukId == null || talukId === "";
    if (talukMissing) {
        if (item?.taluk_name) return item.taluk_name;
        return TALUK_NOT_ASSIGNED;
    }
    const tal = talukOptions.find((t) => String(t.id) === String(talukId));
    if (tal?.name) return tal.name;
    if (item?.taluk_name) return item.taluk_name;
    if (typeof item?.taluk === "object" && item.taluk?.name) return item.taluk.name;
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
    const [taluks, setTaluks] = useState([]);
    const [villages, setVillages] = useState([]);
    const [districtTotal, setDistrictTotal] = useState(0);
    const [talukGlobalTotal, setTalukGlobalTotal] = useState(0);
    const [talukFilteredTotal, setTalukFilteredTotal] = useState(0);
    const [villageGlobalTotal, setVillageGlobalTotal] = useState(0);
    const [villageFilteredTotal, setVillageFilteredTotal] = useState(0);
    const [locationSummary, setLocationSummary] = useState(null);
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

    const fetchSummaryCounts = useCallback(async () => {
        try {
            const summary = await fetchLocationSummary();
            setLocationSummary(summary);
            if (summary.districts != null) setDistrictTotal(summary.districts);
            if (summary.taluks != null) setTalukGlobalTotal(summary.taluks);
            if (summary.villages != null) setVillageGlobalTotal(summary.villages);
        } catch {
            setLocationSummary(null);
            setTalukGlobalTotal(0);
            setVillageGlobalTotal(0);
        }
    }, []);

    const fetchTaluks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: tablePage,
                page_size: TABLE_PAGE_SIZE,
            };
            if (filterDistrict) params.district = filterDistrict;
            if (search.trim()) params.search = search.trim();
            const page = await fetchTaluksPage(params);
            setTaluks(page.results);
            setTalukFilteredTotal(page.count);
        } catch {
            setError("Failed to load taluks.");
            setTaluks([]);
            setTalukFilteredTotal(0);
        } finally {
            setLoading(false);
        }
    }, [tablePage, filterDistrict, search]);

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
            setVillageFilteredTotal(page.count);
            if (!filterDistrict && !filterTaluk && !search.trim()) {
                setVillageGlobalTotal(page.count);
            }
        } catch {
            setError("Failed to load villages.");
            setVillages([]);
            setVillageFilteredTotal(0);
        } finally {
            setLoading(false);
        }
    }, [tablePage, filterDistrict, filterTaluk, search]);

    const fetchAll = useCallback(async () => {
        if (activeTab === "districts") {
            await fetchDistricts();
        } else if (activeTab === "taluks") {
            await fetchTaluks();
        } else {
            await fetchVillages();
        }
        await fetchSummaryCounts();
    }, [activeTab, fetchDistricts, fetchTaluks, fetchVillages, fetchSummaryCounts]);

    useEffect(() => {
        fetchDistricts();
        fetchSummaryCounts();
    }, [fetchDistricts, fetchSummaryCounts]);

    useEffect(() => {
        if (activeTab === "taluks") fetchTaluks();
    }, [activeTab, fetchTaluks]);

    useEffect(() => {
        if (activeTab === "villages") fetchVillages();
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

    const filteredDistricts = useMemo(() => {
        if (activeTab !== "districts" || !search.trim()) return districts;
        const q = search.toLowerCase();
        return districts.filter((item) => (item.name || "").toLowerCase().includes(q));
    }, [activeTab, districts, search]);

    const currentList = activeTab === "districts"
        ? filteredDistricts
        : activeTab === "taluks"
            ? taluks
            : villages;

    const listTotal = activeTab === "districts"
        ? filteredDistricts.length
        : activeTab === "taluks"
            ? talukFilteredTotal
            : villageFilteredTotal;

    const tableTotalPages = activeTab === "districts"
        ? Math.max(1, Math.ceil(filteredDistricts.length / TABLE_PAGE_SIZE))
        : Math.max(1, Math.ceil(listTotal / TABLE_PAGE_SIZE));

    const pagedList = useMemo(
        () => activeTab === "districts"
            ? filteredDistricts.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
            : currentList,
        [activeTab, filteredDistricts, currentList, tablePage]
    );

    const hasFilters = Boolean(search.trim() || filterDistrict || filterTaluk);
    const villagesFiltered = activeTab === "villages" && (filterDistrict || filterTaluk || search.trim());
    const taluksFiltered = activeTab === "taluks" && (filterDistrict || search.trim());

    const getParents = () => (activeTab === "villages" ? districts : []);

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

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearch("");
        setTablePage(1);
        if (tab !== "villages") setFilterTaluk("");
    };

    const clearFilters = () => {
        setSearch("");
        setFilterDistrict("");
        setFilterTaluk("");
    };

    const showingFrom = listTotal === 0 ? 0 : (tablePage - 1) * TABLE_PAGE_SIZE + 1;
    const showingTo = Math.min(tablePage * TABLE_PAGE_SIZE, listTotal);

    useEffect(() => {
        logApiDiagnostics({
            label: `locations-${activeTab}`,
            url: `/api/v1/masters/${activeTab}/`,
            apiCount: listTotal,
            rowsLoaded: currentList.length,
            rowsRendered: pagedList.length,
            pagination: { tablePage, tableTotalPages, search: search.trim() || null },
        });
    }, [activeTab, listTotal, currentList.length, pagedList.length, tablePage, tableTotalPages, search]);

    const canMutate = activeTab !== "taluks";

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
                        {canMutate ? (
                            <button type="button" onClick={openCreate} className="btn btn-primary btn-md">
                                <Plus className="w-4 h-4" aria-hidden="true" /> Add {TAB_LABELS[activeTab].slice(0, -1)}
                            </button>
                        ) : null}
                        <button type="button" onClick={fetchAll} className="btn btn-secondary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </>
                }
            />

            <div className="masters-admin-toolbar">
                <div className="masters-admin-tabs" role="tablist" aria-label="Location master tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            onClick={() => handleTabChange(tab)}
                            className={`masters-admin-tab ${activeTab === tab ? "masters-admin-tab--active" : ""}`}
                        >
                            {TAB_LABELS[tab]}
                            <span className="masters-admin-tab__count">
                                {tab === "districts"
                                    ? districtTotal
                                    : tab === "taluks"
                                        ? talukGlobalTotal
                                        : villageGlobalTotal}
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
                    {(activeTab === "taluks" || activeTab === "villages") ? (
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
                    ) : null}
                    {activeTab === "villages" ? (
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
                    ) : null}
                    {hasFilters ? (
                        <button type="button" onClick={clearFilters} className="btn btn-ghost btn-md filter-toolbar__clear">
                            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                        </button>
                    ) : null}
                    {(taluksFiltered || villagesFiltered) ? (
                        <p className="masters-admin-filters__meta lg:ml-auto">
                            {listTotal} {TAB_LABELS[activeTab].toLowerCase()} match filters
                        </p>
                    ) : null}
                </div>
                {activeTab === "villages" && typeof locationSummary?.villages === "number" ? (
                    <p className="masters-admin-summary-hint">
                        {locationSummary.villages} active village records
                    </p>
                ) : null}
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
                    <p className="text-sm text-slate-400 mt-1">
                        {canMutate ? "Add a new record or adjust your search." : "Adjust your search or district filter."}
                    </p>
                </div>
            ) : (
                <div className="masters-admin-table-card">
                    <div className="masters-admin-table-wrap">
                        <table className="data-table compact-table masters-admin-table w-full">
                            <thead>
                                <tr>
                                    {activeTab === "districts" ? (
                                        <>
                                            <th>District</th>
                                            <th>Taluks</th>
                                            <th>Villages</th>
                                            <th>Status</th>
                                            <th className="w-28 text-right">Actions</th>
                                        </>
                                    ) : null}
                                    {activeTab === "taluks" ? (
                                        <>
                                            <th>Taluk</th>
                                            <th>District</th>
                                            <th>Villages</th>
                                            <th>Status</th>
                                        </>
                                    ) : null}
                                    {activeTab === "villages" ? (
                                        <>
                                            <th>Village</th>
                                            <th>Taluk</th>
                                            <th>District</th>
                                            <th>Code</th>
                                            <th>Status</th>
                                            <th className="w-28 text-right">Actions</th>
                                        </>
                                    ) : null}
                                </tr>
                            </thead>
                            <tbody>
                                {pagedList.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        {activeTab === "districts" ? (
                                            <>
                                                <td>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="masters-admin-row-icon">
                                                            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                                        </div>
                                                        <p className="masters-admin-row-name">{item.name}</p>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-slate-600 tabular-nums">
                                                    {displayCount(item, "taluk_count")}
                                                </td>
                                                <td className="text-sm text-slate-600 tabular-nums">
                                                    {displayCount(item, "village_count")}
                                                </td>
                                                <td className="text-sm text-slate-600">{resolveStatusLabel(item)}</td>
                                                <td>
                                                    <div className="masters-admin-actions">
                                                        <button type="button" onClick={() => openEdit(item)} title="Edit" className="masters-admin-action-btn masters-admin-action-btn--edit" aria-label="Edit district">
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => setDeleteTarget(item)} title="Delete" className="masters-admin-action-btn masters-admin-action-btn--delete" aria-label="Delete district">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : null}
                                        {activeTab === "taluks" ? (
                                            <>
                                                <td>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="masters-admin-row-icon">
                                                            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                                        </div>
                                                        <p className="masters-admin-row-name break-words">{item.name}</p>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-slate-600 break-words">{resolveDistrictName(item, districts)}</td>
                                                <td className="text-sm text-slate-600 tabular-nums">
                                                    {displayCount(item, "village_count")}
                                                </td>
                                                <td className="text-sm text-slate-600">{resolveStatusLabel(item)}</td>
                                            </>
                                        ) : null}
                                        {activeTab === "villages" ? (
                                            <>
                                                <td>
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="masters-admin-row-icon">
                                                            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                                        </div>
                                                        <p className="masters-admin-row-name break-words">{item.name}</p>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-slate-600 break-words">
                                                    {resolveVillageTalukName(item, filterTaluks)}
                                                </td>
                                                <td className="text-sm text-slate-600 break-words">{resolveDistrictName(item, districts)}</td>
                                                <td className="text-sm text-slate-500 font-mono">{item.code || item.village_code || "\u2014"}</td>
                                                <td className="text-sm text-slate-600">{resolveStatusLabel(item)}</td>
                                                <td>
                                                    <div className="masters-admin-actions">
                                                        <button type="button" onClick={() => openEdit(item)} title="Edit" className="masters-admin-action-btn masters-admin-action-btn--edit" aria-label="Edit village">
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button type="button" onClick={() => setDeleteTarget(item)} title="Delete" className="masters-admin-action-btn masters-admin-action-btn--delete" aria-label="Delete village">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {(tableTotalPages > 1 || listTotal > 0) ? (
                        <div className="masters-admin-pagination">
                            <span>
                                Showing {showingFrom}–{showingTo} of {listTotal}
                                {(taluksFiltered || villagesFiltered) ? " (filtered)" : ""}
                            </span>
                            {tableTotalPages > 1 ? (
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
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}

            {canMutate ? (
                <>
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
                </>
            ) : null}
        </div>
    );
}
