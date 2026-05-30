import { resolveVisitAttachmentCount } from "./visitAttachments";

const THIRTY_MIN_MS = 30 * 60 * 1000;

function parseVisitDate(item) {
  const raw = item?.visit_date ?? item?.created_at ?? item?.timestamp ?? item?.start_time;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Filter visit rows by inclusive date range (YYYY-MM-DD strings). */
export function filterVisitsByDateRange(rows, from, to) {
  if (!from && !to) return rows;
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;
  return (rows || []).filter((item) => {
    const d = parseVisitDate(item);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/** GPS compliance analytics with incident counts. */
export function buildGpsComplianceAnalytics(visits, employees = []) {
  const base = buildVisitReportAnalytics(visits);
  let gpsDisabledIncidents = 0;
  let trackingUptimePct = 100;

  (employees || []).forEach((emp) => {
    const isWorking =
      String(emp.work_status ?? "").toUpperCase() === "WORKING" || emp.is_working;
    if (!isWorking) return;
    const isOnline =
      String(emp.connection ?? emp.connection_status ?? "").toUpperCase() === "ONLINE" ||
      emp.is_online;
    const lastSeen = emp.last_seen ?? emp.last_heartbeat;
    const silent =
      lastSeen && Date.now() - new Date(lastSeen).getTime() >= THIRTY_MIN_MS;
    if (!isOnline || silent) gpsDisabledIncidents += 1;
  });

  const workingCount = (employees || []).filter(
    (e) => String(e.work_status ?? "").toUpperCase() === "WORKING" || e.is_working
  ).length;
  if (workingCount > 0) {
    trackingUptimePct = Math.max(
      0,
      Math.round(((workingCount - gpsDisabledIncidents) / workingCount) * 100)
    );
  }

  return {
    ...base,
    gpsDisabledIncidents,
    trackingUptimePct,
  };
}

/** Route analytics from geo employee features. */
export function buildRouteAnalytics(routeDistances = []) {
  const rows = Array.isArray(routeDistances) ? routeDistances.filter((r) => r.km > 0) : [];
  const totalKm = rows.reduce((s, r) => s + r.km, 0);
  const sorted = [...rows].sort((a, b) => b.km - a.km);
  const topDistance = sorted[0] ?? null;
  const avgKm = rows.length ? totalKm / rows.length : 0;
  return {
    totalKm,
    avgKm,
    topDistance,
    mostActive: sorted.slice(0, 5),
    employeeCount: rows.length,
  };
}

/** Aggregate visit rows for admin reports dashboards. */
export function buildVisitReportAnalytics(visits) {
  const rows = Array.isArray(visits) ? visits : [];
  const visitsByEmployee = {};
  const farmerSet = new Set();
  const villageSet = new Set();
  const cropTypes = {};
  let gpsCompliant = 0;
  let withAttachments = 0;
  let attachmentTotal = 0;

  rows.forEach((item) => {
    const emp = item.employee || item.employee_name || "Unknown";
    visitsByEmployee[emp] = (visitsByEmployee[emp] || 0) + 1;

    if (item.farmer_name) farmerSet.add(item.farmer_name);
    if (item.location_name) villageSet.add(item.location_name);
    if (item.crop) cropTypes[item.crop] = (cropTypes[item.crop] || 0) + 1;

    const lat = item.latitude ?? item.lat;
    const lng = item.longitude ?? item.lng;
    if (lat != null && lng != null && String(lat) !== "" && String(lng) !== "") {
      gpsCompliant += 1;
    }

    const ac = resolveVisitAttachmentCount(item);
    const count =
      typeof ac === "number" && Number.isFinite(ac)
        ? ac
        : Array.isArray(item.attachments)
          ? item.attachments.length
          : 0;
    if (count > 0) {
      withAttachments += 1;
      attachmentTotal += count;
    }
  });

  const total = rows.length;
  return {
    totalVisits: total,
    totalFarmers: farmerSet.size,
    villagesCovered: villageSet.size,
    cropTypes,
    visitsByEmployee,
    gpsCompliancePct: total ? Math.round((gpsCompliant / total) * 100) : 0,
    gpsCompliant,
    visitsWithEvidence: withAttachments,
    attachmentTotal,
    evidenceRatePct: total ? Math.round((withAttachments / total) * 100) : 0,
  };
}

/** Top N entries from count map sorted desc. */
export function topEntries(countMap, limit = 8) {
  return Object.entries(countMap || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}

export function exportVisitsCsv(rows, filename = "agri-visits-report.csv") {
  if (!rows?.length) return;
  const headers = ["ID", "Farmer", "Crop", "Location", "Employee", "Date", "Status"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.farmer_name,
        r.crop,
        r.location_name,
        r.employee,
        r.visit_date,
        r.status,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/** Excel-compatible export (UTF-8 BOM + tab-separated). */
export function exportVisitsExcel(rows, filename = "agri-visits-report.xls") {
  if (!rows?.length) return;
  const headers = ["ID", "Farmer", "Crop", "Location", "Employee", "Date", "Status"];
  const lines = [
    headers.join("\t"),
    ...rows.map((r) =>
      [r.id, r.farmer_name, r.crop, r.location_name, r.employee, r.visit_date, r.status]
        .map((v) => String(v ?? "").replace(/\t/g, " "))
        .join("\t")
    ),
  ];
  const blob = new Blob(["\ufeff", lines.join("\n")], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
