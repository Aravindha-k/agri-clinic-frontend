import { PageLoader, EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { useEffect, useMemo, useState } from "react";
import { getAuditLogs } from "../api/audit.api";
import { ShieldCheck, RefreshCw, Clock, Filter, Search } from "lucide-react";

function resolveList(res) {
    if (Array.isArray(res)) return res;
    const raw = res?.data ?? res;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
}

const getAction = (log) => log?.action || log?.action_type || log?.event || log?.type || "unknown";
const getUser = (log) => {
    if (typeof log?.user === "string") return log.user;
    return log?.user?.name || log?.user?.username || log?.username || log?.performed_by || "System";
};
const getDescription = (log) => log?.description || log?.details || log?.message || log?.note || "—";
const getTimestamp = (log) => log?.timestamp || log?.created_at || log?.date || null;

const ACTION_COLORS = {
    green: "audit-console-action--green",
    blue: "audit-console-action--blue",
    red: "audit-console-action--red",
    amber: "audit-console-action--amber",
    violet: "audit-console-action--violet",
    gray: "audit-console-action--gray",
};

function getActionColor(action) {
    const lowercase = String(action || "").toLowerCase();
    if (lowercase.includes("create") || lowercase.includes("add")) return "green";
    if (lowercase.includes("update") || lowercase.includes("edit")) return "blue";
    if (lowercase.includes("delete") || lowercase.includes("remove")) return "red";
    if (lowercase.includes("view") || lowercase.includes("login")) return "amber";
    return "violet";
}

function AuditStat({ icon: Icon, label, value, accent, iconBg }) {
    return (
        <div className="audit-console-stat">
            <div className="audit-console-stat__accent" style={{ background: accent }} aria-hidden="true" />
            <div className="audit-console-stat__icon" style={{ background: iconBg, color: accent }}>
                <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <p className="audit-console-stat__value">{value}</p>
            <p className="audit-console-stat__label">{label}</p>
        </div>
    );
}

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

    if (loading) {
        return (
            <div className="audit-console page-container">
                <PageLoader label="Loading audit log…" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="audit-console page-container">
                <ErrorRetry message={error} onRetry={load} />
            </div>
        );
    }

    return (
        <div className="audit-console page-container">
            <header className="audit-console-header">
                <div className="audit-console-header__inner">
                    <div className="audit-console-header__brand">
                        <div className="audit-console-header__icon" aria-hidden="true">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="audit-console-header__badge">
                                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                Compliance
                            </span>
                            <h1 className="audit-console-header__title">System Audit Logs</h1>
                            <p className="audit-console-header__subtitle">
                                Monitor system activity and security events across the admin panel
                            </p>
                        </div>
                    </div>
                    <div className="security-suite-header__actions">
                        <button type="button" onClick={load} className="btn btn-primary btn-md">
                            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                        </button>
                    </div>
                </div>
            </header>

            {logs.length === 0 ? (
                <div className="audit-console-timeline-card">
                    <div className="audit-console-empty">
                        <EmptyState
                            icon={Clock}
                            title="No audit logs found"
                            subtitle="System activity logs will appear here as users perform actions across the admin panel."
                        />
                    </div>
                </div>
            ) : (
                <>
                    <div className="audit-console-stats">
                        <AuditStat icon={ShieldCheck} label="Total events" value={logs.length} accent="#166534" iconBg="#dcfce7" />
                        <AuditStat icon={Filter} label="Showing" value={filteredLogs.length} accent="#2563eb" iconBg="#dbeafe" />
                        <AuditStat icon={Clock} label="Action types" value={uniqueActions.length} accent="#7c3aed" iconBg="#ede9fe" />
                    </div>

                    <section className="audit-console-filters" aria-label="Audit filters">
                        <div className="audit-console-filters__row">
                            <div className="security-suite-search flex-1">
                                <Search className="search-icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="search-input"
                                    placeholder="Search user, action, or description…"
                                    aria-label="Search audit logs"
                                />
                            </div>
                            <div className="audit-console-chips">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mr-1">Action</span>
                                <button
                                    type="button"
                                    onClick={() => setFilterLevel("")}
                                    className={`audit-console-chip ${filterLevel === "" ? "audit-console-chip--active" : "audit-console-chip--idle"}`}
                                >
                                    All
                                </button>
                                {uniqueActions.map((action) => (
                                    <button
                                        key={action}
                                        type="button"
                                        onClick={() => setFilterLevel(action)}
                                        className={`audit-console-chip ${filterLevel === action ? "audit-console-chip--active" : "audit-console-chip--idle"}`}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="audit-console-timeline-card">
                        <div className="audit-console-timeline-card__head">
                            <div className="flex items-center gap-3">
                                <div className="list-meta-icon list-meta-icon--crop">
                                    <Clock className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Activity timeline</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{filteredLogs.length} events</p>
                                </div>
                            </div>
                        </div>

                        {filteredLogs.length > 0 ? (
                            <div className="audit-console-table-wrap">
                                <table className="data-table compact-table audit-console-table w-full">
                                    <thead>
                                        <tr>
                                            <th className="w-8" />
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
                                                    <td className="pl-4">
                                                        <span
                                                            className={`w-2 h-2 rounded-full block ${
                                                                actionColor === "green" ? "bg-emerald-500" :
                                                                actionColor === "blue" ? "bg-blue-500" :
                                                                actionColor === "red" ? "bg-red-500" :
                                                                actionColor === "amber" ? "bg-amber-500" :
                                                                actionColor === "violet" ? "bg-violet-500" : "bg-slate-400"
                                                            }`}
                                                            aria-hidden="true"
                                                        />
                                                    </td>
                                                    <td>
                                                        <span className={`audit-console-action ${ACTION_COLORS[actionColor]}`}>
                                                            {action}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="audit-console-user">
                                                            <div className="audit-console-user__avatar" aria-hidden="true">
                                                                {(user || "S")[0].toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-800 truncate">{user}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-500 text-xs max-w-xs truncate">{description}</td>
                                                    <td>
                                                        <span className="text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
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
                            <div className="audit-console-empty">
                                <div className="audit-console-empty__icon">
                                    <Search className="w-5 h-5" aria-hidden="true" />
                                </div>
                                <p className="text-slate-600 font-semibold">No logs match the selected filters</p>
                                <p className="text-sm text-slate-400 mt-1">Try clearing the search or choosing a different action type.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
