import {
  ClipboardList,
  Paperclip,
  PlayCircle,
  StopCircle,
  Sprout,
  Clock,
} from "lucide-react";
import { EmptyState } from "../ui/command";

const TYPE_CFG = {
  visit: { icon: ClipboardList, color: "bg-emerald-500", avatarBg: "linear-gradient(135deg, #16a34a, #0d9488)" },
  evidence: { icon: Paperclip, color: "bg-violet-500", avatarBg: "linear-gradient(135deg, #7c3aed, #6366f1)" },
  workday_start: { icon: PlayCircle, color: "bg-sky-500", avatarBg: "linear-gradient(135deg, #0284c7, #0ea5e9)" },
  workday_end: { icon: StopCircle, color: "bg-slate-400", avatarBg: "linear-gradient(135deg, #64748b, #94a3b8)" },
  farmer: { icon: Sprout, color: "bg-teal-500", avatarBg: "linear-gradient(135deg, #0d9488, #14b8a6)" },
};

function formatWhen(d) {
  if (!d) return "\u2014";
  const date = new Date(d);
  const now = Date.now();
  const ms = now - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAbsolute(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UnifiedActivityFeed({ events = [] }) {
  return (
    <div className="dashboard-section-card flex flex-col">
      <div className="section-card-header">
        <div className="flex items-center gap-2.5">
          <div className="icon-box">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="section-title">Recent Activity</h3>
            <p className="section-subtitle">Visits, evidence, workdays & registrations</p>
          </div>
        </div>
      </div>
      <div className="dashboard-timeline__scroll">
        {events.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            subtitle="Field events will appear here as they happen."
            className="py-10"
          />
        ) : (
          <div className="dashboard-timeline">
            {events.map((ev) => {
              const cfg = TYPE_CFG[ev.type] || TYPE_CFG.visit;
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="dashboard-timeline-item">
                  <div className={`dashboard-timeline-dot ${cfg.color}`} aria-hidden="true" />
                  <div className="dashboard-timeline-card">
                    <div className="dashboard-timeline-card__head">
                      <div
                        className="dashboard-timeline-avatar dashboard-timeline-avatar--icon"
                        style={{ background: cfg.avatarBg }}
                        aria-hidden="true"
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                      </div>
                      <p className="dashboard-timeline-card__title">{ev.title}</p>
                    </div>
                    <p className="dashboard-timeline-card__detail">{ev.detail}</p>
                    <div className="dashboard-timeline-card__time">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      <span className="dashboard-timeline-card__time-strong">{formatWhen(ev.at)}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>{formatAbsolute(ev.at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
