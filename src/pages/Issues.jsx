import { useEffect, useState, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { addRecommendation, getIssues } from "../api/issue.api";
import SlidePanel from "../components/ui/SlidePanel";
import {
    AlertTriangle, Search, X, RefreshCw, ChevronLeft, ChevronRight, AlertCircle,
    TrendingUp, Flame, Leaf, Calendar, User, ClipboardCheck, Send, CheckCircle2,
    Eye, LandPlot, MapPin,
} from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const resolveList = (d) => {
    if (Array.isArray(d)) return d;
    if (d?.results) return d.results;
    if (d?.data) return d.data;
    return [];
};

const fmt = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const humanizeIssueType = (value) => {
    if (!value) return "\u2014";
    return String(value)
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const getVisitId = (issue) => {
    if (typeof issue?.visit === "number" || typeof issue?.visit === "string") return issue.visit;
    return issue?.visit?.id ?? issue?.visit_id ?? null;
};

const getFarmerName = (issue) =>
    issue?.farmer_name || issue?.farmer?.name || issue?.visit?.farmer_name || issue?.visit?.farmer?.name || "\u2014";

const getVillageName = (issue) =>
    issue?.village_name || issue?.village || issue?.farmer?.village || issue?.visit?.village_name || issue?.visit?.village || issue?.visit?.farmer?.village || "\u2014";

const getCropName = (issue) =>
    issue?.crop_name || issue?.crop?.crop_name || issue?.crop?.name || issue?.visit?.crop_name || issue?.visit?.crop?.crop_name || issue?.visit?.crop?.name || "\u2014";

const getIssueCategory = (issue) =>
    humanizeIssueType(
        issue?.issue_title ||
        issue?.problem_category ||
        issue?.issue_type ||
        issue?.visit?.issue_type ||
        issue?.issue?.problem_category ||
        issue?.issue?.issue_type ||
        issue?.visit?.problem_category
    );

const getSeverity = (issue) =>
    issue?.severity || issue?.issue?.severity || "low";

const getStatus = (issue) =>
    issue?.status || issue?.issue?.status || "open";

const getVisitDate = (issue) =>
    issue?.visit_date || issue?.created_at || issue?.timestamp || issue?.visit?.visit_date || issue?.visit?.timestamp || null;

const getAgentName = (issue) =>
    issue?.employee?.name || issue?.reported_by?.name || issue?.reported_by?.username || issue?.assigned_to?.name || issue?.assigned_to?.username || issue?.visit?.employee?.name || "\u2014";

const safeStr = (v) => {
    if (v == null) return "\u2014";
    if (typeof v === "object") return v.name || v.crop_name || v.field_name || v.first_name || v.username || v.label || String(v.id || "\u2014");
    const s = String(v);
    return (s === "-" || s === "") ? "\u2014" : s;
};

const Bone = ({ className = "" }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
const TableSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW }}>
        <div className="p-5 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                <Bone className="w-8 h-8 !rounded-full" /><Bone className="w-28 h-4" /><Bone className="w-20 h-4" /><Bone className="w-16 h-4" /><Bone className="w-20 h-6 rounded-full" />
            </div>
        ))}
    </div>
);

const useCountUp = (target, dur = 900) => {
    const [val, setVal] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const s = prev.current, e = Number(target) || 0;
        if (s === e) { setVal(e); return; }
        const t0 = performance.now();
        let raf;
        const step = (now) => {
            const p = Math.min((now - t0) / dur, 1);
            setVal(Math.round(s + (e - s) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step); else prev.current = e;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, dur]);
    return val;
};

const KpiCard = memo(({ icon: Icon, label, value, accent, gradient, iconBg }) => {
    const animVal = useCountUp(value);
    return (
        <div className="relative rounded-2xl p-5 overflow-hidden group card-hover cursor-default" style={{ background: gradient, boxShadow: SHADOW }}>
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: accent }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110" style={{ background: iconBg, color: accent }}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">{animVal}</p>
            <div className="flex items-center justify-between mt-1.5">
                <p className="text-[13px] text-gray-500 font-medium">{label}</p>
                <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
            </div>
        </div>
    );
});
KpiCard.displayName = "KpiCard";

