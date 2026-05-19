import { PageLoader } from "../components/ui/command";
import { useEffect, useMemo, useState } from "react";
import { getAuditLogs } from "../api/audit.api";
import { ShieldCheck, RefreshCw, AlertCircle, Clock, Filter, Search } from "lucide-react";

function resolveList(res) {
    if (Array.isArray(res)) return res;
    const raw = res?.data ?? res;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
}

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const getAction = (log) => log?.action || log?.action_type || log?.event || log?.type || "unknown";
const getUser = (log) => {
    if (typeof log?.user === "string") return log.user;
    return log?.user?.name || log?.user?.username || log?.username || log?.performed_by || "System";
};
const getDescription = (log) => log?.description || log?.details || log?.message || log?.note || "-";
const getTimestamp = (log) => log?.timestamp || log?.created_at || log?.date || null;

export default function Audit() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterLevel, setFilterLevel] = useState("");
    const [query, setQuery] = useState("");

    const load = async () => {
        setError(null);
        setLoading(true);
        try {
            const res = await getAuditLogs();
            setData(resolveList(res));
        } catch (err) {
            setError(err.message || "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const logs = Array.isArray(data) ? data : [];
    const uniqueActions = useMemo(
        () => [...new Set(logs.map((log) => getAction(log)).filter((a) => a && a !== "unknown"))],
        [logs]
    );

    const filteredLogs = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return logs.filter((log) => {
            const matchesAction = !filterLevel || getAction(log) === filterLevel;
            if (!matchesAction) return false;
            if (!normalizedQuery) return true;
            return [getAction(log), getUser(log), getDescription(log)]
                .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
        });
    }, [filterLevel, logs, query]);

    const getActionColor = (action) => {
        const lowercase = String(action || "").toLowerCase();
        if (lowercase.includes("create") || lowercase.includes("add")) return "green";
        if (lowercase.includes("update") || lowercase.includes("edit")) return "blue";
        if (lowercase.includes("delete") || lowercase.includes("remove")) return "red";
        if (lowercase.includes("view") || lowercase.includes("login")) return "amber";
        return "violet";
    };

    const colorClasses = {
        green: "bg-emerald-50 text-emerald-700 border-emerald-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        red: "bg-red-50 text-red-700 border-red-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        violet: "bg-violet-50 text-violet-700 border-violet-200",
        gray: "bg-gray-50 text-gray-600 border-gray-200",
    };

    if (loading) {
        return (
            <div className="page-container">
                <PageLoader label="Loading audit log…" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={load} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Audit Logs</h1>
                    <p className="page-subtitle">Monitor system activity and security events</p>
                </div>
                <button onClick={load} className="btn btn-primary btn-md">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {logs.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                            <Clock className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold text-base">No Audit Logs Found</p>
                        <p className="text-sm text-gray-400 mt-1">System activity logs will appear here</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: "Total Events", value: logs.length, accent: "#166534", iconBg: "#dcfce7", icon: ShieldCheck },
                            { label: "Showing", value: filteredLogs.length, accent: "#2563eb", iconBg: "#dbeafe", icon: Filter },
                            { label: "Action Types", value: uniqueActions.length, accent: "#7c3aed", iconBg: "#ede9fe", icon: Clock },
                        ].map(({ label, value, accent, iconBg, icon: Icon }) => (
                            <div key={label} className="mini-kpi-card bg-white cursor-default" style={{ boxShadow: SHADOW, border: "1px solid var(--border-card)" }}>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
                                <div className="mini-kpi-icon" style={{ background: iconBg, color: accent }}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <p className="mini-kpi-value">{value}</p>
                                <p className="mini-kpi-label">{label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="filters-bar">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="search-wrapper">
                                <Search className="search-icon" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="search-input"
                                    placeholder="Search user, action, or description..."
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-xs text-gray-400 font-medium mr-1">Action:</span>
                                <button
                                    onClick={() => setFilterLevel("")}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterLevel === "" ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                >
                                    All
                                </button>
                                {uniqueActions.map((action) => (
                                    <button
                                        key={action}
                                        onClick={() => setFilterLevel(action)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filterLevel === action ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="section-card-header">
                            <div className="flex items-center gap-3">
                                <div className="icon-box"><Clock className="w-4 h-4" /></div>
                                <div>
                                    <h3 className="section-title">Activity Timeline</h3>
                                    <p className="section-subtitle">{filteredLogs.length} events</p>
                                </div>
                            </div>
                        </div>

                        {filteredLogs.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="w-6" />
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>Description</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.map((log, idx) => {
                                            const action = getAction(log);
                                            const actionColor = getActionColor(action);
                                            const user = getUser(log);
                                            const description = getDescription(log);
                                            const timestamp = getTimestamp(log);
                                            return (
                                                <tr key={log.id || idx}>
                                                    <td className="pl-5 pr-0">
                                                        <span className={`w-2 h-2 rounded-full block ${actionColor === "green" ? "bg-emerald-500" :
                                                            actionColor === "blue" ? "bg-blue-500" :
                                                                actionColor === "red" ? "bg-red-500" :
                                                                    actionColor === "amber" ? "bg-amber-500" :
                                                                        actionColor === "violet" ? "bg-violet-500" : "bg-gray-400"
                                                            }`} />
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${colorClasses[actionColor]} text-[11px] capitalize`}>
                                                            {action}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                                {(user || "S")[0].toUpperCase()}
                                                            </div>
                                                            <span className="text-[13px] font-medium text-gray-800">{user}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-gray-500 text-xs max-w-xs truncate">{description}</td>
                                                    <td>
                                                        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                                                            {timestamp
                                                                ? new Date(timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                                                : "-"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">No logs match the selected filters</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
