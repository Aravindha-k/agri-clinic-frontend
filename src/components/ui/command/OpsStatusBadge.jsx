/**
 * Workday / tracking / GPS / issue status — NOT visit workflow status.
 */
const PRESETS = {
  online: { c: "bg-emerald-50 text-emerald-700 border-emerald-200", d: "bg-emerald-500", label: "Online" },
  offline: { c: "bg-slate-50 text-slate-600 border-slate-200", d: "bg-slate-400", label: "Offline" },
  working: { c: "bg-emerald-50 text-emerald-800 border-emerald-200", d: "bg-emerald-500", label: "Working" },
  active: { c: "bg-sky-50 text-sky-800 border-sky-200", d: "bg-sky-500", label: "Active" },
  completed: { c: "bg-emerald-50 text-emerald-700 border-emerald-100", d: "bg-emerald-500", label: "Completed" },
  verified: { c: "bg-emerald-50 text-emerald-700 border-emerald-100", d: "bg-emerald-500", label: "Verified" },
  in_progress: { c: "bg-sky-50 text-sky-700 border-sky-200", d: "bg-sky-500", label: "In Progress" },
  open: { c: "bg-amber-50 text-amber-800 border-amber-200", d: "bg-amber-500", label: "Open" },
  resolved: { c: "bg-emerald-50 text-emerald-700 border-emerald-200", d: "bg-emerald-500", label: "Resolved" },
  closed: { c: "bg-slate-50 text-slate-600 border-slate-200", d: "bg-slate-400", label: "Closed" },
  gps_off: { c: "bg-red-50 text-red-700 border-red-200", d: "bg-red-500", label: "GPS Off" },
  gps_on: { c: "bg-emerald-50 text-emerald-700 border-emerald-200", d: "bg-emerald-500", label: "GPS On" },
  pending: { c: "bg-amber-50 text-amber-700 border-amber-100", d: "bg-amber-500", label: "Pending" },
  cancelled: { c: "bg-slate-50 text-slate-600 border-slate-200", d: "bg-slate-400", label: "Cancelled" },
};

function normalize(raw) {
  if (!raw) return "offline";
  return String(raw).toLowerCase().replace(/[\s-]/g, "_");
}

export default function OpsStatusBadge({ status, label, className = "" }) {
  const key = normalize(status);
  const cfg = PRESETS[key] || {
    c: "bg-slate-50 text-slate-600 border-slate-200",
    d: "bg-slate-400",
    label: label || status || "—",
  };
  const text = label || cfg.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${cfg.c} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.d}`} />
      {text}
    </span>
  );
}
