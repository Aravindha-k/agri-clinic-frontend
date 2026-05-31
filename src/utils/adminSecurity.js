import { resolveList } from "./apiUnwrap";

export const DEFAULT_POLICIES = {
  sessionTimeoutMinutes: 30,
  failedAttemptLimit: 5,
  lockoutDurationMinutes: 15,
  ipWhitelistEnabled: false,
  ipWhitelistStatus: "Not configured",
};

const INACTIVITY_WARN_MS = 7 * 24 * 60 * 60 * 1000;

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLockedRow(row = {}) {
  if (row.is_locked === true || row.locked === true) return true;
  const until = parseDate(row.lockout_until ?? row.locked_until);
  return until != null && until.getTime() > Date.now();
}

export function computeSecurityBadges(user, policies = DEFAULT_POLICIES) {
  const badges = [];
  const failedLimit = safeNum(policies.failedAttemptLimit, 5);

  if (user.isLocked) {
    badges.push({ key: "locked", label: "Locked", tone: "danger" });
  }
  if (user.failedAttempts >= Math.max(2, failedLimit - 1)) {
    badges.push({ key: "failed", label: "Multiple failed attempts", tone: "warning" });
  }
  if (user.activeSessions > 0) {
    badges.push({ key: "active", label: "Active session", tone: "success" });
  }

  const lastActivity = parseDate(user.lastActivity);
  if (!lastActivity || Date.now() - lastActivity.getTime() > INACTIVITY_WARN_MS) {
    badges.push({ key: "inactive", label: "No recent activity", tone: "muted" });
  }

  return badges;
}

export function normalizeAdminUser(row, policies = DEFAULT_POLICIES) {
  if (!row || typeof row !== "object") return null;

  const failedAttempts = safeNum(
    row.failed_login_attempts ?? row.failed_attempts ?? row.failed_attempts_count,
    0
  );
  const activeSessions = safeNum(
    row.active_sessions ??
      row.active_session_count ??
      (row.has_active_session ? 1 : 0) ??
      (Array.isArray(row.sessions) ? row.sessions.length : 0),
    0
  );
  const isLocked = isLockedRow(row);

  const user = {
    id: row.id ?? row.user_id ?? row.username ?? row.email,
    username: row.username ?? row.email ?? "—",
    name:
      row.full_name ??
      row.name ??
      ([row.first_name, row.last_name].filter(Boolean).join(" ") || row.username || "—"),
    lastLogin: row.last_login ?? row.last_login_at ?? null,
    lastActivity: row.last_activity ?? row.last_activity_at ?? row.last_seen ?? null,
    lastIp: row.last_ip ?? row.last_login_ip ?? row.ip_address ?? "—",
    failedAttempts,
    isLocked,
    lockoutUntil: row.lockout_until ?? row.locked_until ?? null,
    activeSessions,
  };

  user.badges = computeSecurityBadges(user, policies);
  return user;
}

export function normalizeAdminSecurity(payload) {
  const raw = payload && typeof payload === "object" ? payload : {};
  const policiesRaw = raw.policies ?? raw.settings ?? raw.security_policy ?? raw.config ?? raw;

  const policies = {
    sessionTimeoutMinutes: safeNum(
      policiesRaw.session_timeout_minutes ??
        policiesRaw.session_timeout ??
        policiesRaw.inactivity_timeout_minutes ??
        policiesRaw.admin_inactivity_timeout_minutes,
      DEFAULT_POLICIES.sessionTimeoutMinutes
    ),
    failedAttemptLimit: safeNum(
      policiesRaw.failed_login_limit ??
        policiesRaw.failed_attempt_limit ??
        policiesRaw.max_failed_attempts ??
        policiesRaw.failed_attempt_limit_count,
      DEFAULT_POLICIES.failedAttemptLimit
    ),
    lockoutDurationMinutes: safeNum(
      policiesRaw.lockout_duration_minutes ?? policiesRaw.lockout_minutes,
      DEFAULT_POLICIES.lockoutDurationMinutes
    ),
    ipWhitelistEnabled: Boolean(
      policiesRaw.ip_whitelist_enabled ?? policiesRaw.ip_whitelist?.enabled ?? false
    ),
    ipWhitelistStatus:
      policiesRaw.ip_whitelist_status ??
      (policiesRaw.ip_whitelist_enabled ? "Enabled" : "Disabled"),
  };

  const usersList = resolveList(
    raw.admin_users ?? raw.admins ?? raw.administrators ?? raw.users ?? raw.results
  );
  const admins = usersList.map((row) => normalizeAdminUser(row, policies)).filter(Boolean);

  const auditLogs = resolveList(
    raw.audit_logs ?? raw.security_events ?? raw.recent_audit ?? raw.audit ?? raw.events
  );

  return { policies, admins, auditLogs };
}

export function formatSecurityDateTime(value) {
  const d = parseDate(value);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SECURITY_ACTION_RE =
  /login|logout|password|photo|visit|farmer|employee|lock|session|security|auth/i;

export function isSecurityAuditEvent(log) {
  const action = String(
    log?.action ?? log?.action_type ?? log?.event ?? log?.type ?? ""
  );
  const category = String(log?.category ?? log?.module ?? "");
  return SECURITY_ACTION_RE.test(action) || SECURITY_ACTION_RE.test(category);
}
