import { resolveVisitAttachmentCount } from "./visitAttachments";
import { visitEmployeeLabel } from "./visitFarmer";

const THIRTY_MIN = 30 * 60 * 1000;
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

function minutesSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 60000) : null;
}

function employeeName(row) {
  return (
    row?.employee_name ||
    [row?.first_name, row?.last_name].filter(Boolean).join(" ") ||
    row?.username ||
    "Employee"
  );
}

/** Live operations counters for dashboard command center. */
export function buildLiveOpsStats(stats = {}, employees = [], workdays = []) {
  const working = Number(stats.workingNow ?? stats.working_now ?? 0);
  const online = Number(stats.onlineNow ?? stats.online ?? 0);
  const offline = Number(
    stats.offlineNow ?? stats.offline ?? Math.max(0, working - online)
  );
  const gpsIssues = Number(stats.gpsIssues ?? stats.gps_issues ?? 0);

  let pendingSyncs = 0;
  let expiringSoon = 0;

  (employees || []).forEach((emp) => {
    const isWorking =
      String(emp.work_status ?? "").toUpperCase() === "WORKING" || emp.is_working;
    const isOnline =
      String(emp.connection ?? emp.connection_status ?? "").toUpperCase() === "ONLINE" ||
      emp.is_online;
    const lastSeen = emp.last_seen ?? emp.last_heartbeat ?? emp.last_location_at;
    const mins = minutesSince(lastSeen);

    if (isWorking && (!isOnline || (mins != null && mins >= 15))) {
      pendingSyncs += 1;
    }
  });

  const now = Date.now();
  (workdays || []).forEach((wd) => {
    const active = wd.status === "active" || (!wd.end_time && wd.start_time);
    if (!active || !wd.start_time) return;
    const elapsed = now - new Date(wd.start_time).getTime();
    if (elapsed >= EIGHT_HOURS && elapsed < EIGHT_HOURS + 60 * 60 * 1000) {
      expiringSoon += 1;
    }
  });

  return {
    employeesWorking: working,
    employeesOffline: offline,
    gpsIssues,
    pendingSyncs,
    workdaysExpiringSoon: expiringSoon,
  };
}

/** Operational alerts derived from tracking + workday data. */
export function buildOpsAlerts(employees = [], workdays = []) {
  const alerts = [];

  (employees || []).forEach((emp) => {
    const name = employeeName(emp);
    const isWorking =
      String(emp.work_status ?? "").toUpperCase() === "WORKING" || emp.is_working;
    const isOnline =
      String(emp.connection ?? emp.connection_status ?? "").toUpperCase() === "ONLINE" ||
      emp.is_online;
    const lastSeen = emp.last_seen ?? emp.last_heartbeat ?? emp.last_location_at;
    const mins = minutesSince(lastSeen);
    const gpsEnabled = emp.gps_enabled !== false && String(emp.gps_status ?? "").toLowerCase() !== "off";

    if (isWorking && mins != null && mins >= 30 && !isOnline) {
      alerts.push({
        id: `gps-off-${emp.user_id ?? emp.id}`,
        severity: "high",
        title: "GPS silent > 30 min",
        detail: `${name} — last seen ${mins}m ago during active workday`,
        href: "/tracking",
      });
    }

    if (isWorking && !isOnline) {
      alerts.push({
        id: `offline-work-${emp.user_id ?? emp.id}`,
        severity: "medium",
        title: "Offline during workday",
        detail: `${name} is working but GPS shows offline`,
        href: "/tracking",
      });
    }

    if (isWorking && gpsEnabled === false) {
      alerts.push({
        id: `gps-disabled-${emp.user_id ?? emp.id}`,
        severity: "high",
        title: "GPS disabled",
        detail: `${name} has GPS turned off while working`,
        href: "/tracking",
      });
    }

    if (emp.session_conflict || emp.multiple_sessions) {
      alerts.push({
        id: `session-${emp.user_id ?? emp.id}`,
        severity: "medium",
        title: "Session conflict",
        detail: `${name} may have multiple active sessions`,
        href: "/employees",
      });
    }
  });

  (workdays || []).forEach((wd) => {
    const status = String(wd.status ?? wd.work_status ?? "").toUpperCase();
    const name = employeeName(wd.employee ?? wd);
    if (status === "AUTO_ENDED" || status === "AUTO_END") {
      alerts.push({
        id: `auto-end-${wd.id}`,
        severity: "low",
        title: "Workday auto-ended",
        detail: `${name}'s workday was closed automatically`,
        href: "/tracking",
      });
    }
  });

  return alerts.slice(0, 12);
}

/** Merge visits, workdays, and evidence into a unified activity feed. */
export function buildUnifiedActivityFeed({ workdays = [], visits = [], farmers = [] } = {}) {
  const events = [];

  (visits || []).slice(0, 20).forEach((v) => {
    if (!v) return;
    const when = v.visit_date ?? v.created_at;
    const attachments = resolveVisitAttachmentCount(v);
    events.push({
      id: `visit-${v.id ?? when ?? Math.random()}`,
      type: "visit",
      title: "New field visit",
      detail: `${v.farmer_name || "Farmer"} · ${visitEmployeeLabel(v)}`,
      at: when,
    });
    if (attachments > 0) {
      events.push({
        id: `evidence-${v.id}`,
        type: "evidence",
        title: "Evidence uploaded",
        detail: `${attachments} file${attachments === 1 ? "" : "s"} on visit #${v.id}`,
        at: when,
      });
    }
  });

  (workdays || []).slice(0, 15).forEach((wd) => {
    if (!wd) return;
    const name = employeeName(wd.employee ?? wd);
    if (wd.start_time) {
      events.push({
        id: `wd-start-${wd.id}`,
        type: "workday_start",
        title: "Workday started",
        detail: name,
        at: wd.start_time,
      });
    }
    if (wd.end_time) {
      events.push({
        id: `wd-end-${wd.id}`,
        type: "workday_end",
        title: "Workday ended",
        detail: name,
        at: wd.end_time,
      });
    }
  });

  (farmers || []).slice(0, 5).forEach((f) => {
    if (!f?.created_at) return;
    events.push({
      id: `farmer-${f.id}`,
      type: "farmer",
      title: "Farmer registered",
      detail: f.name || f.farmer_name || "New farmer",
      at: f.created_at,
    });
  });

  return events
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 15);
}
