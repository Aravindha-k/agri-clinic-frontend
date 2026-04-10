// Robust helper to extract array from any API response
function resolveList(res) {
  const raw = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.employees)) return raw.employees;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.features)) return raw.features;
  return [];
}
import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { getEmployees, createEmployee, updateEmployee, patchEmployee, changePassword, adminResetPassword } from "../api/employee.api";
import { getDistricts } from "../api/master.api";
import { getEmployeeStats, getEmployeeSummary, getEmployeeActivity } from "../api/tracking.api";
import {
  Users, Activity, MapPin, WifiOff, Clock, Search, LayoutGrid, List, X, Phone,
  RefreshCw, Eye, EyeOff, ChevronRight, Filter, AlertCircle, UserCheck, Signal, Timer,
  Calendar, Shield, Building2, Briefcase, PlayCircle, StopCircle, Radio, Heart,
  Navigation, ToggleLeft, ToggleRight, Loader2, Plus, UserPlus, Hash,
  Edit2, Key, Info, CheckCircle, Save, Copy,
} from "lucide-react";

/* ================================================================
   HOOKS
   ================================================================ */
const useCountUp = (target, duration = 1000) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = Number(target) || 0;
    if (start === end) { setVal(end); return; }
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * ease));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = end;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

/* ================================================================
   HELPERS
   ================================================================ */
const fmt = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtTime = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (d) => {
  if (!d) return "\u2014";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const fmtDurStr = (dur) => {
  if (!dur && dur !== 0) return "\u2014";
  if (typeof dur === "string") return dur;
  const h = Math.floor(dur / 3600);
  const m = Math.floor((dur % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtRel = (d) => {
  if (!d) return "\u2014";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmt(d);
};
const empName = (e) =>
  e?.first_name ? `${e.first_name} ${e.last_name || ""}`.trim() : e?.username || "\u2014";
const empInitial = (e) =>
  (e?.first_name?.[0] || e?.username?.[0] || "E").toUpperCase();
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

/* ================================================================
   SKELETON PRIMITIVES
   ================================================================ */
const Bone = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

const KpiSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="rounded-2xl p-4 sm:p-5 bg-white" style={{ boxShadow: SHADOW }}>
        <Bone className="w-10 h-10 rounded-xl mb-3" />
        <Bone className="w-16 h-7 mb-2" />
        <Bone className="w-24 h-4" />
      </div>
    ))}
  </div>
);

const CardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
    <Bone className="h-1 rounded-none" />
    <div className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <Bone className="!rounded-full w-11 h-11 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="w-28 h-4" />
          <Bone className="w-20 h-3" />
        </div>
        <Bone className="w-16 h-5 rounded-full" />
      </div>
      <div className="space-y-2.5 mb-4">
        <Bone className="w-full h-3" />
        <Bone className="w-full h-3" />
      </div>
      <Bone className="w-full h-8 rounded-xl" />
    </div>
  </div>
);

const GridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
  </div>
);

const DrawerSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="flex items-center gap-4">
      <Bone className="!rounded-2xl w-14 h-14 flex-shrink-0" />
      <div className="flex-1 space-y-2"><Bone className="w-36 h-5" /><Bone className="w-24 h-4" /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
          <Bone className="w-16 h-3" /><Bone className="w-24 h-4" />
        </div>
      ))}
    </div>
    <div className="space-y-2"><Bone className="w-full h-4" /><Bone className="w-full h-12" /><Bone className="w-full h-12" /></div>
  </div>
);

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

/* --- KPI Card --- */
const KpiCard = memo(({ icon: Icon, label, value, gradient, iconBg, iconColor }) => {
  const animVal = useCountUp(value);
  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 cursor-default"
      style={{ background: gradient, boxShadow: SHADOW }}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: iconColor }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110" style={{ background: iconBg, color: iconColor }}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[26px] font-bold text-gray-900 leading-none tabular-nums">{animVal}</p>
      <p className="mt-1.5 text-[13px] text-gray-500 font-medium">{label}</p>
    </div>
  );
});
KpiCard.displayName = "KpiCard";

