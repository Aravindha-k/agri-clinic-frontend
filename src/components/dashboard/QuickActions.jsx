import { Link } from "react-router-dom";
import {
  MapPin,
  Users,
  Sprout,
  Route,
  BarChart3,
  Plus,
  ClipboardList,
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
    <div className="section-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
          <p className="text-xs text-gray-500">Jump to common operations</p>
        </div>
        <Sprout className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ACTIONS.map(({ label, desc, to, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 group-hover:text-emerald-800">
                {label}
              </p>
              <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
