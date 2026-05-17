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
    Sprout,
    RefreshCw,
    UserPlus,
    Download,
    Eye,
    Pencil,
    Wheat,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader, FilterBar, FilterField, EmptyState, PageLoader, SkeletonTable } from "../components/ui/command";

const villageLabel = (f) => f.village || f.village_name || "";
const phoneLabel = (f) => f.mobile || f.phone || "";
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
            <div className="page-header">
                <div>
                    <h1 className="page-title">Farmers</h1>
                    <p className="page-subtitle">
                        {loading
                            ? "Loading…"
                            : hasActiveFilters
                                ? `${filteredFarmers.length} of ${totalCount} farmers match filters`
                                : `${totalCount} farmers`}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
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
                </div>
            </div>

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
                <div className="alert-error flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> {error}
                    </span>
                    <button type="button" onClick={loadFarmers} className="btn btn-ghost btn-sm">Retry</button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="section-card p-5 animate-pulse h-48" />
                    ))}
                </div>
            ) : filteredFarmers.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-semibold">No farmers found</p>
                        {hasActiveFilters && (
                            <button type="button" onClick={handleClearFilters} className="mt-3 text-sm text-emerald-600 hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {paginatedFarmers.map((f) => {
                            const visits = visitCountOf(f);
                            const location = [villageLabel(f), f.district_name].filter(Boolean).join(", ");
                            return (
                                <article key={f.id} className="section-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                            <span className="text-white text-sm font-black">{(f.name || "F")[0].toUpperCase()}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-semibold text-gray-900 truncate">{f.name || "—"}</h2>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {phoneLabel(f) || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <dl className="space-y-2 text-sm">
                                        {location && (
                                            <div className="flex gap-2 text-gray-600">
                                                <Sprout className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                                <dd>{location}</dd>
                                            </div>
                                        )}
                                        {f.crop_name && (
                                            <div className="flex gap-2 text-gray-600">
                                                <Wheat className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                                <dd>{f.crop_name}</dd>
                                            </div>
                                        )}
                                        {landLabel(f) && (
                                            <div className="flex gap-2 text-gray-600">
                                                <span className="text-gray-400 text-xs font-medium w-4">ac</span>
                                                <dd>{landLabel(f)}</dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-4 pt-1 border-t border-gray-50 text-xs text-gray-500">
                                            <span>Visits: <strong className="text-gray-700">{visits}</strong></span>
                                            <span>Last: {formatDate(f.latest_visit_date)}</span>
                                        </div>
                                        <div className="flex justify-between gap-4 text-xs text-gray-400">
                                            <span>Added {formatDate(f.created_at)}</span>
                                            {f.updated_at && <span>Updated {formatDate(f.updated_at)}</span>}
                                        </div>
                                    </dl>

                                    <div className="flex gap-2 mt-auto pt-2">
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

                    <div className="section-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
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