/* --- Employee Stats Section --- */
const EmployeeStats = memo(({ stats, loading: isLoading, error: statsErr, onRetry }) => {
  if (isLoading) return <KpiSkeleton />;
  if (statsErr) return (
    <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">Failed to load stats.</span>
      <button onClick={onRetry} className="ml-auto font-semibold text-red-600 hover:underline">Retry</button>
    </div>
  );

  // Map API response fields to UI fields
  const s = stats || {};
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard icon={Users} label="Total Employees" value={s.total ?? 0}
        gradient="linear-gradient(135deg, #fff 0%, #f0fdf4 100%)" iconBg="#dcfce7" iconColor="#166534" />
      <KpiCard icon={Activity} label="Active Now" value={s.online ?? 0}
        gradient="linear-gradient(135deg, #fff 0%, #f0fdfa 100%)" iconBg="#ccfbf1" iconColor="#0d9488" />
      <KpiCard icon={MapPin} label="On Field" value={s.on_field ?? 0}
        gradient="linear-gradient(135deg, #fff 0%, #eff6ff 100%)" iconBg="#dbeafe" iconColor="#2563eb" />
      <KpiCard icon={WifiOff} label="Offline" value={s.offline ?? 0}
        gradient="linear-gradient(135deg, #fff 0%, #fef2f2 100%)" iconBg="#fee2e2" iconColor="#dc2626" />
      <KpiCard icon={Timer} label="Avg Hours Today" value={s.avg_hours_today ?? 0}
        gradient="linear-gradient(135deg, #fff 0%, #fefce8 100%)" iconBg="#fef9c3" iconColor="#ca8a04" />
    </div>
  );
});
EmployeeStats.displayName = "EmployeeStats";

/* --- Online Badge --- */
const Badge = memo(({ online }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${online ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-200"
    }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
    {online ? "Online" : "Offline"}
  </span>
));
Badge.displayName = "Badge";

/* --- Role Badge --- */
const ROLE_STYLES = {
  admin: "bg-violet-50 text-violet-700 border-violet-100",
  supervisor: "bg-sky-50 text-sky-700 border-sky-100",
  field_officer: "bg-amber-50 text-amber-700 border-amber-100",
  manager: "bg-blue-50 text-blue-700 border-blue-100",
};
const RoleBadge = memo(({ role }) => {
  if (!role) return null;
  const cls = ROLE_STYLES[role] ?? "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${cls}`}>
      <Shield className="w-2.5 h-2.5" />{role.replace(/_/g, " ")}
    </span>
  );
});
RoleBadge.displayName = "RoleBadge";

/* --- Section Header --- */
const SectionHead = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {Icon && <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><Icon className="w-4 h-4" /></div>}
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

/* --- Employee Filters --- */
const EmployeeFilters = memo(({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, roleFilter, setRoleFilter, viewMode, setViewMode, total, shown }) => (
  <div className="bg-white rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}>
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input type="text" placeholder="Search name, username, phone, ID\u2026" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all" />
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer">
        <option value="all">All Status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
        className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none cursor-pointer">
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="supervisor">Supervisor</option>
        <option value="field_officer">Field Officer</option>
        <option value="manager">Manager</option>
      </select>
    </div>
    <div className="hidden sm:block w-px h-8 bg-gray-200" />
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all duration-200 ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all duration-200 ${viewMode === "table" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}>
        <List className="w-4 h-4" />
      </button>
    </div>
    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{shown} of {total}</span>
  </div>
));
EmployeeFilters.displayName = "EmployeeFilters";

/* --- Employee Card (Grid) --- */
const EmployeeCard = memo(({ emp, onOpen }) => (
  <div className="bg-white rounded-2xl overflow-hidden group card-hover cursor-pointer"
    style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }} onClick={() => onOpen(emp)}>
    <div className="h-1" style={{ background: emp.is_online ? "linear-gradient(90deg, #10b981, #14b8a6)" : "linear-gradient(90deg, #d1d5db, #e5e7eb)" }} />
    <div className="p-5">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${emp.is_online ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
          <span className="text-sm font-bold text-white">{empInitial(emp)}</span>
          {emp.is_online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{empName(emp)}</p>
          {emp.phone && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5"><Phone className="w-3 h-3" />{emp.phone}</p>}
          {emp.employee_id && (
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Hash className="w-2.5 h-2.5" />{emp.employee_id}
            </p>
          )}
        </div>
        <Badge online={emp.is_online} />
      </div>
      {/* Role + District row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <RoleBadge role={emp.role} />
        {emp.district_name && (
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium">
            <Building2 className="w-2.5 h-2.5" />{emp.district_name}
          </span>
        )}
      </div>
      {/* Last seen */}
      <p className="text-[11px] text-gray-400 mb-3 flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        {emp.last_seen || emp.last_heartbeat
          ? <>Last seen <span className="font-medium text-gray-600">{fmtRel(emp.last_seen ?? emp.last_heartbeat)}</span></>
          : "Last seen: —"}
      </p>
      <button className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all duration-200 active:scale-[0.97]">
        <Eye className="w-3.5 h-3.5" /> View Details <ChevronRight className="w-3.5 h-3.5 ml-auto" />
      </button>
    </div>
  </div>
));
EmployeeCard.displayName = "EmployeeCard";

