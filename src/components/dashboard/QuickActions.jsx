import { Link } from "react-router-dom";
import {
  MapPin,
  Users,
  Sprout,
  Route,
  BarChart3,
  Plus,
  ClipboardList,
  Zap,
  ChevronRight,
} from "lucide-react";

/* On-brand tint keys → raised-icon-well variants (no off-brand SaaS hues) */
const ACTIONS = [
  {
    label: "Live Tracking",
    desc: "GPS map & employee status",
    to: "/tracking",
    icon: MapPin,
    tint: "emerald",
  },
  {
    label: "Route History",
    desc: "Daily field routes",
    to: "/tracking/routes",
    icon: Route,
    tint: "teal",
  },
  {
    label: "Field Visits",
    desc: "Evidence & visit records",
    to: "/visits",
    icon: ClipboardList,
    tint: "forest",
  },
  {
    label: "Add Farmer",
    desc: "Register new farmer",
    to: "/farmers/new",
    icon: Plus,
    tint: "amber",
  },
  {
    label: "Employees",
    desc: "Staff & device info",
    to: "/employees",
    icon: Users,
    tint: "slate",
  },
  {
    label: "Reports",
    desc: "Analytics & exports",
    to: "/reports",
    icon: BarChart3,
    tint: "emerald",
  },
];

export default function QuickActions() {
  return (
    <div className="dashboard-quick-actions">
      <div className="dashboard-quick-actions__header">
        <div>
          <h3 className="dashboard-quick-actions__title">Quick Actions</h3>
          <p className="dashboard-quick-actions__subtitle">Jump to common operations</p>
        </div>
        <div className="raised-icon-well raised-icon-well--emerald w-9 h-9 !rounded-xl">
          <Zap className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <div className="dashboard-quick-actions__grid">
        {ACTIONS.map(({ label, desc, to, icon: Icon, tint }) => (
          <Link key={to} to={to} className="dashboard-quick-action group">
            <div className={`raised-icon-well raised-icon-well--${tint} dashboard-quick-action__icon`}>
              <Icon className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="dashboard-quick-action__label">{label}</p>
              <p className="dashboard-quick-action__desc">{desc}</p>
            </div>
            <ChevronRight
              className="dashboard-quick-action__arrow w-3.5 h-3.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
