/**
 * Fallback shell titles when a page has not published PageHeader chrome yet.
 * PageHeader always wins when present.
 */
const EXACT = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Real-time operations",
  },
  "/employees": {
    title: "Employees",
    subtitle: "Manage and monitor your field team",
  },
  "/farmers": {
    title: "Farmers",
    subtitle: "Farmer registry and field profiles",
  },
  "/visits": {
    title: "Visits",
    subtitle: "Field visit records",
  },
  "/crop-issues": {
    title: "Crop Directory",
    subtitle: "Crop types used when recording field visits",
  },
  "/tracking": {
    title: "Live Tracking",
    subtitle: "Real-time GPS command center for field operations",
  },
  "/tracking/routes": {
    title: "Route History",
    subtitle: "Employee route timelines",
  },
  "/masters": {
    title: "Master Data",
    subtitle: "Crop health, villages, and field territories",
  },
  "/masters/locations": {
    title: "Village Master",
    subtitle: "Manage villages used for employee territories, farmers and visits",
    crumb: "Master Data",
  },
  "/masters/crops": {
    title: "Crop / Pest / Disease Master",
    subtitle: "Manage crops and their Pest & Disease mappings",
    crumb: "Master Data",
  },
  "/masters/problem-categories": {
    title: "Visit Problem Types",
    subtitle: "Pest, Disease, Nutrient Deficiency and Others",
    crumb: "Master Data",
  },
  "/masters/problem-items": {
    title: "Pest, Disease & Nutrient Master",
    subtitle: "Manage Pest, Disease and Nutrient Deficiency master names",
    crumb: "Master Data",
  },
  "/masters/employee-locations": {
    title: "Employee Territories",
    subtitle: "Assign villages and operational areas to field employees",
    crumb: "Master Data",
  },
  "/reports": {
    title: "Analytics & Reports",
    subtitle: "Field visits, coverage, GPS compliance, and routes",
  },
  "/notifications": {
    title: "Notifications",
    subtitle: "All caught up",
  },
  "/audit": {
    title: "System Audit Logs",
    subtitle: "Security and change history",
  },
  "/settings/security": {
    title: "Security & Sessions",
    subtitle: "Admin access and active sessions",
  },
};

export function resolvePageShellMeta(pathname) {
  if (!pathname) return null;
  if (EXACT[pathname]) return EXACT[pathname];

  if (/^\/farmers\/new/.test(pathname)) return { title: "Add Farmer", subtitle: "Create a farmer profile" };
  if (/^\/farmers\/[^/]+\/edit/.test(pathname)) return { title: "Edit Farmer", subtitle: "Update farmer details" };
  if (/^\/farmers\/[^/]+/.test(pathname)) return { title: "Farmer Detail", subtitle: "Farmer profile" };
  if (/^\/visits\/create/.test(pathname)) return { title: "Create Visit", subtitle: "Log a field visit" };
  if (/^\/visits\/\d+\/edit/.test(pathname)) return { title: "Edit Visit", subtitle: "Update visit record" };
  if (/^\/visits\/\d+/.test(pathname)) return { title: "Visit Detail", subtitle: "Visit report" };
  if (/^\/masters\/crops\/\d+\/problems/.test(pathname)) {
    return {
      title: "Crop / Pest / Disease",
      subtitle: "Manage Pest and Disease mappings",
      crumb: "Master Data · Crop / Pest / Disease Master",
    };
  }

  return null;
}
