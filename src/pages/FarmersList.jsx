import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllFarmers } from "../api/farmer.api";
import {
    Search,
    X,
    ChevronUp,
    ChevronDown,
    Users,
    Phone,
    MapPin,
    Leaf,
    LandPlot,
    RefreshCw,
    UserPlus,
    Download,
    Eye,
    Pencil,
    Sprout,
    CalendarDays,
    ClipboardList,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader, FilterBar, EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import { asDisplayString, resolveVillageLabel, resolveDistrictLabel } from "../utils/displayValue";

function FarmerMetaRow({ icon: Icon, tone = "neutral", children }) {
    return (
        <div className="list-card-row">
            <span className={`list-meta-icon list-meta-icon--${tone}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            <dd className="truncate min-w-0 leading-snug">{children}</dd>
        </div>
    );
}

const villageLabel = (f) =>
  asDisplayString(f.village_name ?? resolveVillageLabel(f.village), "");
const districtPart = (f) => asDisplayString(f.district_name ?? resolveDistrictLabel(f.district), "");
const phoneLabel = (f) => asDisplayString(f.mobile ?? f.phone, "");
const visitCountOf = (f) => f.total_visits ?? f.visit_count ?? f.visits ?? 0;
const landLabel = (f) => {
    const v = f.total_land_area ?? f.land_size ?? f.total_area;
    if (v === null || v === undefined || v === "") return "";
    return `${v} ac`;
};

const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
};

const toCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
};

const FarmersList = () => {
    const [farmers, setFarmers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [districtFilter, setDistrictFilter] = useState("");
    const [villageFilter, setVillageFilter] = useState("");
    const searchTimeout = useRef();
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef(null);
    const navigate = useNavigate();

    const loadFarmers = async () => {
        setLoading(true);
        setError("");
        try {
            const pageData = await fetchAllFarmers();
            const list = pageData?.results ?? [];
            const apiTotal = typeof pageData?.count === "number" ? pageData.count : list.length;
            setFarmers(list);
            setTotalCount(apiTotal);
            if (apiTotal > list.length) {
                console.warn(
                    `[Farmers] API reports ${apiTotal} farmers but only ${list.length} were loaded. Check pagination.`
                );
            }
        } catch (err) {
            setError(err?.message || "Failed to load farmers");
            setFarmers([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFarmers();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!exportMenuRef.current?.contains(event.target)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredFarmers = useMemo(() => {
        const q = search.toLowerCase();
        let filtered = farmers.filter((f) => {
            const name = (f.name || "").toLowerCase();
            const phone = phoneLabel(f).toLowerCase();
            const village = villageLabel(f).toLowerCase();
            const district = (f.district_name || "").toLowerCase();
            const districtMatch = !districtFilter || district === districtFilter.toLowerCase();
            const villageMatch = !villageFilter || village === villageFilter.toLowerCase();
            const crop = (f.crop_name || "").toLowerCase();
            return (
                (name.includes(q) || phone.includes(q) || village.includes(q) || crop.includes(q)) &&
                districtMatch &&
                villageMatch
            );
        });

        filtered.sort((a, b) => {
            let aVal;
            let bVal;
            if (sortBy === "name") {
                aVal = (a.name || "").toLowerCase();
                bVal = (b.name || "").toLowerCase();
            } else if (sortBy === "visits") {
                aVal = visitCountOf(a);
                bVal = visitCountOf(b);
            } else if (sortBy === "crop") {
                aVal = (a.crop_name || "").toLowerCase();
                bVal = (b.crop_name || "").toLowerCase();
            } else if (sortBy === "latest") {
                aVal = a.latest_visit_date || "";
                bVal = b.latest_visit_date || "";
            } else {
                aVal = phoneLabel(a);
                bVal = phoneLabel(b);
            }
            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [farmers, search, districtFilter, villageFilter, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredFarmers.length / pageSize) || 1;
    const paginatedFarmers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredFarmers.slice(start, start + pageSize);
    }, [filteredFarmers, page, pageSize]);

    const districtOptions = useMemo(() => {
        const set = new Set();
        farmers.forEach((f) => {
            if (f.district_name) set.add(f.district_name);
        });
        return Array.from(set).sort();
    }, [farmers]);

    const villageOptions = useMemo(() => {
        const set = new Set();
        farmers.forEach((f) => {
            const v = villageLabel(f);
            if (v) set.add(v);
        });
        return Array.from(set).sort();
    }, [farmers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setSearch(value), 300);
    };

    const handleClearFilters = () => {
        setSearch("");
        setDistrictFilter("");
        setVillageFilter("");
        setPage(1);
    };

    const startIdx = filteredFarmers.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, filteredFarmers.length);
    const hasActiveFilters = search || districtFilter || villageFilter;

    const exportRows = useMemo(
        () =>
            filteredFarmers.map((f, index) => ({
                s_no: index + 1,
                farmer_id: f.id ?? "",
                name: f.name ?? "",
                phone: phoneLabel(f),
                village: villageLabel(f),
                district: f.district_name ?? "",
                crop: f.crop_name ?? "",
                land: landLabel(f),
                total_visits: visitCountOf(f),
                latest_visit: formatDate(f.latest_visit_date),
                created_on: formatDate(f.created_at),
                updated_on: formatDate(f.updated_at),
            })),
        [filteredFarmers]
    );

    const handleExportFarmers = () => {
        if (exportRows.length === 0) return;
        const headers = Object.keys(exportRows[0]);
        const csv = [
            headers.join(","),
            ...exportRows.map((row) => headers.map((key) => toCsvValue(row[key])).join(",")),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `farmers_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportMenuOpen(false);
    };

    const handleExportFarmersPdf = () => {
        if (exportRows.length === 0) return;
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(16);
        doc.text("Farmers", 40, 36);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 40, 54);
        doc.text(`Records: ${exportRows.length}`, 40, 68);
        autoTable(doc, {
            head: [["S.No", "Name", "Phone", "Village", "Crop", "Visits", "Latest visit"]],
            body: exportRows.map((row) => [
                row.s_no,
                row.name,
                row.phone,
                row.village,
                row.crop,
                row.total_visits,
                row.latest_visit,
            ]),
            startY: 82,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
            margin: { left: 24, right: 24 },
        });
        doc.save(`farmers_${new Date().toISOString().slice(0, 10)}.pdf`);
        setExportMenuOpen(false);
    };

    return (
        <div className="page-container">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2.5">
                        <span className="icon-box w-9 h-9 rounded-lg">
                            <Sprout className="w-4 h-4" strokeWidth={2} />
                        </span>
                        Farmers
                    </span>
                }
                subtitle={
                    loading
                        ? "Loading…"
                        : hasActiveFilters
                            ? `${filteredFarmers.length} of ${totalCount} farmers match filters`
                            : `${totalCount} farmers`
                }
                actions={
                    <>
                        {!loading && totalCount > 0 && (
                            <div className="stat-pill">
                                <span className="font-bold text-gray-900">{totalCount}</span>
                                <span className="text-gray-400">Total farmers</span>
                            </div>
                        )}
                        <div className="relative" ref={exportMenuRef}>
                            <button
                                type="button"
                                onClick={() => setExportMenuOpen((v) => !v)}
                                disabled={filteredFarmers.length === 0}
                                className="btn btn-secondary btn-md disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" /> Export
                                <ChevronDown className={`w-4 h-4 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
                            </button>
                            {exportMenuOpen && filteredFarmers.length > 0 && (
                                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                                    <button type="button" onClick={handleExportFarmers} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-emerald-50">
                                        Download CSV
                                    </button>
                                    <button type="button" onClick={handleExportFarmersPdf} className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-emerald-50 border-t border-gray-100">
                                        Download PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <button type="button" onClick={() => navigate("/farmers/new")} className="btn btn-primary btn-md">
                            <UserPlus className="w-4 h-4" /> Add Farmer
                        </button>
                    </>
                }
            />

            <FilterBar>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    <div className="search-wrapper flex-1 min-w-[200px]">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search name, phone, village, or crop…"
                            defaultValue={search}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <select className="select" value={districtFilter} onChange={(e) => { setDistrictFilter(e.target.value); setPage(1); }}>
                        <option value="">All districts</option>
                        {districtOptions.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select className="select" value={villageFilter} onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}>
                        <option value="">All villages</option>
                        {villageOptions.map((v) => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                    <select className="select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                        <option value="name">Sort: Name</option>
                        <option value="visits">Sort: Total visits</option>
                        <option value="crop">Sort: Crop</option>
                        <option value="latest">Sort: Latest visit</option>
                        <option value="phone">Sort: Phone</option>
                    </select>
                    {hasActiveFilters && (
                        <button type="button" onClick={handleClearFilters} className="btn btn-ghost btn-md">
                            <X className="w-4 h-4" /> Clear
                        </button>
                    )}
                </div>
            </FilterBar>

            {error && (
                <ErrorRetry
                    compact
                    message={friendlyErrorMessage(error, "Couldn't load farmers. Please try again.")}
                    onRetry={loadFarmers}
                />
            )}

            {loading ? (
                <div className="list-grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="list-card animate-pulse-soft">
                            <div className="skeleton w-12 h-12 rounded-full mb-3" />
                            <div className="skeleton h-4 w-32 mb-2" />
                            <div className="skeleton h-3 w-full mb-1" />
                            <div className="skeleton h-3 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : filteredFarmers.length === 0 ? (
                <div className="section-card">
                    <EmptyState
                        icon={Users}
                        title={hasActiveFilters ? "No farmers match your filters" : "No farmers registered yet"}
                        subtitle={
                            hasActiveFilters
                                ? "Try clearing filters or adjusting your search."
                                : "Add your first farmer to start tracking visits and field activity."
                        }
                        action={
                            hasActiveFilters ? (
                                <button type="button" onClick={handleClearFilters} className="btn btn-secondary btn-md">
                                    Clear filters
                                </button>
                            ) : (
                                <button type="button" onClick={() => navigate("/farmers/new")} className="btn btn-primary btn-md">
                                    Add farmer
                                </button>
                            )
                        }
                    />
                </div>
            ) : (
                <>
                    <div className="list-grid">
                        {paginatedFarmers.map((f) => {
                            const visits = visitCountOf(f);
                            const location = [villageLabel(f), districtPart(f)].filter(Boolean).join(", ");
                            return (
                                <article key={f.id} className="list-card">
                                    <div className="flex items-start gap-2.5">
                                        <ProfileAvatar entity={f} name={f.name || "Farmer"} size="md" variant="teal" />
                                        <div className="min-w-0 flex-1">
                                            <h2 className="list-card-title">{f.name || "—"}</h2>
                                            <p className="list-card-meta mt-0.5 flex items-center gap-1.5">
                                                <span className="list-meta-icon list-meta-icon--neutral">
                                                    <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                                                </span>
                                                <span className="font-mono tabular-nums">{phoneLabel(f) || "—"}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="space-y-1.5 text-xs text-gray-600">
                                        {location && (
                                            <FarmerMetaRow icon={MapPin} tone="location">
                                                {location}
                                            </FarmerMetaRow>
                                        )}
                                        {f.crop_name && (
                                            <FarmerMetaRow icon={Leaf} tone="crop">
                                                {asDisplayString(f.crop_name ?? f.crop)}
                                            </FarmerMetaRow>
                                        )}
                                        {landLabel(f) && (
                                            <FarmerMetaRow icon={LandPlot} tone="land">
                                                {landLabel(f)}
                                            </FarmerMetaRow>
                                        )}
                                        <div className="flex justify-between gap-3 pt-1.5 border-t border-gray-100 text-xs text-gray-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <ClipboardList className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                                                <span>
                                                    Visits: <strong className="text-gray-700">{visits}</strong>
                                                </span>
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                                                {formatDate(f.latest_visit_date)}
                                            </span>
                                        </div>
                                    </dl>

                                    <div className="list-card-footer">
                                        <button
                                            type="button"
                                            onClick={() => f.id && navigate(`/farmers/${f.id}`)}
                                            className="btn btn-secondary btn-sm flex-1"
                                        >
                                            <Eye className="w-4 h-4" /> View
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => f.id && navigate(`/farmers/${f.id}/edit`)}
                                            className="btn btn-primary btn-sm flex-1"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="section-card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                        <p className="pagination-info text-sm text-gray-600">
                            Showing <span className="font-semibold">{startIdx}–{endIdx}</span> of{" "}
                            <span className="font-semibold">{filteredFarmers.length}</span> farmers
                        </p>
                        <div className="pagination-controls">
                            <select
                                className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg"
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={12}>12</option>
                                <option value={24}>24</option>
                                <option value={48}>48</option>
                            </select>
                            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">
                                <ChevronUp className="w-4 h-4 -rotate-90" />
                            </button>
                            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="pagination-btn">
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FarmersList;

