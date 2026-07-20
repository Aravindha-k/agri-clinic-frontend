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

const BADGE_CLASS = {
  danger: "security-suite-badge--danger",
  warning: "security-suite-badge--warning",
  success: "security-suite-badge--success",
  muted: "security-suite-badge--muted",
};

function PolicyCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className="security-suite-policy">
      <div className="security-suite-policy__accent" style={{ background: accent }} aria-hidden="true" />
      <div className="security-suite-policy__head">
        <div className="security-suite-policy__icon" style={{ background: `${accent}18`, color: accent }}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="security-suite-policy__value">{value}</p>
        </div>
      </div>
      <p className="security-suite-policy__label">{label}</p>
      {hint && <p className="security-suite-policy__hint">{hint}</p>}
    </div>
  );
}

function SecurityBadge({ badge }) {
  if (!badge) return null;
  const cls = BADGE_CLASS[badge.tone] ?? BADGE_CLASS.muted;
  return <span className={`security-suite-badge ${cls}`}>{badge.label}</span>;
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

function SessionCard({ row }) {
  const initial = (row.name || row.username || "A")[0].toUpperCase();
  return (
    <article className={`security-suite-session-card ${row.isLocked ? "security-suite-session-card--locked" : ""}`}>
      <div className="security-suite-session-card__head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="security-suite-session-card__avatar" aria-hidden="true">{initial}</div>
          <div className="min-w-0">
            <p className="security-suite-session-card__name">{row.name}</p>
            <p className="security-suite-session-card__user">{row.username}</p>
          </div>
        </div>
        {row.isLocked && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Locked
          </span>
        )}
      </div>
      <div className="security-suite-session-card__grid">
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Last login</p>
          <p className="security-suite-session-card__metric-value">{formatSecurityDateTime(row.lastLogin)}</p>
        </div>
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Last activity</p>
          <p className="security-suite-session-card__metric-value">{formatSecurityDateTime(row.lastActivity)}</p>
        </div>
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Last IP</p>
          <p className="security-suite-session-card__metric-value font-mono">{row.lastIp || "—"}</p>
        </div>
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Active sessions</p>
          <p className="security-suite-session-card__metric-value">{row.activeSessions}</p>
        </div>
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Failed attempts</p>
          <p className={`security-suite-session-card__metric-value ${row.failedAttempts > 0 ? "text-amber-700" : ""}`}>
            {row.failedAttempts}
          </p>
        </div>
        <div className="security-suite-session-card__metric">
          <p className="security-suite-session-card__metric-label">Lockout</p>
          <p className="security-suite-session-card__metric-value">
            {row.isLocked ? "Active" : "—"}
          </p>
        </div>
      </div>
      {(row.badges ?? []).length > 0 && (
        <div className="security-suite-session-card__badges">
          {row.badges.map((badge) => (
            <SecurityBadge key={badge.key} badge={badge} />
          ))}
        </div>
      )}
    </article>
  );
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
      <div className="security-suite page-container">
        <PageLoader label="Loading security monitoring…" />
      </div>
    );
  }

  return (
    <div className="security-suite page-container">
      <header className="security-suite-header">
        <div className="security-suite-header__inner">
          <div className="security-suite-header__brand">
            <div className="security-suite-header__icon" aria-hidden="true">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="security-suite-header__badge">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                Administration
              </span>
              <h1 className="security-suite-header__title">Security &amp; Sessions</h1>
              <p className="security-suite-header__subtitle">
                Admin inactivity timeout, login lockouts, active sessions, and security audit activity
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

      {error && (
        <ErrorRetry compact message={error} onRetry={load} />
      )}

      <div className="security-suite-policy-grid">
        <PolicyCard
          icon={Timer}
          label="Session timeout"
          value={`${policies.sessionTimeoutMinutes ?? 30} mins`}
          hint="Admin inactivity auto-logout"
          accent={BRAND.primary}
        />
        <PolicyCard
          icon={ShieldAlert}
          label="Failed attempt limit"
          value={policies.failedAttemptLimit ?? 5}
          hint="Before temporary lockout"
          accent={BRAND.warning}
        />
        <PolicyCard
          icon={Clock}
          label="Lockout duration"
          value={`${policies.lockoutDurationMinutes ?? 15} mins`}
          hint="After failed login threshold"
          accent={BRAND.danger}
        />
        <PolicyCard
          icon={Globe}
          label="IP whitelist"
          value={policies.ipWhitelistEnabled ? "Enabled" : policies.ipWhitelistStatus ?? "Not configured"}
          hint={policies.ipWhitelistEnabled ? "Restricted admin access" : "Open network access"}
          accent={BRAND.info}
        />
      </div>

      <section className="security-suite-status-strip" aria-label="Security status summary">
        <div className="security-suite-status-strip__inner">
          <p className="security-suite-status-strip__label">Live security status</p>
          <div className="security-suite-status-strip__grid">
            <div className="security-suite-status-cell">
              <p className="security-suite-status-cell__value">{summary.total}</p>
              <p className="security-suite-status-cell__label">Admin users</p>
            </div>
            <div className="security-suite-status-cell">
              <p className="security-suite-status-cell__value">{summary.activeSessions}</p>
              <p className="security-suite-status-cell__label">Active sessions</p>
            </div>
            <div className="security-suite-status-cell">
              <p className="security-suite-status-cell__value">{summary.locked}</p>
              <p className="security-suite-status-cell__label">Locked accounts</p>
            </div>
            <div className="security-suite-status-cell">
              <p className="security-suite-status-cell__value">{summary.withFailures}</p>
              <p className="security-suite-status-cell__label">With failed attempts</p>
            </div>
          </div>
        </div>
      </section>

      <div className="security-suite-panel">
        <div className="security-suite-panel__head">
          <div className="flex items-center gap-3 min-w-0">
            <div className="list-meta-icon list-meta-icon--crop">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="security-suite-panel__title">Admin security monitor</h3>
              <p className="security-suite-panel__subtitle">Login activity, lockouts, and session status</p>
            </div>
          </div>
          <div className="security-suite-tabs">
            <button
              type="button"
              onClick={() => setTab("users")}
              className={`security-suite-tab ${tab === "users" ? "security-suite-tab--active" : "security-suite-tab--idle"}`}
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" /> Admin users
            </button>
            <button
              type="button"
              onClick={() => setTab("audit")}
              className={`security-suite-tab ${tab === "audit" ? "security-suite-tab--active" : "security-suite-tab--idle"}`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Audit activity
            </button>
          </div>
        </div>

        <div className="security-suite-filters">
          <div className="security-suite-search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "users" ? "Search admin users…" : "Search audit events…"}
              className="search-input"
              aria-label={tab === "users" ? "Search admin users" : "Search audit events"}
            />
          </div>
        </div>

        {tab === "users" ? (
          filteredAdmins.length === 0 ? (
            <div className="security-suite-empty">
              <EmptyState
                icon={Users}
                title="No admin users found"
                subtitle="Admin security records appear when backend security monitoring is enabled."
              />
            </div>
          ) : (
            <div className="security-suite-session-grid">
              {filteredAdmins.map((row) => (
                <SessionCard key={row.id ?? row.username} row={row} />
              ))}
            </div>
          )
        ) : filteredAudit.length === 0 ? (
          <div className="security-suite-empty">
            <EmptyState
              icon={Activity}
              title="No security audit events"
              subtitle="Login, logout, password, and admin action logs will appear here."
            />
          </div>
        ) : (
          <div className="security-suite-activity">
            {filteredAudit.slice(0, 100).map((log, index) => (
              <div key={log.id ?? `${getAuditAction(log)}-${index}`} className="security-suite-activity__item">
                <div className="security-suite-activity__icon" aria-hidden="true">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="security-suite-activity__action">{getAuditAction(log)}</p>
                    <span className="text-xs text-slate-300" aria-hidden="true">•</span>
                    <p className="security-suite-activity__user">{getAuditUser(log)}</p>
                  </div>
                  <p className="security-suite-activity__desc">{getAuditDescription(log)}</p>
                  <p className="security-suite-activity__time">
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
