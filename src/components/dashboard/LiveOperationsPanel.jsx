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
  { key: "employeesWorking", label: "Working", icon: Users, color: "text-emerald-800", bg: "bg-emerald-50/80 border-emerald-100" },
  { key: "employeesOffline", label: "Offline", icon: WifiOff, color: "text-slate-700", bg: "bg-slate-50 border-slate-100" },
  { key: "gpsIssues", label: "GPS Issues", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50 border-red-100" },
  { key: "pendingSyncs", label: "Pending Syncs", icon: RefreshCw, color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
  { key: "workdaysExpiringSoon", label: "Expiring Soon", icon: Clock, color: "text-sky-800", bg: "bg-sky-50 border-sky-100" },
];

export default function LiveOperationsPanel({ ops = {} }) {
  return (
    <div className="dashboard-live-ops">
      <div className="dashboard-live-ops__header">
        <div>
          <h3 className="dashboard-quick-actions__title">Live Operations</h3>
          <p className="dashboard-quick-actions__subtitle">Real-time field workforce status</p>
        </div>
        <Link
          to="/tracking"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 transition-colors"
        >
          <Radio className="w-3.5 h-3.5" aria-hidden="true" />
          Open tracking
        </Link>
      </div>
      <div className="dashboard-live-ops__grid">
        {ITEMS.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className={`dashboard-live-ops-metric border ${bg}`}>
            <div className={`dashboard-live-ops-metric__label ${color}`}>
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </div>
            <p className={`dashboard-live-ops-metric__value ${color}`}>{ops[key] ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
