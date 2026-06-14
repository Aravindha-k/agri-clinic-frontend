import { PageLoader } from "../components/ui/command";
import { useEffect, useState, useCallback, useRef, memo } from "react";
import { fetchAllIssues, getRecommendations } from "../api/issue.api";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import {
    resolveCropLabel,
    resolveFarmerLabel,
    resolveEmployeeLabel,
    asDisplayString,
} from "../utils/displayValue";
import {
    ClipboardCheck, Search, X, RefreshCw, ChevronLeft, ChevronRight, AlertCircle,
    TrendingUp, Leaf, Calendar, CheckCircle2,
} from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const fmt = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getIssueProblem = (issue) =>
    issue?.issue_title || issue?.issue_type || issue?.problem_category || issue?.description || "\u2014";

const getIssueFarmerName = (issue) =>
    issue?.farmer_name ||
    resolveFarmerLabel(issue?.farmer) ||
    issue?.visit?.farmer_name ||
    resolveFarmerLabel(issue?.visit?.farmer) ||
    "\u2014";

const getIssueCropName = (issue) =>
    issue?.crop_name ||
    resolveCropLabel(issue?.crop) ||
    issue?.visit?.crop_name ||
    resolveCropLabel(issue?.visit?.crop) ||
    "";

const getIssueStatus = (issue) =>
    issue?.status || issue?.issue_status || "";

const Bone = ({ className = "" }) => <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
const TableSkeleton = () => (
    <div className="section-card overflow-hidden" style={{ boxShadow: SHADOW }}>
        <div className="px-3 py-2 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
        {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-50">
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
        <div className="mini-kpi-card group cursor-default" style={{ background: gradient, boxShadow: SHADOW }}>
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: accent }} />
            <div className="mini-kpi-icon" style={{ background: iconBg, color: accent }}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="mini-kpi-value">{animVal}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="mini-kpi-label">{label}</p>
                <TrendingUp className="w-3 h-3 text-gray-300" />
            </div>
        </div>
    );
});
KpiCard.displayName = "KpiCard";

