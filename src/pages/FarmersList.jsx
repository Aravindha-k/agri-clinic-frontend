import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFarmers } from "../api/farmer.api";
import { Search, X, ChevronUp, ChevronDown, Users, MapPin, Phone, Sprout, RefreshCw, ChevronRight, SlidersHorizontal, UserPlus, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const toCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return /[",\n]/.test(text) ? `"${text}"` : text;
};

const FarmersList = () => {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [districtFilter, setDistrictFilter] = useState("");
    const [villageFilter, setVillageFilter] = useState("");
    const searchTimeout = useRef();
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await getFarmers();
                // Normalize: handle {results:[...]}, {data:[...]}, or plain array
                let list = [];
                if (Array.isArray(res)) list = res;
                else if (Array.isArray(res?.results)) list = res.results;
                else if (Array.isArray(res?.data)) list = res.data;
                setFarmers(list);
            } catch (err) {
                setError("Failed to load farmers");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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

    // Filtering and sorting logic
    const filteredFarmers = useMemo(() => {
        let filtered = farmers.filter(f => {
            const name = (f.name || "").toLowerCase();
            const phone = (f.phone || "").toLowerCase();
            const village = (f.village_name || "").toLowerCase();
            const district = (f.district_name || "").toLowerCase();
            const q = search.toLowerCase();
            const districtMatch = !districtFilter || district === districtFilter.toLowerCase();
            const villageMatch = !villageFilter || village === villageFilter.toLowerCase();
            return (
                (name.includes(q) || phone.includes(q) || village.includes(q)) && districtMatch && villageMatch
            );
        });
        filtered.sort((a, b) => {
            let aVal, bVal;
            if (sortBy === "name") {
                aVal = (a.name || "").toLowerCase();
                bVal = (b.name || "").toLowerCase();
            } else if (sortBy === "visits") {
                aVal = a.visit_count ?? 0;
                bVal = b.visit_count ?? 0;
            } else {
                aVal = (a.phone || "");
                bVal = (b.phone || "");
            }
            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [farmers, search, districtFilter, villageFilter, sortBy, sortOrder]);

    // Pagination logic
    const totalPages = Math.ceil(filteredFarmers.length / pageSize) || 1;
    const paginatedFarmers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredFarmers.slice(start, start + pageSize);
    }, [filteredFarmers, page, pageSize]);

    // Unique districts and villages for filters
    const districtOptions = useMemo(() => {
        const set = new Set();
        farmers.forEach(f => {
            if (f.district_name) set.add(f.district_name);
        });
        return Array.from(set).sort();
    }, [farmers]);
    const villageOptions = useMemo(() => {
        const set = new Set();
        farmers.forEach(f => {
            if (f.village_name) set.add(f.village_name);
        });
        return Array.from(set).sort();
    }, [farmers]);

    // Debounced search
    const handleSearchChange = e => {
        const value = e.target.value;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setSearch(value), 300);
    };

    const handleClearFilters = () => {
        setSearch("");
        setDistrictFilter("");
        setVillageFilter("");
    };

    // Column sort handler
    const handleSort = col => {
        if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        else {
            setSortBy(col);
            setSortOrder("asc");
        }
    };

    // Pagination display
    const startIdx = (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, filteredFarmers.length);
    const hasActiveFilters = search || districtFilter || villageFilter;

    const SortIcon = ({ col }) => {
        if (sortBy !== col) return <ChevronUp className="w-3.5 h-3.5 opacity-20" />;
        return sortOrder === "asc"
            ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
            : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />;
    };

    const exportRows = useMemo(() => {
        return filteredFarmers.map((f, index) => ({
            s_no: index + 1,
            farmer_id: f.farmer_id ?? f.id ?? "",
            name: f.name ?? "",
            phone: f.phone ?? "",
            alternate_phone: f.alt_phone ?? f.alternate_phone ?? "",
            village: f.village_name ?? f.village ?? "",
            district: f.district_name ?? f.district ?? "",
            state: f.state ?? "",
            pincode: f.pincode ?? f.pin_code ?? "",
            land_size_acres: f.land_size ?? f.total_land_size ?? f.land_size_acres ?? "",
            total_fields: f.fields_count ?? f.total_fields ?? "",
            total_visits: f.visit_count ?? f.visits_count ?? f.total_visits ?? 0,
            status: f.status ?? (f.is_active === false ? "Inactive" : "Active"),
            created_on: f.created_at ? new Date(f.created_at).toLocaleDateString("en-IN") : "",
        }));
    }, [filteredFarmers]);

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
        link.download = `farmers_basic_details_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportMenuOpen(false);
    };

    const handleExportFarmersPdf = () => {
        if (exportRows.length === 0) return;

        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const now = new Date();
        const title = "Farmers Basic Details";

        doc.setFontSize(16);
        doc.text(title, 40, 36);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${now.toLocaleString("en-IN")}`, 40, 54);
        doc.text(`Records: ${exportRows.length}`, 40, 68);

        const columns = [
            "S.No",
            "Farmer ID",
            "Name",
            "Phone",
            "Alt Phone",
            "Village",
            "District",
            "Land (Acres)",
            "Visits",
            "Status",
        ];

        const body = exportRows.map((row) => [
            row.s_no,
            row.farmer_id,
            row.name,
            row.phone,
            row.alternate_phone,
            row.village,
            row.district,
            row.land_size_acres,
            row.total_visits,
            row.status,
        ]);

        autoTable(doc, {
            head: [columns],
            body,
            startY: 82,
            styles: { fontSize: 8, cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.5 },
            headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 24, right: 24 },
        });

        doc.save(`farmers_basic_details_${now.toISOString().slice(0, 10)}.pdf`);
        setExportMenuOpen(false);
    };

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Farmers</h1>
                    <p className="page-subtitle">
                        {loading ? "Loading…" : `${filteredFarmers.length} farmer${filteredFarmers.length !== 1 ? "s" : ""} found`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!loading && farmers.length > 0 && (
                        <div className="flex gap-2">
                            <div className="stat-pill">
                                <span className="font-bold text-gray-900">{farmers.length}</span>
                                <span className="text-gray-400">Total</span>
                            </div>
                            <div className="stat-pill">
                                <span className="font-bold text-gray-900">{districtOptions.length}</span>
                                <span className="text-gray-400">Districts</span>
                            </div>
                        </div>
                    )}
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            onClick={() => setExportMenuOpen((v) => !v)}
                            disabled={filteredFarmers.length === 0}
                            className="btn btn-secondary btn-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export filtered farmers basic details"
                        >
                            <Download className="w-4 h-4" /> Export
                            <ChevronDown className={`w-4 h-4 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                        {exportMenuOpen && filteredFarmers.length > 0 && (
                            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                                <button
                                    onClick={handleExportFarmers}
                                    className="w-full text-left px-3.5 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                >
                                    Download CSV
                                </button>
                                <button
                                    onClick={handleExportFarmersPdf}
                                    className="w-full text-left px-3.5 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border-t border-gray-100"
                                >
                                    Download PDF
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => navigate("/farmers/new")} className="btn btn-primary btn-md">
                        <UserPlus className="w-4 h-4" /> Add Farmer
                    </button>
                </div>
            </div>

            {/* ── Filters bar ── */}
            <div className="filters-bar">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by name, phone, or village…"
                            defaultValue={search}
                            onChange={handleSearchChange}
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <select className="select" value={districtFilter} onChange={e => { setDistrictFilter(e.target.value); setPage(1); }}>
                        <option value="">All Districts</option>
                        {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="select" value={villageFilter} onChange={e => { setVillageFilter(e.target.value); setPage(1); }}>
                        <option value="">All Villages</option>
                        {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="select" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}>
                        <option value="name">Sort: Name</option>
                        <option value="visits">Sort: Visits</option>
                        <option value="phone">Sort: Phone</option>
                    </select>
                    {hasActiveFilters && (
                        <button onClick={handleClearFilters} className="btn btn-ghost btn-md">
                            <X className="w-4 h-4" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="alert-error">
                    <RefreshCw className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

            {/* ── Loading ── */}
            {loading ? (
                <div className="section-card animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
                            <div className="w-9 h-9 rounded-xl bg-gray-200 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 bg-gray-200 rounded w-40" />
                                <div className="h-3 bg-gray-100 rounded w-28" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-20" />
                            <div className="h-3 bg-gray-100 rounded w-24" />
                            <div className="h-6 w-10 bg-gray-100 rounded-full" />
                        </div>
                    ))}
                </div>
            ) : filteredFarmers.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold">No farmers found</p>
                        {hasActiveFilters && (
                            <button onClick={handleClearFilters} className="mt-3 text-sm text-emerald-600 hover:underline">Clear filters</button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* ── Table ── */}
                    <div className="section-card">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        {[
                                            { col: "name", label: "Farmer" },
                                            { col: "phone", label: "Phone" },
                                            { col: "village", label: "Village" },
                                            { col: "district", label: "District" },
                                            { col: "visits", label: "Visits" },
                                        ].map(({ col, label }) => (
                                            <th key={col} className="cursor-pointer select-none hover:text-gray-600 transition-colors"
                                                onClick={() => handleSort(col)}>
                                                <span className="inline-flex items-center gap-1">
                                                    {label} <SortIcon col={col} />
                                                </span>
                                            </th>
                                        ))}
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedFarmers.map((f, i) => {
                                        const visitCount = f.visit_count ?? f.visits_count ?? f.total_visits ?? 0;
                                        return (
                                            <tr key={f.id || f.phone || i}
                                                onClick={() => f.id && navigate(`/farmers/${f.id}`)}
                                                className={`group transition-all ${f.id ? "cursor-pointer hover:bg-emerald-50/40" : ""}`}>
                                                {/* Farmer name + avatar */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                            <span className="text-white text-xs font-black">{(f.name || "F")[0].toUpperCase()}</span>
                                                        </div>
                                                        <span className="font-semibold text-gray-900">{f.name ?? "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-gray-600 font-mono text-xs">
                                                        <Phone className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                                        {f.phone ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-gray-600 text-sm">
                                                        <Sprout className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                                        {f.village_name ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-gray-600 text-sm">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                                        {f.district_name ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 text-xs rounded-full font-bold ${visitCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                                                        }`}>{visitCount}</span>
                                                </td>
                                                <td className="px-3 py-4">
                                                    <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-emerald-400 transition-colors" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Pagination ── */}
                    <div className="section-card px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="pagination-info">
                            Showing <span className="font-semibold text-gray-700">{startIdx}–{endIdx}</span> of{" "}
                            <span className="font-semibold text-gray-700">{filteredFarmers.length}</span> farmers
                        </p>
                        <div className="pagination-controls">
                            <select
                                className="px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">
                                <ChevronUp className="w-4 h-4 -rotate-90" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                if (p < 1 || p > totalPages) return null;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={page === p ? "pagination-btn-active" : "pagination-btn"}>{p}</button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="pagination-btn">
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
