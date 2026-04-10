// Robust helper to extract array from any API response
function resolveList(res) {
    if (Array.isArray(res)) return res;
    const raw = res?.data ?? res;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
}
import { useEffect, useState } from "react";
import { getAuditLogs } from "../api/audit.api";
import { ShieldCheck, RefreshCw, AlertCircle, Clock, Filter, Search } from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

const getAction = (log) => log?.action || log?.action_type || log?.event || log?.type || "unknown";
const getUser = (log) => {
    if (typeof log?.user === "string") return log.user;
    return log?.user?.name || log?.user?.username || log?.username || log?.performed_by || "System";
};
const getDescription = (log) => log?.description || log?.details || log?.message || log?.note || "—";
const getTimestamp = (log) => log?.timestamp || log?.created_at || log?.date || null;

export default function Audit() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterLevel, setFilterLevel] = useState("");

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

    const isArray = Array.isArray(data);
    const logs = isArray ? data : [];
    const filteredLogs = filterLevel ? logs.filter((log) => getAction(log) === filterLevel) : logs;
    const uniqueActions = [...new Set(logs.map((log) => getAction(log)).filter((a) => a && a !== "unknown"))];

    const getActionColor = (action) => {
        if (!action) return 'gray';
        const lowercase = action.toLowerCase();
        if (lowercase.includes('create') || lowercase.includes('add')) return 'green';
        if (lowercase.includes('update') || lowercase.includes('edit')) return 'blue';
        if (lowercase.includes('delete') || lowercase.includes('remove')) return 'red';
        if (lowercase.includes('view') || lowercase.includes('login')) return 'amber';
        return 'violet';
    };

    const colorClasses = {
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        violet: 'bg-violet-50 text-violet-700 border-violet-200',
        gray: 'bg-gray-50 text-gray-600 border-gray-200'
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={() => load()} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Audit Logs</h1>
                    <p className="page-subtitle">Monitor all system activities and security events</p>
                </div>
                <button onClick={() => load()} className="btn btn-primary btn-md">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {logs.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                            <Clock className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold text-base">No Audit Logs Found</p>
                        <p className="text-sm text-gray-400 mt-1">System activity logs will appear here</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ── Stats row ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: "Total Events", value: logs.length, accent: "#166534", iconBg: "#dcfce7", icon: ShieldCheck },
                            { label: "Showing", value: filteredLogs.length, accent: "#2563eb", iconBg: "#dbeafe", icon: Filter },
                            { label: "Action Types", value: uniqueActions.length, accent: "#7c3aed", iconBg: "#ede9fe", icon: Clock },
                        ].map(({ label, value, accent, iconBg, icon: Icon }) => (
                            <div key={label} className="relative rounded-2xl p-5 overflow-hidden bg-white card-hover cursor-default" style={{ boxShadow: SHADOW }}>
                                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
                                <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.05]" style={{ background: accent }} />
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg, color: accent }}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <p className="text-[26px] font-bold text-gray-900 tabular-nums leading-none">{value}</p>
                                <p className="text-sm text-gray-500 font-medium mt-1.5">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Filter pills ── */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-400 font-medium mr-1">Filter by action:</span>
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

                    {/* ── Timeline table ── */}
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
                                                <tr key={idx}>
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
                                                    <td className="text-gray-500 text-xs max-w-xs truncate">
                                                        {description}
                                                    </td>
                                                    <td>
                                                        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                                                            {timestamp
                                                                ? new Date(timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                                                : "—"}
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
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                    <Search className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">No logs match the selected filter</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}