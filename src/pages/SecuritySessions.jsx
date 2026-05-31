import { useEffect, useMemo, useState } from "react";
import {
  LockKeyhole,
  RefreshCw,
  Clock,
  ShieldAlert,
  Timer,
  Globe,
  Users,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Search,
  FileText,
} from "lucide-react";
import { getAdminSecurity } from "../api/security.api";
import { getAuditLogs } from "../api/audit.api";
import {
  PageHeader,
  PageLoader,
  EmptyState,
  ErrorRetry,
} from "../components/ui/command";
import { friendlyErrorMessage } from "../utils/friendlyError";
import {
  formatSecurityDateTime,
  isSecurityAuditEvent,
} from "../utils/adminSecurity";
import { BRAND } from "../theme/brand";

const BADGE_STYLES = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  muted: "bg-slate-50 text-slate-600 border-slate-200",
};

function PolicyCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div
      className="mini-kpi-card cursor-default"
      style={{
        background: "linear-gradient(135deg,#fff 0%,#f8fafc 100%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: accent }}
      />
      <div className="mini-kpi-icon" style={{ background: `${accent}18`, color: accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="mini-kpi-value">{value}</p>
      <p className="mini-kpi-label">{label}</p>
      {hint && <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function SecurityBadge({ badge }) {
  if (!badge) return null;
  const cls = BADGE_STYLES[badge.tone] ?? BADGE_STYLES.muted;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {badge.label}
    </span>
  );
}

function getAuditAction(log) {
  return log?.action || log?.action_type || log?.event || log?.type || "unknown";
}

function getAuditUser(log) {
  if (typeof log?.user === "string") return log.user;
  return log?.user?.name || log?.user?.username || log?.username || log?.performed_by || "System";
}

function getAuditDescription(log) {
  return log?.description || log?.details || log?.message || log?.note || "—";
}

function getAuditTimestamp(log) {
  return log?.timestamp || log?.created_at || log?.date || null;
}

export default function SecuritySessions() {
  const [security, setSecurity] = useState({ policies: {}, admins: [], auditLogs: [] });
  const [auditFallback, setAuditFallback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getAdminSecurity();
      setSecurity(data);

      if (!data.auditLogs?.length) {
        try {
          const logs = await getAuditLogs();
          setAuditFallback(Array.isArray(logs) ? logs : []);
        } catch {
          setAuditFallback([]);
        }
      } else {
        setAuditFallback([]);
      }
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load security monitoring. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { policies, admins } = security;

  const auditEvents = useMemo(() => {
    const source =
      security.auditLogs?.length > 0 ? security.auditLogs : auditFallback;
    return (source || []).filter(isSecurityAuditEvent);
  }, [security.auditLogs, auditFallback]);

  const filteredAdmins = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (row) =>
        String(row.username || "").toLowerCase().includes(q) ||
        String(row.name || "").toLowerCase().includes(q) ||
        String(row.lastIp || "").toLowerCase().includes(q)
    );
  }, [admins, query]);

  const filteredAudit = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return auditEvents;
    return auditEvents.filter((log) =>
      [getAuditAction(log), getAuditUser(log), getAuditDescription(log)]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [auditEvents, query]);

  const summary = useMemo(() => {
    const locked = admins.filter((a) => a.isLocked).length;
    const activeSessions = admins.reduce((s, a) => s + (a.activeSessions || 0), 0);
    const withFailures = admins.filter((a) => a.failedAttempts > 0).length;
    return { locked, activeSessions, withFailures, total: admins.length };
  }, [admins]);

  if (loading) {
    return (
      <div className="page-container">
        <PageLoader label="Loading security monitoring…" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-4">
      <PageHeader
        title="Security & Sessions"
        subtitle="Admin inactivity timeout, login lockouts, active sessions, and security audit activity"
        badge={
          <span className="command-hero-badge">
            <LockKeyhole className="w-3 h-3" /> Administration
          </span>
        }
        actions={
          <button type="button" onClick={load} className="btn btn-primary btn-md">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      {error && (
        <ErrorRetry
          compact
          message={error}
          onRetry={load}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PolicyCard
          icon={Timer}
          label="Session Timeout"
          value={`${policies.sessionTimeoutMinutes ?? 30} mins`}
          hint="Admin inactivity auto-logout"
          accent={BRAND.primary}
        />
        <PolicyCard
          icon={ShieldAlert}
          label="Failed Attempt Limit"
          value={policies.failedAttemptLimit ?? 5}
          hint="Before temporary lockout"
          accent={BRAND.warning}
        />
        <PolicyCard
          icon={Clock}
          label="Lockout Duration"
          value={`${policies.lockoutDurationMinutes ?? 15} mins`}
          hint="After failed login threshold"
          accent={BRAND.danger}
        />
        <PolicyCard
          icon={Globe}
          label="IP Whitelist"
          value={policies.ipWhitelistEnabled ? "Enabled" : policies.ipWhitelistStatus ?? "Not configured"}
          hint={policies.ipWhitelistEnabled ? "Restricted admin access" : "Open network access"}
          accent={BRAND.info}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--border-card)] bg-white p-4 text-center">
          <p className="text-2xl font-bold text-[var(--brand-primary-dark)] tabular-nums">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">Admin users</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-800 tabular-nums">{summary.activeSessions}</p>
          <p className="text-xs text-emerald-700 mt-1">Active sessions</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-center">
          <p className="text-2xl font-bold text-red-800 tabular-nums">{summary.locked}</p>
          <p className="text-xs text-red-700 mt-1">Locked accounts</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-center">
          <p className="text-2xl font-bold text-amber-800 tabular-nums">{summary.withFailures}</p>
          <p className="text-xs text-amber-700 mt-1">With failed attempts</p>
        </div>
      </div>

      <div className="section-card overflow-hidden">
        <div className="section-card-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="icon-box icon-box--brand">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="section-title">Admin Security Monitor</h3>
              <p className="section-subtitle">Login activity, lockouts, and session status</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTab("users")}
              className={`btn btn-sm ${tab === "users" ? "btn-primary" : "btn-secondary"}`}
            >
              <Users className="w-3.5 h-3.5" /> Admin Users
            </button>
            <button
              type="button"
              onClick={() => setTab("audit")}
              className={`btn btn-sm ${tab === "audit" ? "btn-primary" : "btn-secondary"}`}
            >
              <FileText className="w-3.5 h-3.5" /> Audit Activity
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-50">
          <div className="relative max-w-md">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "users" ? "Search admin users…" : "Search audit events…"}
              className="search-input w-full"
              style={{ paddingLeft: "2.25rem" }}
            />
            <Search className="search-icon w-4 h-4" />
          </div>
        </div>

        {tab === "users" ? (
          filteredAdmins.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No admin users found"
              subtitle="Admin security records appear when backend security monitoring is enabled."
              className="py-12"
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admin User</th>
                    <th>Last Login</th>
                    <th>Last Activity</th>
                    <th>Last IP</th>
                    <th>Failed Attempts</th>
                    <th>Lockout</th>
                    <th>Sessions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((row) => (
                    <tr key={row.id ?? row.username}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900">{row.name}</p>
                          <p className="text-xs text-gray-500">{row.username}</p>
                        </div>
                      </td>
                      <td className="text-xs text-gray-600 tabular-nums">{formatSecurityDateTime(row.lastLogin)}</td>
                      <td className="text-xs text-gray-600 tabular-nums">{formatSecurityDateTime(row.lastActivity)}</td>
                      <td className="text-xs font-mono text-gray-600">{row.lastIp || "—"}</td>
                      <td>
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            row.failedAttempts > 0 ? "text-amber-700" : "text-gray-700"
                          }`}
                        >
                          {row.failedAttempts}
                        </span>
                      </td>
                      <td>
                        {row.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5" /> Locked
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="text-sm font-semibold text-gray-800 tabular-nums">{row.activeSessions}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(row.badges ?? []).map((badge) => (
                            <SecurityBadge key={badge.key} badge={badge} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredAudit.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No security audit events"
            subtitle="Login, logout, password, and admin action logs will appear here."
            className="py-12"
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredAudit.slice(0, 100).map((log, index) => (
              <div key={log.id ?? `${getAuditAction(log)}-${index}`} className="px-6 py-4 flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary-dark)] flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{getAuditAction(log)}</p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">{getAuditUser(log)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{getAuditDescription(log)}</p>
                  <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                    {formatSecurityDateTime(getAuditTimestamp(log))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
