import { Link } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  RefreshCw,
  LogIn,
  Paperclip,
  Crown,
  ChevronRight,
} from "lucide-react";
import { EmptyState } from "../ui/command";

function formatRelative(d) {
  if (!d) return "No recent activity";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function employeeName(emp) {
  return (
    emp?.employee_name ||
    [emp?.first_name, emp?.last_name].filter(Boolean).join(" ") ||
    emp?.username ||
    "Employee"
  );
}

const METRICS = [
  { key: "activeEmployees", label: "Active Employees", icon: Users, tone: "brand" },
  { key: "gpsIssues", label: "GPS Issues", icon: AlertTriangle, tone: "danger" },
  { key: "pendingSyncs", label: "Pending Syncs", icon: RefreshCw, tone: "warning" },
];

export default function OwnerControlPanel({
  activeEmployees = 0,
  gpsIssues = 0,
  pendingSyncs = 0,
  employees = [],
  recentUploads = [],
}) {
  const metrics = { activeEmployees, gpsIssues, pendingSyncs };

  const loginActivity = [...(employees || [])]
    .map((emp) => ({
      id: emp.user_id ?? emp.id ?? employeeName(emp),
      name: employeeName(emp),
      at: emp.last_seen ?? emp.last_heartbeat ?? emp.last_location_at,
      online:
        String(emp.connection ?? emp.connection_status ?? "").toUpperCase() === "ONLINE" ||
        emp.is_online,
    }))
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 5);

  return (
    <div className="section-card overflow-hidden owner-control-panel">
      <div className="section-card-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="icon-box icon-box--brand">
            <Crown className="w-3.5 h-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="section-title">Owner Control</h3>
            <p className="section-subtitle">Workforce health, sync status & recent field uploads</p>
          </div>
        </div>
        <Link
          to="/tracking"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
        >
          Open tracking <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {METRICS.map(({ key, label, icon: Icon, tone }) => (
            <div key={key} className={`owner-metric owner-metric--${tone}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{metrics[key] ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border-card)] bg-white/80 p-3">
            <div className="flex items-center gap-2 mb-3">
              <LogIn className="w-4 h-4 text-[var(--brand-primary)]" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Last Login Activity
              </h4>
            </div>
            {loginActivity.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Employee login activity appears when staff use the mobile app.
              </p>
            ) : (
              <ul className="space-y-2">
                {loginActivity.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium text-gray-800 truncate">{row.name}</span>
                    <span className="text-gray-500 flex-shrink-0 tabular-nums">
                      {formatRelative(row.at)}
                      {row.online ? (
                        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--brand-success)] align-middle" />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-card)] bg-white/80 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-[var(--brand-accent)]" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Recent Uploads
              </h4>
            </div>
            {recentUploads.length === 0 ? (
              <EmptyState
                icon={Paperclip}
                title="No recent uploads"
                subtitle="Evidence photos and files from field visits will appear here."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2">
                {recentUploads.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-gray-500 truncate">{item.detail}</p>
                    </div>
                    <span className="text-gray-400 flex-shrink-0 tabular-nums">
                      {formatRelative(item.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