/* --- Employee Grid --- */
const EmployeeGrid = memo(({ employees: emps, loading: isLoading, viewMode, onOpen }) => {
  if (isLoading) return <GridSkeleton />;
  if (emps.length === 0) return (
    <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
      <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4"><Users className="w-7 h-7 text-gray-300" /></div>
      <p className="text-sm font-semibold text-gray-500">No employees found</p>
      <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
    </div>
  );

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {emps.map((emp) => <EmployeeCard key={emp.id} emp={emp} onOpen={onOpen} />)}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">District</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {emps.map((emp, idx) => (
              <tr key={emp.id} className={`transition-colors duration-150 hover:bg-emerald-50/30 cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`} onClick={() => onOpen(emp)}>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${emp.is_online ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
                      <span className="text-xs font-bold text-white">{empInitial(emp)}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{empName(emp)}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-500">{emp.phone || "\u2014"}</td>
                <td className="px-6 py-3.5"><RoleBadge role={emp.role} /></td>
                <td className="px-6 py-3.5 text-sm text-gray-500">{emp.district_name || "\u2014"}</td>
                <td className="px-6 py-3.5"><Badge online={emp.is_online} /></td>
                <td className="px-6 py-3.5 text-right">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all duration-200 active:scale-95">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
EmployeeGrid.displayName = "EmployeeGrid";

/* --- Activity Timeline Event --- */
const ACTIVITY_ICONS = {
  workday_start: { icon: PlayCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  workday_end: { icon: StopCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
  heartbeat: { icon: Heart, color: "text-pink-500", bg: "bg-pink-50", border: "border-pink-200" },
  location_update: { icon: Navigation, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  availability_online: { icon: ToggleRight, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
  availability_offline: { icon: ToggleLeft, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
  default: { icon: Radio, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
};

const ActivityEvent = memo(({ event }) => {
  const t = event.event_type || event.type || "default";
  const cfg = ACTIVITY_ICONS[t] || ACTIVITY_ICONS.default;
  const Ic = cfg.icon;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
          <Ic className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 capitalize">{(t || "").replace(/_/g, " ")}</p>
        {event.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>}
        <p className="text-[10px] text-gray-400 mt-1">{fmtDateTime(event.timestamp || event.created_at)}</p>
      </div>
    </div>
  );
});
ActivityEvent.displayName = "ActivityEvent";

/* --- Employee Activity Timeline --- */
const EmployeeActivityTimeline = memo(({ activities, loading: isLoading }) => {
  if (isLoading) return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Bone className="!rounded-full w-8 h-8 flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pb-4"><Bone className="w-28 h-3" /><Bone className="w-full h-3" /><Bone className="w-16 h-2.5" /></div>
        </div>
      ))}
    </div>
  );

  const items = Array.isArray(activities) ? activities : activities?.results || [];
  if (items.length === 0) return <p className="text-xs text-gray-400 text-center py-6">No activity recorded today.</p>;

  return (
    <div className="max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {items.map((ev, i) => <ActivityEvent key={ev.id || i} event={ev} />)}
    </div>
  );
});
EmployeeActivityTimeline.displayName = "EmployeeActivityTimeline";

/* --- Employee Profile (Drawer) --- */
const EmployeeProfile = memo(({ profile, loading: isLoading }) => {
  if (isLoading || !profile) return null;
  return (
    <div className="flex items-center gap-4">
      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${profile.is_active !== false ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-gray-300 to-gray-400"
        }`}>
        <span className="text-xl font-bold text-white">{empInitial(profile)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-gray-900">{empName(profile)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {profile.role && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 capitalize">
              <Shield className="w-2.5 h-2.5" />{profile.role}
            </span>
          )}
          {profile.phone && <span className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</span>}
        </div>
      </div>
    </div>
  );
});
EmployeeProfile.displayName = "EmployeeProfile";

/* --- Employee Summary (Drawer) --- */
const EmployeeSummary = memo(({ summary, profile, loading: isLoading }) => {
  if (isLoading) return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2"><Bone className="w-16 h-3" /><Bone className="w-24 h-4" /></div>
      ))}
    </div>
  );

  const s = summary || {};
  const p = profile || {};
  const items = [
    { label: "Username", value: p.username, icon: UserCheck },
    { label: "Online Status", value: s.is_online ? "Online" : "Offline", icon: Signal, highlight: s.is_online },
    { label: "Last Seen", value: fmtRel(s.last_seen || s.last_heartbeat), icon: Clock },
    { label: "Today Duration", value: fmtDurStr(s.today_duration), icon: Timer },
    { label: "GPS Accuracy", value: s.gps_accuracy ? `\u00b1${s.gps_accuracy}m` : "\u2014", icon: MapPin },
    { label: "On Field", value: s.is_on_field ? "Yes" : "No", icon: Briefcase, highlight: s.is_on_field },
    { label: "District", value: p.district_name || (typeof p.district === "object" ? p.district?.name : p.district) || "\u2014", icon: Building2 },
    { label: "Joined", value: fmt(p.date_joined || p.created_at), icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <item.icon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400 font-medium">{item.label}</span>
          </div>
          <p className={`text-sm font-semibold ${item.highlight ? "text-emerald-600" : "text-gray-900"}`}>{item.value || "\u2014"}</p>
        </div>
      ))}
    </div>
  );
});
EmployeeSummary.displayName = "EmployeeSummary";

/* --- Admin Reset Section (inside Password tab) --- */
const AdminResetSection = memo(({ empId }) => {
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSetPass, setLastSetPass] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showLastPass, setShowLastPass] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPass.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    setError(null);
    try {
      await adminResetPassword({ employee_id: empId, new_password: newPass });
      setLastSetPass(newPass);
      setNewPass("");
      setShowLastPass(true);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detail ?? d?.message ?? "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!lastSetPass) return;
    navigator.clipboard.writeText(lastSetPass).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Admin Password Override</p>
          <p className="text-xs text-blue-600 mt-0.5">Set a new password directly — no existing password required.</p>
        </div>
      </div>

      {/* Option 1: Set new password */}
      <form onSubmit={handleReset} className="space-y-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
          New Password <span className="text-red-500">*</span>
        </label>
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </div>
        )}
        <div className="relative">
          <input type={showPass ? "text" : "password"} required className={inputCls + " pr-10"}
            placeholder="Min 8 characters" value={newPass}
            onChange={e => { setNewPass(e.target.value); setLastSetPass(null); }} minLength={8} />
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button type="submit" disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-60 active:scale-[0.98]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          {saving ? "Setting\u2026" : "Set Password"}
        </button>
      </form>

      {/* Option 2: Show set password to give to employee */}
      {lastSetPass && (
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Password Set Successfully</p>
              <p className="text-xs text-emerald-600 mt-0.5">Share the password below with the employee.</p>
            </div>
          </div>
          <label className="block text-xs font-semibold text-gray-600">Employee's New Password</label>
          <div className="relative">
            <input readOnly type={showLastPass ? "text" : "password"}
              value={lastSetPass}
              className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-xl pr-20 font-mono tracking-wide" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button type="button" onClick={() => setShowLastPass(s => !s)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title={showLastPass ? "Hide password" : "Show password"}>
                {showLastPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button type="button" onClick={handleCopy}
                className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                title="Copy password">
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {copied && (
            <p className="text-xs text-emerald-600 text-center">Copied to clipboard!</p>
          )}
        </div>
      )}
    </div>
  );
});
AdminResetSection.displayName = "AdminResetSection";

/* --- Employee Drawer (Details / Edit / Password tabs) --- */
const EmployeeDrawer = memo(({ emp: selectedEmp, open, onClose, onUpdated, districts }) => {
  const [tab, setTab] = useState("details");

  // Tracking data
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Edit form
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // Populate edit form whenever selected employee changes
  useEffect(() => {
    if (selectedEmp) {
      // Derive first/last name: use explicit fields, else split full name, else username
      const fullName = selectedEmp.name || selectedEmp.full_name || "";
      const parts = fullName.trim().split(" ");
      const derivedFirst = selectedEmp.first_name || parts[0] || "";
      const derivedLast = selectedEmp.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");
      setEditForm({
        first_name: derivedFirst,
        last_name: derivedLast,
        phone: selectedEmp.phone || "",
        role: selectedEmp.role || "field_officer",
        district: selectedEmp.district?.id ?? selectedEmp.district ?? "",
        is_active: selectedEmp.is_active !== false,
      });
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [selectedEmp]);

  // Reset transient state when drawer closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setTab("details");
        setPwForm({ current_password: "", new_password: "", confirm_password: "" });
        setPwError(null);
        setPwSuccess(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Load tracking data
  useEffect(() => {
    if (!selectedEmp || !open) return;
    const userId = selectedEmp.user_id ?? selectedEmp.user ?? selectedEmp.id;
    const controller = new AbortController();
    setLoadingSummary(true);
    setLoadingActivity(true);
    setSummary(null);
    setActivities([]);

    const load = async () => {
      const [sumR, actR] = await Promise.allSettled([
        getEmployeeSummary(userId),
        getEmployeeActivity(userId),
      ]);
      if (controller.signal.aborted) return;
      if (sumR.status === "fulfilled") setSummary(sumR.value);
      setLoadingSummary(false);
      if (actR.status === "fulfilled") {
        const a = actR.value;
        setActivities(Array.isArray(a) ? a : a?.results || []);
      }
      setLoadingActivity(false);
    };
    load();
    return () => controller.abort();
  }, [selectedEmp, open]);

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  // Active / inactive toggle — instant PATCH
  const handleToggle = async () => {
    if (toggling) return;
    const newVal = !editForm.is_active;
    setToggling(true);
    setSaveError(null);
    try {
      await patchEmployee(selectedEmp.id, { is_active: newVal });
      setEF("is_active", newVal);
      onUpdated({ ...selectedEmp, is_active: newVal });
    } catch (err) {
      setSaveError("Failed to toggle status. Please try again.");
    } finally {
      setToggling(false);
    }
  };

  // Save profile changes — PUT
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = { ...editForm };
      if (!payload.district) delete payload.district;
      const res = await updateEmployee(selectedEmp.id, payload);
      const updated = res.data?.data ?? res.data ?? {};
      onUpdated({ ...selectedEmp, ...payload, ...(updated.id ? updated : {}) });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const d = err.response?.data;
      const detail = d?.detail ?? d?.message ?? Object.values(d ?? {})?.[0]?.[0] ?? "Failed to update employee.";
      setSaveError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setSaving(false);
    }
  };

  // Change password — POST /employees/change-password/
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    setPwError(null);
    try {
      await changePassword({
        employee_id: selectedEmp.employee_id ?? selectedEmp.username,
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess(true);
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      const d = err.response?.data;
      const detail = d?.detail ?? d?.message ?? d?.current_password?.[0] ?? "Failed to update password.";
      setPwError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setPwSaving(false);
    }
  };

  if (!open) return null;

  const profile = selectedEmp;
  const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";
  const TABS = [
    { id: "details", label: "Details", icon: Info },
    { id: "edit", label: "Edit", icon: Edit2 },
    { id: "password", label: "Password", icon: Key },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998] transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-[9999] shadow-2xl flex flex-col animate-slide-in">

        {/* ── Drawer Header ── */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #f8faf9, #ffffff)" }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile?.is_online ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-gray-300 to-gray-400"}`}>
              <span className="text-sm font-bold text-white">{empInitial(profile)}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{empName(profile)}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <RoleBadge role={profile?.role} />
                {profile?.employee_id && (
                  <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{profile.employee_id}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 flex border-b border-gray-100 bg-gray-50/50">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2 ${tab === t.id ? "border-emerald-500 text-emerald-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          {/* DETAILS TAB */}
          {tab === "details" && (
            <div className="p-6 space-y-6">
              <EmployeeProfile profile={profile} loading={false} />
              <div>
                <SectionHead icon={Signal} title="Tracking Summary" subtitle="Real-time status" />
                <div className="mt-3">
                  <EmployeeSummary summary={summary} profile={profile} loading={loadingSummary} />
                </div>
              </div>
              <div>
                <SectionHead icon={Activity} title="Activity Timeline" subtitle="Today's events" />
                <div className="mt-3">
                  <EmployeeActivityTimeline activities={activities} loading={loadingActivity} />
                </div>
              </div>
            </div>
          )}

          {/* EDIT TAB */}
          {tab === "edit" && (
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {saveSuccess && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /> Employee updated successfully.
                </div>
              )}
              {saveError && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Username — read-only identifier */}
              <div>
                <label className={labelCls}>Username</label>
                <input readOnly className={inputCls + " bg-gray-100 text-gray-500 cursor-default"}
                  value={selectedEmp?.username || selectedEmp?.employee_id || ""} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input className={inputCls} placeholder="First name"
                    value={editForm.first_name || ""} onChange={e => setEF("first_name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input className={inputCls} placeholder="Last name"
                    value={editForm.last_name || ""} onChange={e => setEF("last_name", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} placeholder="9876543210"
                  value={editForm.phone || ""} onChange={e => setEF("phone", e.target.value)} maxLength={15} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Role</label>
                  <select className={inputCls} value={editForm.role || ""} onChange={e => setEF("role", e.target.value)}>
                    <option value="field_officer">Field Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>District</label>
                  <select className={inputCls} value={editForm.district || ""} onChange={e => setEF("district", e.target.value)}>
                    <option value="">Select district</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Active / Inactive toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Account Status</p>
                  <p className={`text-xs mt-0.5 font-medium ${editForm.is_active ? "text-emerald-600" : "text-red-500"}`}>
                    {editForm.is_active ? "Active — employee can log in" : "Inactive — login disabled"}
                  </p>
                </div>
                <button type="button" onClick={handleToggle} disabled={toggling}
                  aria-label="Toggle active status"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 ${editForm.is_active ? "bg-emerald-500" : "bg-gray-300"} ${toggling ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${editForm.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-60 active:scale-[0.98]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving\u2026" : "Save Changes"}
              </button>
            </form>
          )}

          {/* PASSWORD TAB */}
          {tab === "password" && (
            <AdminResetSection empId={selectedEmp?.employee_id ?? selectedEmp?.username} />
          )}
        </div>
      </div>
    </>,
    document.body
  );
});
EmployeeDrawer.displayName = "EmployeeDrawer";

/* ================================================================
   ADD EMPLOYEE MODAL
   ================================================================ */
const EMPTY_FORM = { username: "", first_name: "", last_name: "", phone: "", password: "", role: "field_officer", district: "" };

const AddEmployeeModal = memo(({ open, onClose, onCreated, districts }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.district) delete payload.district;
      const res = await createEmployee(payload);
      const created = res.data?.data ?? res.data ?? res;
      onCreated(created);
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail
        ?? err.response?.data?.message
        ?? Object.values(err.response?.data ?? {})?.[0]?.[0]
        ?? "Failed to create employee.";
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = "w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
            style={{ background: "linear-gradient(135deg, #f0fdf4, #ffffff)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Employee</h3>
                <p className="text-xs text-gray-400 mt-0.5">Create a new field team member</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input className={inputCls} placeholder="Ravi" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input className={inputCls} placeholder="Kumar" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Username <span className="text-red-500">*</span></label>
                <input required className={inputCls} placeholder="emp001" value={form.username} onChange={(e) => set("username", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                <input required type="password" className={inputCls} placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} placeholder="9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={15} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Role <span className="text-red-500">*</span></label>
                  <select required className={inputCls} value={form.role} onChange={(e) => set("role", e.target.value)}>
                    <option value="field_officer">Field Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>District</label>
                  <select className={inputCls} value={form.district} onChange={(e) => set("district", e.target.value)}>
                    <option value="">Select district</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-60 active:scale-[0.97]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {saving ? "Creating…" : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
});
AddEmployeeModal.displayName = "AddEmployeeModal";

/* ================================================================
   EMPLOYEES PAGE (MAIN)
   ================================================================ */
export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [listError, setListError] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [drawerEmp, setDrawerEmp] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [districts, setDistricts] = useState([]);
  /* --- Load employee list --- */
  const loadList = useCallback(async (signal) => {
    try {
      setLoadingList(true);
      setListError(null);
      const data = await getEmployees();
      if (signal?.aborted) return;
      setEmployees(resolveList(data));
    } catch (err) {
      if (!signal?.aborted) setListError("Failed to load employees.");
    } finally {
      if (!signal?.aborted) setLoadingList(false);
    }
  }, []);

  /* --- Load stats --- */
  const loadStats = useCallback(async (signal) => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const data = await getEmployeeStats();
      if (signal?.aborted) return;
      setStats(data);
    } catch (err) {
      if (!signal?.aborted) setStatsError("Failed to load stats.");
    } finally {
      if (!signal?.aborted) setLoadingStats(false);
    }
  }, []);

  /* --- Initial load --- */
  useEffect(() => {
    const controller = new AbortController();
    loadList(controller.signal);
    loadStats(controller.signal);
    // Load districts for Add Employee form
    getDistricts().then((res) => {
      const list = res.data?.data?.results ?? res.data?.results ?? res.data?.data ?? res.data ?? [];
      setDistricts(Array.isArray(list) ? list : []);
    }).catch(() => { });
    return () => controller.abort();
  }, [loadList, loadStats]);

  /* --- Refresh --- */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    await Promise.allSettled([loadList(controller.signal), loadStats(controller.signal)]);
    setRefreshing(false);
  }, [loadList, loadStats]);

  /* --- Filtering --- */
  const filtered = useMemo(() => {
    const list = Array.isArray(employees) ? employees : [];
    return list.filter((emp) => {
      const name = `${emp.first_name || ""} ${emp.last_name || ""} ${emp.username || ""} ${emp.employee_id || ""}`.toLowerCase();
      const phone = emp.phone || "";
      const matchSearch = name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && emp.is_online) ||
        (statusFilter === "offline" && !emp.is_online);
      const matchRole =
        roleFilter === "all" || emp.role === roleFilter;
      return matchSearch && matchStatus && matchRole;
    });
  }, [employees, searchTerm, statusFilter, roleFilter]);

  /* --- Drawer --- */
  const openDrawer = useCallback((emp) => {
    setDrawerEmp(emp);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerEmp(null);
  }, []);

  /* --- Add Employee callback --- */
  const handleCreated = useCallback((newEmp) => {
    if (newEmp?.id) {
      setEmployees((prev) => [newEmp, ...prev]);
    } else {
      // Refresh list to pick up server-returned data
      loadList();
    }
  }, [loadList]);

  /* --- Update employee callback (from drawer edit/toggle) --- */
  const handleUpdated = useCallback((updatedEmp) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? { ...e, ...updatedEmp } : e));
    setDrawerEmp(prev => prev?.id === updatedEmp.id ? { ...prev, ...updatedEmp } : prev);
  }, []);

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor your field team &middot; {employees.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="btn btn-secondary btn-md disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing\u2026" : "Refresh"}
          </button>
          <button onClick={() => setAddOpen(true)}
            className="btn btn-primary btn-md">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <EmployeeStats stats={stats} loading={loadingStats} error={statsError} onRetry={() => loadStats()} />

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        roleFilter={roleFilter} setRoleFilter={setRoleFilter}
        viewMode={viewMode} setViewMode={setViewMode}
        total={employees.length} shown={filtered.length}
      />

      {/* List error */}
      {listError && (
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{listError}</span>
          <button onClick={() => loadList()} className="ml-auto font-semibold text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Employee Grid / Table */}
      <EmployeeGrid employees={filtered} loading={loadingList} viewMode={viewMode} onOpen={openDrawer} />

      {/* Detail Drawer */}
      <EmployeeDrawer emp={drawerEmp} open={drawerOpen} onClose={closeDrawer} onUpdated={handleUpdated} districts={districts} />

      {/* Add Employee Modal */}
      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} districts={districts} />

      {/* Animations */}
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
