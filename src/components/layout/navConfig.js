import {
  LayoutDashboard,
  Users,
  Sprout,
  Leaf,
  Wheat,
  MapPin,
  Route,
  BarChart3,
  Bell,
  Database,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";

/** Static nav — shared by Sidebar (keeps Fast Refresh stable). */
export const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", tone: "emerald" },
      { label: "Employees", icon: Users, path: "/employees", tone: "teal" },
      { label: "Farmers", icon: Sprout, path: "/farmers", tone: "emerald" },
    ],
  },
  {
    label: "Field Operations",
    items: [
      { label: "Visits", icon: Leaf, path: "/visits", tone: "emerald" },
      { label: "Crop Directory", icon: Wheat, path: "/crop-issues", tone: "amber" },
      { label: "Live Tracking", icon: MapPin, path: "/tracking", tone: "cyan" },
      { label: "Route History", icon: Route, path: "/tracking/routes", tone: "cyan" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Masters", icon: Database, path: "/masters", tone: "slate" },
      { label: "Reports", icon: BarChart3, path: "/reports", tone: "indigo" },
      { label: "Notifications", icon: Bell, path: "/notifications", tone: "amber" },
      { label: "Audit Log", icon: ShieldCheck, path: "/audit", ownerOnly: true, tone: "slate" },
      { label: "Security & Sessions", icon: LockKeyhole, path: "/settings/security", ownerOnly: true, tone: "slate" },
    ],
  },
];
