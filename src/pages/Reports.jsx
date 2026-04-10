import { useEffect, useState, useMemo } from "react";
import { getVisits } from "../api/visit.api";
import {
    BarChart3, Users, Leaf, UserCheck, RefreshCw, AlertCircle, TrendingUp,
    Download, Calendar, MapPin,
} from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

function getEmployeeName(item) {
    if (typeof item?.employee === "string") return item.employee;
    return item?.employee?.name || item?.employee?.first_name || item?.employee?.username || item?.employee_name || "—";
}

function getCropName(item) {
    if (typeof item?.crop === "string") return item.crop;
    return item?.crop?.name || item?.crop?.name_en || item?.crop_name || "—";
}

function getLocationName(item) {
    if (typeof item?.village === "string") return item.village;
    return item?.village?.name || item?.village_name || item?.district?.name || item?.district_name || "—";
}

function getVisitDate(item) {
    return item?.visit_date || item?.created_at || item?.timestamp || item?.start_time || null;
}

function normalizeReportRow(item, index) {
    return {
        ...item,
        id: item?.id ?? item?.visit_id ?? item?.report_id ?? index + 1,
        farmer_name: item?.farmer_name || item?.farmer?.name || "—",
        crop: getCropName(item),
        employee: getEmployeeName(item),
        location_name: getLocationName(item),
        visit_date: getVisitDate(item),
        status: item?.status || item?.visit_status || "pending",
    };
}

function StatusBadge({ status }) {
    const s = (status || "completed").toLowerCase();
    const cfg = {
        verified: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Verified" },
        completed: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Completed" },
        pending: { cls: "badge badge-warning", dot: "bg-amber-500", label: "Pending" },
        in_progress: { cls: "badge badge-info", dot: "bg-sky-500", label: "In Progress" },
    };
    const c = cfg[s] || cfg.completed;
    return (
        <span className={c.cls}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {c.label}
        </span>
    );
}

export default function Reports() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    const load = async () => {
        setError(null);
        setLoading(true);
        try {
            const visits = await getVisits({ page_size: 200 });
            const records = Array.isArray(visits) ? visits : [];
            setData(records.map(normalizeReportRow));
        } catch (err) {
            setError(err.message || "Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const analytics = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return {
            totalVisits: 0, totalFarmers: 0, cropTypes: {}, visitsByEmployee: {}
        };
        const cropTypes = {}, visitsByEmployee = {};
        const farmerSet = new Set();
        data.forEach((item) => {
            if (item.crop) cropTypes[item.crop] = (cropTypes[item.crop] || 0) + 1;
            if (item.employee) visitsByEmployee[item.employee] = (visitsByEmployee[item.employee] || 0) + 1;
            if (item.farmer_name) farmerSet.add(item.farmer_name);
        });
        return { totalVisits: data.length, totalFarmers: farmerSet.size, cropTypes, visitsByEmployee };
    }, [data]);

    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((r) =>
            (r.farmer_name || "").toLowerCase().includes(q) ||
            (r.crop || "").toLowerCase().includes(q) ||
            (r.employee || "").toLowerCase().includes(q) ||
            (r.location_name || "").toLowerCase().includes(q) ||
            String(r.id || "").includes(q)
        );
    }, [data, search]);

    const kpis = [
        { icon: BarChart3, label: "Total Visits", value: analytics.totalVisits, accent: "#166534", gradient: "linear-gradient(135deg,#fff 0%,#f0fdf4 100%)", iconBg: "#dcfce7" },
        { icon: Users, label: "Farmers Served", value: analytics.totalFarmers, accent: "#2563eb", gradient: "linear-gradient(135deg,#fff 0%,#eff6ff 100%)", iconBg: "#dbeafe" },
        { icon: Leaf, label: "Crop Types", value: Object.keys(analytics.cropTypes).length, accent: "#ca8a04", gradient: "linear-gradient(135deg,#fff 0%,#fefce8 100%)", iconBg: "#fef9c3" },
        { icon: UserCheck, label: "Field Agents", value: Object.keys(analytics.visitsByEmployee).length, accent: "#7c3aed", gradient: "linear-gradient(135deg,#fff 0%,#f5f3ff 100%)", iconBg: "#ede9fe" },
    ];

    if (loading) {
        return (
            <div className="page-container">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Analytics & Reports</h1>
                    <p className="page-subtitle">Overview of field visits, farmer coverage, crop activity, and recent visit records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-secondary btn-md">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={() => load()} className="btn btn-primary btn-md">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
                This page is for admin reporting on visit activity. It summarizes real visit records created by field agents and shows recent records for review.
            </div>

            {error && (
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={() => load()} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(({ icon: Icon, label, value, accent, gradient, iconBg }) => (
                    <div key={label} className="relative rounded-2xl p-5 overflow-hidden group card-hover cursor-default" style={{ background: gradient, boxShadow: SHADOW }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: accent }} />
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110" style={{ background: iconBg, color: accent }}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">{value}</p>
                        <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[13px] text-gray-500 font-medium">{label}</p>
                            <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Top crops bar ── */}
            {Object.keys(analytics.cropTypes).length > 0 && (
                <div className="section-card">
                    <div className="section-card-header">
                        <div className="flex items-center gap-3">
                            <div className="icon-box"><Leaf className="w-4 h-4" /></div>
                            <div>
                                <h3 className="section-title">Crop Distribution</h3>
                                <p className="section-subtitle">{Object.keys(analytics.cropTypes).length} crop types tracked</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-3">
                        {Object.entries(analytics.cropTypes)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([crop, count]) => {
                                const pct = Math.round((count / analytics.totalVisits) * 100);
                                return (
                                    <div key={crop}>
                                        <div className="flex items-center justify-between text-sm mb-1.5">
                                            <span className="font-medium text-gray-700">{crop}</span>
                                            <span className="text-gray-400 tabular-nums">{count} visits · {pct}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #166534, #22c55e)" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}

            {/* ── Data Table ── */}
            <div className="section-card">
                <div className="section-card-header">
                    <div className="flex items-center gap-3">
                        <div className="icon-box"><BarChart3 className="w-4 h-4" /></div>
                        <div>
                            <h3 className="section-title">Visit Records</h3>
                            <p className="section-subtitle">{filtered.length} records</p>
                        </div>
                    </div>
                    {/* Inline search */}
                    <div className="relative w-56">
                        <input
                            type="text"
                            placeholder="Search records…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="search-input"
                            style={{ paddingLeft: "2.25rem" }}
                        />
                        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                    </div>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Farmer</th>
                                <th>Crop</th>
                                <th>Location</th>
                                <th>Agent</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.slice(0, 50).map((item, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                                #{item.id}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {(item.farmer_name || "F")[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900">{item.farmer_name || "—"}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <Leaf className="w-3 h-3" />{item.crop || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                                {item.location_name || "—"}
                                            </span>
                                        </td>
                                        <td className="text-gray-600">{item.employee || "—"}</td>
                                        <td>
                                            <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                                                <Calendar className="w-3 h-3 text-gray-300" />
                                                {item.visit_date
                                                    ? new Date(item.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                                                    : "—"}
                                            </span>
                                        </td>
                                        <td><StatusBadge status={item.status} /></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-16 text-center">
                                        <div className="empty-state py-0">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                                <BarChart3 className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 50 && (
                    <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400 text-center">
                        Showing first 50 of {filtered.length} records
                    </div>
                )}
            </div>
        </div>
    );
}