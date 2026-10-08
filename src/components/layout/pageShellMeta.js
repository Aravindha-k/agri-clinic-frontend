/**
 * Fallback shell titles when a page has not published PageHeader chrome yet.
 * PageHeader always wins when present.
 * `icon` + `tone` drive the semantic page-icon well in the shell header.
 */
import {
  LayoutDashboard,
  UsersRound,
  Sprout,
  ClipboardCheck,
  ClipboardList,
  Wheat,
  LocateFixed,
  Route,
  Database,
  MapPin,
  MapPinned,
  Layers,
  ListTree,
  BarChart3,
  Bell,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";

const EXACT = {
  "/dashboard": {
    title: "Dashboard",
    eyebrow: "Operations",
    subtitle: "Real-time operations",
    icon: LayoutDashboard,
    tone: "emerald",
  },
  "/employees": {
    title: "Employees",
    eyebrow: "People",
    subtitle: "Manage and monitor your field team",
    icon: UsersRound,
    tone: "teal",
  },
  "/farmers": {
    title: "Farmers",
    eyebrow: "Registry",
    subtitle: "Farmer registry and field profiles",
    icon: Sprout,
    tone: "emerald",
  },
  "/visits": {
    title: "Visits",
    eyebrow: "Field operations",
    subtitle: "Field visit records",
    icon: ClipboardCheck,
    tone: "emerald",
  },
  "/crop-issues": {
    title: "Crop Directory",
    eyebrow: "Field reference",
    subtitle: "Crop types used when recording field visits",
    icon: Wheat,
    tone: "emerald",
  },
  "/tracking": {
    title: "Live Tracking",
    eyebrow: "Live operations",
    subtitle: "Real-time GPS command center for field operations",
    icon: LocateFixed,
    tone: "cyan",
  },
  "/tracking/routes": {
    title: "Route History",
    eyebrow: "Live operations",
    subtitle: "Employee route timelines",
    icon: Route,
    tone: "cyan",
  },
  "/masters": {
    title: "Master Data",
    eyebrow: "Configuration",
    subtitle: "Crop health, villages, and field territories",
    icon: Database,
    tone: "slate",
  },
  "/masters/locations": {
    title: "Village Master",
    subtitle: "Manage villages used for employee territories, farmers and visits",
    icon: MapPin,
    tone: "cyan",
    crumb: "Master Data",
  },
  "/masters/crops": {
    title: "Crop / Pest / Disease Master",
    subtitle: "Manage crops and their Pest & Disease mappings",
    icon: Wheat,
    tone: "emerald",
    crumb: "Master Data",
  },
  "/masters/problem-categories": {
    title: "Visit Problem Types",
    subtitle: "Pest, Disease, Nutrient Deficiency and Others",
    icon: Layers,
    tone: "slate",
    crumb: "Master Data",
  },
  "/masters/problem-items": {
    title: "Pest, Disease & Nutrient Master",
    subtitle: "Manage Pest, Disease and Nutrient Deficiency master names",
    icon: ListTree,
    tone: "slate",
    crumb: "Master Data",
  },
  "/masters/employee-locations": {
    title: "Employee Territories",
    subtitle: "Assign villages and operational areas to field employees",
    icon: MapPinned,
    tone: "teal",
    crumb: "Master Data",
  },
  "/reports": {
    title: "Analytics & Reports",
    eyebrow: "Business intelligence",
    subtitle: "Field visits, coverage, GPS compliance, and routes",
    icon: BarChart3,
    tone: "indigo",
  },
  "/notifications": {
    title: "Notifications",
    eyebrow: "Alerts",
    subtitle: "All caught up",
    icon: Bell,
    tone: "amber",
  },
  "/audit": {
    title: "System Audit Logs",
    eyebrow: "System",
    subtitle: "Security and change history",
    icon: ShieldCheck,
    tone: "slate",
  },
  "/settings/security": {
    title: "Security & Sessions",
    eyebrow: "System",
    subtitle: "Admin access and active sessions",
    icon: LockKeyhole,
    tone: "slate",
  },
};

export function resolvePageShellMeta(pathname) {
  if (!pathname) return null;
  if (EXACT[pathname]) return EXACT[pathname];

  if (/^\/farmers\/new/.test(pathname)) return { title: "Add Farmer",
    eyebrow: "Registry", subtitle: "Create a farmer profile", icon: Sprout, tone: "emerald" };
  if (/^\/farmers\/[^/]+\/edit/.test(pathname)) return { title: "Edit Farmer",
    eyebrow: "Registry", subtitle: "Update farmer details", icon: Sprout, tone: "emerald" };
  if (/^\/farmers\/[^/]+/.test(pathname)) return { title: "Farmer Detail",
    eyebrow: "Registry", subtitle: "Farmer profile", icon: Sprout, tone: "emerald" };
  if (/^\/visits\/create/.test(pathname)) return { title: "Create Visit",
    eyebrow: "Field operations", subtitle: "Log a field visit", icon: ClipboardCheck, tone: "emerald" };
  if (/^\/visits\/\d+\/edit/.test(pathname)) return { title: "Edit Visit",
    eyebrow: "Field operations", subtitle: "Update visit record", icon: ClipboardCheck, tone: "emerald" };
  if (/^\/visits\/\d+/.test(pathname)) return { title: "Visit Detail",
    eyebrow: "Field operations", subtitle: "Visit report", icon: ClipboardList, tone: "emerald" };
  if (/^\/masters\/crops\/\d+\/problems/.test(pathname)) {
    return {
      title: "Crop / Pest / Disease",
      subtitle: "Manage Pest and Disease mappings",
      icon: Wheat,
      tone: "emerald",
      crumb: "Master Data · Crop / Pest / Disease Master",
    };
  }

  return null;
}
