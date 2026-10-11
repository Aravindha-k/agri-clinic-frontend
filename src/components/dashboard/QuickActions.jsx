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
} from "lucide-react";

const ACTIONS = [
  {
    label: "Live Tracking",
    desc: "GPS map & employee status",
    to: "/tracking",
    icon: MapPin,
    color: "from-emerald-500 to-teal-600",
  },
  {
    label: "Route History",
    desc: "Daily field routes",
    to: "/tracking/routes",
    icon: Route,
    color: "from-indigo-500 to-violet-600",
  },
  {
    label: "Field Visits",
    desc: "Evidence & visit records",
    to: "/visits",
    icon: ClipboardList,
    color: "from-sky-500 to-blue-600",
  },
  {
    label: "Add Farmer",
    desc: "Register new farmer",
    to: "/farmers/new",
    icon: Plus,
    color: "from-amber-500 to-orange-600",
  },
  {
    label: "Employees",
    desc: "Staff & device info",
    to: "/employees",
    icon: Users,
    color: "from-violet-500 to-purple-600",
  },
  {
    label: "Reports",
    desc: "Analytics & exports",
    to: "/reports",
    icon: BarChart3,
    color: "from-rose-500 to-pink-600",
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
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Zap className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        </div>
      </div>
      <div className="dashboard-quick-actions__grid">
        {ACTIONS.map(({ label, desc, to, icon: Icon, color }) => (
          <Link key={to} to={to} className="dashboard-quick-action group">
            <div
              className={`dashboard-quick-action__icon bg-gradient-to-br ${color}`}
            >
              <Icon className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <p className="dashboard-quick-action__label">{label}</p>
              <p className="dashboard-quick-action__desc">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