const SeverityBadge = ({ severity }) => {
    const s = (severity || "").toLowerCase();
    const cfg = {
        high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
        critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
        medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
        low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
    };
    const c = cfg[s] || cfg.low;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{severity || "Low"}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    const norm = (status || "open").toLowerCase().replace(/[\s-]/g, "_");
    const map = {
        resolved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Resolved" },
        closed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Closed" },
        open: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Open" },
        pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Pending" },
        under_review: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "Under Review" },
        in_progress: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "In Progress" },
    };
    const c = map[norm] || map.open;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
        </span>
    );
};

/* ================================================================
   ISSUES PAGE
   ================================================================ */
export default function Issues() {
    const navigate = useNavigate();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [recPanelOpen, setRecPanelOpen] = useState(false);
    const [recTarget, setRecTarget] = useState(null);
    const [recForm, setRecForm] = useState({ fertilizer: "", pesticide: "", dosage: "", notes: "" });
    const [recSaving, setRecSaving] = useState(false);
    const pageSize = 20;

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const raw = await getIssues({ page: 1, page_size: 200 });
            const list = resolveList(raw);
            setIssues(list);
        } catch {
            setError("Failed to load issues.");
            setIssues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    const filteredIssues = issues.filter((issue) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;

        return [
            getFarmerName(issue),
            getVillageName(issue),
            getCropName(issue),
            getIssueCategory(issue),
            issue?.description,
            getAgentName(issue),
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));
    });

    useEffect(() => {
        setTotalPages(Math.max(1, Math.ceil(filteredIssues.length / pageSize)));
    }, [filteredIssues.length]);

    // Paginate client-side since we filter
    const paged = filteredIssues.slice((page - 1) * pageSize, page * pageSize);

    const highCount = filteredIssues.filter((i) => { const s = getSeverity(i).toLowerCase(); return s === "high" || s === "critical"; }).length;
    const openCount = filteredIssues.filter((i) => !["resolved", "closed"].includes(getStatus(i).toLowerCase())).length;

    const openRecommendation = (issue) => {
        setRecTarget(issue);
        setRecForm({ fertilizer: "", pesticide: "", dosage: "", notes: "" });
        setRecPanelOpen(true);
    };

    const submitRecommendation = async () => {
        if (!recTarget) return;
        setRecSaving(true);
        try {
            await addRecommendation(recTarget.id, recForm);
            setRecPanelOpen(false);
            setRecTarget(null);
            fetchIssues();
        } catch {
            // keep panel open on error
        } finally {
            setRecSaving(false);
        }
    };

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Crop Issues</h1>
                    <p className="page-subtitle">Track crop problems and add recommendations</p>
                </div>
                <button onClick={fetchIssues} className="btn btn-primary btn-md">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <KpiCard icon={AlertTriangle} label="Total Issues" value={filteredIssues.length} accent="#dc2626" gradient="linear-gradient(135deg,#fff 0%,#fef2f2 100%)" iconBg="#fee2e2" />
                <KpiCard icon={Flame} label="High Severity" value={highCount} accent="#ea580c" gradient="linear-gradient(135deg,#fff 0%,#fff7ed 100%)" iconBg="#ffedd5" />
                <KpiCard icon={AlertCircle} label="Open Issues" value={openCount} accent="#ca8a04" gradient="linear-gradient(135deg,#fff 0%,#fefce8 100%)" iconBg="#fef9c3" />
                <KpiCard icon={Leaf} label="Unique Crops" value={[...new Set(filteredIssues.map((i) => getCropName(i)).filter((name) => name && name !== "\u2014"))].length} accent="#16a34a" gradient="linear-gradient(135deg,#fff 0%,#f0fdf4 100%)" iconBg="#dcfce7" />
            </div>

            {/* ── Search ── */}
            <div className="filters-bar">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search farmer, crop, problem…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="search-input"
                        />
                        {search && (
                            <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={fetchIssues} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* ── Table ── */}
            {loading ? <TableSkeleton /> : filteredIssues.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-300" />
                        </div>
                        <p className="text-gray-600 font-semibold">No issues found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search.</p>
                    </div>
                </div>
            ) : (
                <div className="section-card">
                    <div className="section-card-header">
                        <div className="flex items-center gap-3">
                            <div className="icon-box"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
                            <div>
                                <h3 className="section-title">Issue Records</h3>
                                <p className="section-subtitle">{filteredIssues.length} issues tracked</p>
                            </div>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {["Farmer", "Village", "Crop", "Issue Category", "Severity", "Status", "Visit Date", "Agent", ""].map((h, i) => (
                                        <th key={i}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map((v, idx) => {
                                    const farmerName = getFarmerName(v);
                                    const visitId = getVisitId(v);
                                    const cropName = getCropName(v);
                                    return (
                                        <tr key={v.id || idx}>
                                            <td>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[11px] font-bold text-white">{farmerName[0]?.toUpperCase() || "F"}</span>
                                                    </div>
                                                    <p className="text-[13px] font-semibold text-gray-900 whitespace-nowrap">{farmerName}</p>
                                                </div>
                                            </td>
                                            <td className="text-gray-500 text-xs">{safeStr(getVillageName(v))}</td>
                                            <td>
                                                {cropName !== "\u2014" ? (
                                                    <span className="badge badge-success text-[11px]">
                                                        <Leaf className="w-3 h-3" /> {safeStr(cropName)}
                                                    </span>
                                                ) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="text-gray-600 text-xs max-w-[180px] truncate">{getIssueCategory(v)}</td>
                                            <td><SeverityBadge severity={getSeverity(v)} /></td>
                                            <td><StatusBadge status={getStatus(v)} /></td>
                                            <td className="text-gray-500 text-xs whitespace-nowrap">{fmt(getVisitDate(v))}</td>
                                            <td className="text-gray-600 text-xs">{getAgentName(v)}</td>
                                            <td>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => visitId && navigate(`/visits/${visitId}`)}
                                                        disabled={!visitId}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View
                                                    </button>
                                                    <button
                                                        onClick={() => openRecommendation(v)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                                                    >
                                                        <Send className="w-3.5 h-3.5" /> Rec
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* ── Pagination ── */}
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="pagination-info">
                            Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
                            <span className="font-semibold text-gray-700">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                                className="pagination-btn">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="pagination-btn">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendation SlidePanel */}
            <SlidePanel open={recPanelOpen} onClose={() => { setRecPanelOpen(false); setRecTarget(null); }} title="Add Recommendation">
                <div className="space-y-5 p-1">
                    {recTarget && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Issue</p>
                            <p className="text-sm font-semibold text-gray-800">{getIssueCategory(recTarget) || "Issue"}</p>
                            <p className="text-xs text-gray-500">
                                {getFarmerName(recTarget) || ""} {getCropName(recTarget) !== "\u2014" ? `• ${getCropName(recTarget)}` : ""}
                                {getSeverity(recTarget) ? ` • ${getSeverity(recTarget)}` : ""}
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Fertilizer</label>
                        <input type="text" value={recForm.fertilizer} onChange={(e) => setRecForm({ ...recForm, fertilizer: e.target.value })}
                            placeholder="e.g. NPK 19:19:19" className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pesticide</label>
                        <input type="text" value={recForm.pesticide} onChange={(e) => setRecForm({ ...recForm, pesticide: e.target.value })}
                            placeholder="e.g. Neem Oil" className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Dosage</label>
                        <input type="text" value={recForm.dosage} onChange={(e) => setRecForm({ ...recForm, dosage: e.target.value })}
                            placeholder="e.g. 5ml per litre" className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                        <textarea value={recForm.notes} onChange={(e) => setRecForm({ ...recForm, notes: e.target.value })}
                            placeholder="Additional notes or instructions…" rows={3}
                            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none" />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button onClick={submitRecommendation} disabled={recSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-sm">
                            <Send className="w-4 h-4" /> {recSaving ? "Saving…" : "Submit & Resolve"}
                        </button>
                        <button onClick={() => { setRecPanelOpen(false); setRecTarget(null); }}
                            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                            Cancel
                        </button>
                    </div>
                </div>
            </SlidePanel>
        </div>
    );
}