export default function Recommendations() {
    const [recommendations, setRecommendations] = useState([]);
    const [totalRecCount, setTotalRecCount] = useState(0);
    const [issuesById, setIssuesById] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const fetchRecommendations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { page, page_size: pageSize };
            if (search.trim()) params.search = search.trim();
            const [recPage, issueMerged] = await Promise.all([
                getRecommendations(params),
                fetchAllIssues(),
            ]);
            const list = Array.isArray(recPage?.results) ? recPage.results : [];
            const issues = Array.isArray(issueMerged?.results) ? issueMerged.results : [];
            const issueLookup = Object.fromEntries(issues.map((issue) => [String(issue.id), issue]));
            setRecommendations(list);
            setIssuesById(issueLookup);
            const count = typeof recPage?.count === "number" ? recPage.count : list.length;
            setTotalRecCount(count);
            setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
            logApiDiagnostics({
                label: "recommendations-ui",
                url: "/api/v1/recommendations/",
                apiCount: count,
                rowsLoaded: list.length,
                rowsRendered: list.length,
                pagination: { page, page_size: pageSize, search: search.trim() || null },
            });
        } catch (err) {
            setError(err?.message || "Failed to load recommendations.");
            setRecommendations([]);
            setIssuesById({});
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

    const formatRecText = (rec) => {
        const parts = [rec.fertilizer, rec.pesticide, rec.dosage, rec.notes]
            .filter((p) => p && String(p).trim())
            .map((p) => String(p).trim());
        return parts.length > 0 ? parts.join(" · ") : "\u2014";
    };

    const enrichedRecommendations = recommendations.map((rec) => {
        const issueId = rec.issue ?? rec.issue_id;
        const issue = issuesById[String(issueId)] || null;
        return {
            ...rec,
            displayFarmerName:
                rec.farmer_name || rec.visit_farmer_name || getIssueFarmerName(issue),
            displayCropName:
                asDisplayString(rec.crop) !== "\u2014"
                    ? asDisplayString(rec.crop)
                    : rec.crop_name || getIssueCropName(issue) || "\u2014",
            displayProblem:
                rec.issue_name ||
                rec.problem ||
                rec.problem_category ||
                getIssueProblem(issue),
            displayStatus: rec.status || rec.issue_status || getIssueStatus(issue),
            displayRecommendation: formatRecText(rec),
            displayAgent: rec.given_by_name || resolveEmployeeLabel(rec.given_by) || "\u2014",
            displayDate: rec.created_at || issue?.created_at,
        };
    });

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Recommendations</h1>
                    <p className="page-subtitle">All recommendations provided for crop issues</p>
                </div>
                <button onClick={fetchRecommendations} className="btn btn-primary btn-md">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* ── KPI ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={ClipboardCheck} label="Total Recommendations" value={totalRecCount} accent="#166534" gradient="linear-gradient(135deg,#fff 0%,#f0fdf4 100%)" iconBg="#dcfce7" />
                <KpiCard icon={CheckCircle2} label="Issues Resolved" value={enrichedRecommendations.filter((r) => (r.displayStatus || "").toLowerCase() === "resolved").length} accent="#2563eb" gradient="linear-gradient(135deg,#fff 0%,#eff6ff 100%)" iconBg="#dbeafe" />
                <KpiCard icon={Leaf} label="Unique Crops" value={[...new Set(enrichedRecommendations.map((r) => r.displayCropName).filter(Boolean))].length} accent="#ca8a04" gradient="linear-gradient(135deg,#fff 0%,#fefce8 100%)" iconBg="#fef9c3" />
            </div>

            {/* ── Search + filter bar ── */}
            <div className="filters-bar">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search farmer, crop, fertilizer…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="search-input"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); setPage(1); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                            >
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
                    <button onClick={fetchRecommendations} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            )}

            {/* ── Table ── */}
            {loading ? <PageLoader label="Loading recommendations…" /> : enrichedRecommendations.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                            <ClipboardCheck className="w-8 h-8 text-emerald-300" />
                        </div>
                        <p className="text-gray-600 font-semibold">No recommendations found</p>
                        <p className="text-sm text-gray-400 mt-1">Recommendations appear here once added from Crop Issues.</p>
                    </div>
                </div>
            ) : (
                <div className="section-card">
                    <div className="section-card-header">
                        <div className="flex items-center gap-3">
                            <div className="icon-box"><ClipboardCheck className="w-4 h-4" /></div>
                            <div>
                                <h3 className="section-title">Recommendation Records</h3>
                                <p className="section-subtitle">{totalRecCount} total · page {page} of {totalPages}</p>
                            </div>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Farmer / Crop</th>
                                    <th>Problem</th>
                                    <th>Recommendation</th>
                                    <th>Fertilizer</th>
                                    <th>Pesticide</th>
                                    <th>Dosage</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrichedRecommendations.map((rec, idx) => (
                                    <tr key={rec.id || idx}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-gray-900 text-[13px]">
                                                    {rec.displayFarmerName || "—"}
                                                </p>
                                                {rec.displayCropName && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-1">
                                                        <Leaf className="w-2.5 h-2.5" />{rec.displayCropName}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs text-gray-600 leading-relaxed line-clamp-2 max-w-[180px]">
                                                {rec.displayProblem || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="text-xs text-gray-600 leading-relaxed line-clamp-2 max-w-[200px]">
                                                {rec.displayRecommendation || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            {rec.fertilizer ? (
                                                <span className="badge badge-success text-[11px]">{rec.fertilizer}</span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td>
                                            {rec.pesticide ? (
                                                <span className="badge badge-warning text-[11px]">{rec.pesticide}</span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="text-xs text-gray-500">{rec.dosage || "—"}</td>
                                        <td className="text-xs text-gray-400">
                                            {rec.created_at
                                                ? new Date(rec.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="pagination-info">
                            Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
                            <span className="font-semibold text-gray-700">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="pagination-btn"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="pagination-btn"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
