import { Link } from "react-router-dom";
import {
  Users,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Clock,
  Radio,
} from "lucide-react";

const ITEMS = [
  { key: "employeesWorking", label: "Employees Working", icon: Users, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
  { key: "employeesOffline", label: "Employees Offline", icon: WifiOff, color: "text-gray-700", bg: "bg-gray-50 border-gray-100" },
  { key: "gpsIssues", label: "GPS Issues", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50 border-red-100" },
  { key: "pendingSyncs", label: "Pending Syncs", icon: RefreshCw, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
  { key: "workdaysExpiringSoon", label: "Workdays Expiring Soon", icon: Clock, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-100" },
];

export default function LiveOperationsPanel({ ops = {} }) {
  return (
    <div className="section-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Live Operations</h3>
          <p className="text-xs text-gray-500">Real-time field workforce status</p>
        </div>
        <Link
          to="/tracking"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg px-2 py-1"
        >
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          Open tracking
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {ITEMS.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className={`rounded-xl border px-3 py-2.5 ${bg}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
              <span className="text-[10px] font-medium text-gray-500 leading-tight">{label}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${color}`}>{ops[key] ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
