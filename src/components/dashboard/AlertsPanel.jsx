import { Link } from "react-router-dom";
import { Bell, AlertTriangle, ChevronRight } from "lucide-react";
import { EmptyState } from "../ui/command";

const SEVERITY = {
  high: "border-red-200 bg-red-50 text-red-800",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  low: "border-sky-200 bg-sky-50 text-sky-900",
};

export default function AlertsPanel({ alerts = [] }) {
  return (
    <div className="section-card overflow-hidden flex flex-col">
      <div className="section-card-header">
        <div className="flex items-center gap-2.5">
          <div className="icon-box">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="section-title">Alerts</h3>
            <p className="section-subtitle">{alerts.length} active signal{alerts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[320px]" style={{ scrollbarWidth: "thin" }}>
        {alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All clear"
            subtitle="No operational alerts right now."
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.href || "/tracking"}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${SEVERITY[alert.severity] || SEVERITY.medium}`}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{alert.title}</p>
                  <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{alert.detail}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-60" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
