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
  visit: { icon: ClipboardList, color: "bg-emerald-500" },
  evidence: { icon: Paperclip, color: "bg-violet-500" },
  workday_start: { icon: PlayCircle, color: "bg-sky-500" },
  workday_end: { icon: StopCircle, color: "bg-gray-400" },
  farmer: { icon: Sprout, color: "bg-teal-500" },
};

function formatWhen(d) {
  if (!d) return "\u2014";
  const date = new Date(d);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UnifiedActivityFeed({ events = [] }) {
  return (
    <div className="section-card overflow-hidden flex flex-col">
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
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ maxHeight: 320, scrollbarWidth: "thin" }}
      >
        {events.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            subtitle="Field events will appear here as they happen."
            className="py-8"
          />
        ) : (
          <div className="space-y-1">
            {events.map((ev, i) => {
              const cfg = TYPE_CFG[ev.type] || TYPE_CFG.visit;
              const Icon = cfg.icon;
              const lineColor = i < events.length - 1 ? "border-gray-200" : "border-transparent";
              return (
                <div
                  key={ev.id}
                  className={`relative pl-7 pb-3 border-l-2 ${lineColor} ml-1`}
                >
                  <div
                    className={`absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full ${cfg.color} ring-[3px] ring-white shadow-sm`}
                  />
                  <div className="rounded-xl p-3 hover:bg-gray-50/80 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 pl-5">{ev.detail}</p>
                    <p className="text-[11px] text-gray-400 mt-1 pl-5">{formatWhen(ev.at)}</p>
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
