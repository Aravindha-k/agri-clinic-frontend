/** Human-readable analytics copy for dashboard and reports. */

export function formatVisitCountLabel(count) {
  const n = Number(count) || 0;
  return `${n} Visit${n === 1 ? "" : "s"} Completed`;
}

export function formatVisitShareLabel(pct) {
  return `${pct}% of Total Visits`;
}

export function formatFarmerCountLabel(count) {
  const n = Number(count) || 0;
  return `${n} Farmer${n === 1 ? "" : "s"}`;
}

export function formatCoverageShareLabel(pct) {
  return `${pct}% Coverage`;
}

export function formatGpsComplianceLabel(pct) {
  return `${pct}% Tracking Compliance`;
}

export function formatEvidenceRateLabel(pct) {
  return `${pct}% of Visits With Evidence`;
}

export function formatDistanceKm(km, digits = 1) {
  const n = Number(km);
  if (!Number.isFinite(n)) return "\u2014";
  return `${n.toFixed(digits)} km`;
}

export const ANALYTICS_TOOLTIPS = {
  visitsCompleted:
    "How many field visits this employee completed during the selected period.",
  visitShare:
    "This employee's share of all visits in the selected period.",
  farmerCoverage:
    "Unique farmers served in this village compared with all farmers visited.",
  cropVisits:
    "Number of field visits recorded for this crop in the selected period.",
  gpsCompliance:
    "Share of visits that include GPS coordinates as field location proof.",
  routeDistance:
    "Total distance travelled today based on employee GPS route tracking.",
  routeAverage:
    "Average distance travelled per employee with active route data today.",
  routeTotal:
    "Number of employees with tracked route distance today.",
};
