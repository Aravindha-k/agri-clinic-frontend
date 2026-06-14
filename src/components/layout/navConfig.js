import {
  LayoutDashboard,
  Users,
  Sprout,
  Leaf,
  AlertTriangle,
  MapPin,
  Route,
  ClipboardCheck,
  BarChart3,
  Bell,
  Database,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";

/** Static nav — shared by Sidebar and GlobalSearch (keeps Fast Refresh stable). */
export const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Employees", icon: Users, path: "/employees" },
      { label: "Farmers", icon: Sprout, path: "/farmers" },
    ],
  },
  {
    label: "Field Operations",
    items: [
      { label: "Visits", icon: Leaf, path: "/visits" },
      { label: "Crop Issues", icon: AlertTriangle, path: "/crop-issues" },
      { label: "Recommendations", icon: ClipboardCheck, path: "/recommendations" },
      { label: "Live Tracking", icon: MapPin, path: "/tracking" },
      { label: "Route History", icon: Route, path: "/tracking/routes" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Masters", icon: Database, path: "/masters" },
      { label: "Reports", icon: BarChart3, path: "/reports" },
      { label: "Notifications", icon: Bell, path: "/notifications" },
      { label: "Audit Log", icon: ShieldCheck, path: "/audit" },
      { label: "Security & Sessions", icon: LockKeyhole, path: "/settings/security" },
    ],
  },
];
