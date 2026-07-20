import { EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import { BRAND } from "../theme/brand";
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
import { Link } from "react-router-dom";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  patchEmployee,
  changePassword,
  adminResetPassword,
  uploadEmployeePhoto,
} from "../api/employee.api";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import ProfilePhotoUpload from "../components/ui/ProfilePhotoUpload";
import { getDistricts } from "../api/master.api";
import { getEmployeeStats, getEmployeeSummary, getEmployeeActivity } from "../api/tracking.api";
import EmployeeDeviceInfoSection from "../components/tracking/EmployeeDeviceInfoSection";
import {
  Users, Activity, MapPin, WifiOff, Clock, Search, LayoutGrid, List, X, Phone,
  RefreshCw, Eye, EyeOff, ChevronRight, AlertCircle, UserCheck, Signal, Timer,
  Calendar, Shield, Building2, Briefcase, PlayCircle, StopCircle, Radio, Heart,
  Navigation, ToggleLeft, ToggleRight, Loader2, Plus, UserPlus, Hash,
  Edit2, Key, Info, CheckCircle, Save, Copy, Route,
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

function resolveAssignedVillages(profile, summary) {
  const sources = [
    profile?.assigned_villages,
    profile?.villages,
    summary?.assigned_villages,
    summary?.villages,
    profile?.village_names,
    summary?.village_names,
  ];
  for (const src of sources) {
    if (Array.isArray(src) && src.length) {
      return src
        .map((v) =>
          typeof v === "object" ? v.name ?? v.village_name ?? v.label : String(v)
        )
        .filter(Boolean);
    }
    if (typeof src === "string" && src.trim()) {
      return src.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

const HrSection = ({ icon: Icon, title, subtitle, children }) => (
  <section className="employees-hr-section">
    <div className="employees-hr-section__head">
      {Icon ? (
        <div className="list-meta-icon list-meta-icon--crop">
          <Icon className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
    </div>
    <div className="employees-hr-section__body">{children}</div>
  </section>
);

/* ================================================================
   SKELETON PRIMITIVES
   ================================================================ */
const Bone = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

const KpiSkeleton = () => (
  <div className="employees-hr-stats">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="employees-hr-skeleton-card">
        <div className="skeleton w-9 h-9 rounded-xl" />
        <div className="skeleton h-8 w-16 mt-3 rounded" />
        <div className="skeleton h-3 w-24 mt-2 rounded" />
      </div>
    ))}
  </div>
);

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

/* --- KPI Card --- */
const KpiCard = memo(({ icon: Icon, label, value, iconBg, iconColor }) => {
  const animVal = useCountUp(value);
  return (
    <div className="employees-hr-stat">
      <div className="employees-hr-stat__accent" style={{ background: iconColor }} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <div className="employees-hr-stat__icon" style={{ background: iconBg, color: iconColor }}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="employees-hr-stat__value">{animVal}</p>
          <p className="employees-hr-stat__label">{label}</p>
        </div>
      </div>
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

  const s = stats || {};
  return (
    <div className="employees-hr-stats">
      <KpiCard icon={Users} label="Total employees" value={s.total ?? 0} iconBg="#dbeafe" iconColor="#2563eb" />
      <KpiCard icon={Activity} label="Active now" value={s.online ?? 0} iconBg="#ccfbf1" iconColor={BRAND.info} />
      <KpiCard icon={MapPin} label="On field" value={s.on_field ?? 0} iconBg={BRAND.infoLight} iconColor={BRAND.info} />
      <KpiCard icon={WifiOff} label="Offline" value={s.offline ?? 0} iconBg={BRAND.dangerLight} iconColor={BRAND.danger} />
      <KpiCard icon={Timer} label="Avg hours today" value={s.avg_hours_today ?? 0} iconBg={BRAND.warningLight} iconColor={BRAND.warning} />
    </div>
  );
});
EmployeeStats.displayName = "EmployeeStats";

const WorkforceStrip = memo(({ stats, loading: isLoading }) => {
  const cells = [
    { label: "Total staff", value: stats?.total ?? 0 },
    { label: "Active now", value: stats?.online ?? 0 },
    { label: "On field", value: stats?.on_field ?? 0 },
    { label: "Offline", value: stats?.offline ?? 0 },
    { label: "Avg hours", value: stats?.avg_hours_today ?? 0 },
  ];

  return (
    <div className="employees-hr-workforce-strip" aria-busy={isLoading}>
      <div className="employees-hr-workforce-strip__inner">
        <p className="employees-hr-workforce-strip__label">Workforce snapshot</p>
        <div className="employees-hr-workforce-strip__grid">
          {cells.map((c) => (
            <div key={c.label} className="employees-hr-workforce-cell">
              <p className="employees-hr-workforce-cell__label">{c.label}</p>
              {isLoading ? (
                <div className="skeleton h-4 w-10 rounded mt-2 bg-white/20" />
              ) : (
                <p className="employees-hr-workforce-cell__value">{c.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
WorkforceStrip.displayName = "WorkforceStrip";

const Badge = memo(({ online }) => (
  <span className={`employees-hr-status ${online ? "employees-hr-status--online" : "employees-hr-status--offline"}`}>
    <span className="employees-hr-status__dot" aria-hidden="true" />
    {online ? "Online" : "Offline"}
  </span>
));

const ROLE_CLASS = {
  admin: "employees-hr-role--admin",
  supervisor: "employees-hr-role--supervisor",
  field_officer: "employees-hr-role--field_officer",
  manager: "employees-hr-role--manager",
};
const RoleBadge = memo(({ role }) => {
  if (!role) return null;
  const cls = ROLE_CLASS[role] ?? "employees-hr-role--default";
  return (
    <span className={`employees-hr-role ${cls}`}>
      <Shield className="w-2.5 h-2.5" aria-hidden="true" />
      {role.replace(/_/g, " ")}
    </span>
  );
});
RoleBadge.displayName = "RoleBadge";

Badge.displayName = "Badge";

const EmployeeFilters = memo(({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, roleFilter, setRoleFilter, viewMode, setViewMode, total, shown }) => (
  <div className="employees-hr-filters">
    <div className="employees-hr-filters__search">
      <Search className="search-icon" aria-hidden="true" />
      <input
        type="search"
        placeholder="Search name, username, phone, ID…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
        aria-label="Search employees"
      />
    </div>
    <div className="employees-hr-filters__controls">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="employees-hr-filters__select"
        aria-label="Filter by status"
      >
        <option value="all">All status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
      <select
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
        className="employees-hr-filters__select"
        aria-label="Filter by role"
      >
        <option value="all">All roles</option>
        <option value="admin">Admin</option>
        <option value="supervisor">Supervisor</option>
        <option value="field_officer">Field officer</option>
        <option value="manager">Manager</option>
      </select>
      <div className="employees-hr-view-toggle">
        <button
          type="button"
          onClick={() => setViewMode("grid")}
          className={`employees-hr-view-toggle__btn ${viewMode === "grid" ? "employees-hr-view-toggle__btn--active" : ""}`}
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewMode("table")}
          className={`employees-hr-view-toggle__btn ${viewMode === "table" ? "employees-hr-view-toggle__btn--active" : ""}`}
          aria-label="Table view"
          aria-pressed={viewMode === "table"}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
      <span className="employees-hr-count">{shown} of {total}</span>
    </div>
  </div>
));
EmployeeFilters.displayName = "EmployeeFilters";

/* --- Employee Card (Grid) --- */
const EmployeeCard = memo(({ emp, onOpen }) => (
  <article
    className={`employees-hr-card group ${emp.is_online ? "employees-hr-card--online" : ""}`}
    onClick={() => onOpen(emp)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(emp);
      }
    }}
  >
    <div className="employees-hr-card__body">
      <div className="employees-hr-card__head">
        <ProfileAvatar
          entity={emp}
          name={empName(emp)}
          size="md"
          variant={emp.is_online ? "emerald" : "neutral"}
          online={emp.is_online}
        />
        <div className="flex-1 min-w-0">
          <p className="employees-hr-card__name group-hover:text-blue-700 transition-colors">{empName(emp)}</p>
          {emp.phone && (
            <p className="employees-hr-card__sub">
              <Phone className="w-3 h-3 shrink-0" aria-hidden="true" />
              {emp.phone}
            </p>
          )}
          {emp.employee_id && (
            <p className="employees-hr-card__sub">
              <Hash className="w-3 h-3 shrink-0" aria-hidden="true" />
              {emp.employee_id}
            </p>
          )}
        </div>
        <Badge online={emp.is_online} />
      </div>
      <div className="employees-hr-card__meta">
        <RoleBadge role={emp.role} />
        {emp.district_name && (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
            <Building2 className="w-2.5 h-2.5" aria-hidden="true" />
            {emp.district_name}
          </span>
        )}
      </div>
      <p className="employees-hr-card__seen">
        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
        {emp.last_seen || emp.last_heartbeat
          ? <>Last seen <span className="font-semibold text-slate-600">{fmtRel(emp.last_seen ?? emp.last_heartbeat)}</span></>
          : "Last seen: —"}
      </p>
      <div className="employees-hr-card__cta">
        <button type="button" className="btn btn-primary btn-sm w-full">
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          View profile
        </button>
      </div>
    </div>
  </article>
));
EmployeeCard.displayName = "EmployeeCard";

const EmployeeGrid = memo(({ employees: emps, loading: isLoading, viewMode, onOpen, onAddEmployee }) => {
  if (isLoading) {
    return (
      <div className="employees-hr-skeleton-grid" aria-busy="true" aria-label="Loading employees">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="employees-hr-skeleton-card">
            <div className="flex gap-3">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
            <div className="skeleton h-8 w-full rounded-lg mt-2" />
          </div>
        ))}
      </div>
    );
  }
  if (emps.length === 0) return (
    <div className="dashboard-section-card">
      <EmptyState
        icon={Users}
        title="No employees found"
        subtitle="Add field staff to enable visit tracking, routes, and live GPS monitoring."
        action={
          onAddEmployee ? (
            <button type="button" onClick={onAddEmployee} className="btn btn-primary btn-md">
              <UserPlus className="w-4 h-4" aria-hidden="true" /> Add employee
            </button>
          ) : null
        }
      />
    </div>
  );

  if (viewMode === "grid") {
    return (
      <div className="employees-hr-grid">
        {emps.map((emp) => <EmployeeCard key={emp.id} emp={emp} onOpen={onOpen} />)}
      </div>
    );
  }

  return (
    <div className="employees-hr-table-card">
      <div className="employees-hr-table-wrap">
        <table className="data-table compact-table employees-hr-table w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Phone</th>
              <th>Role</th>
              <th>District</th>
              <th>Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {emps.map((emp) => (
              <tr key={emp.id} className="cursor-pointer group" onClick={() => onOpen(emp)}>
                <td>
                  <div className="flex items-center gap-3 min-w-0">
                    <ProfileAvatar
                      entity={emp}
                      name={empName(emp)}
                      size="sm"
                      variant={emp.is_online ? "emerald" : "neutral"}
                    />
                    <span className="text-sm font-semibold text-slate-900 truncate">{empName(emp)}</span>
                  </div>
                </td>
                <td className="text-sm text-slate-500 font-mono tabular-nums">{emp.phone || "\u2014"}</td>
                <td><RoleBadge role={emp.role} /></td>
                <td className="text-sm text-slate-500">{emp.district_name || "\u2014"}</td>
                <td><Badge online={emp.is_online} /></td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onOpen(emp); }}
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    View
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
    <div className="employees-hr-timeline__item">
      <div className={`employees-hr-timeline__dot ${cfg.bg} ${cfg.border}`}>
        <Ic className={`w-3.5 h-3.5 ${cfg.color}`} aria-hidden="true" />
      </div>
      <p className="employees-hr-timeline__label">{(t || "").replace(/_/g, " ")}</p>
      {event.description && <p className="employees-hr-timeline__desc">{event.description}</p>}
      <p className="employees-hr-timeline__time">{fmtDateTime(event.timestamp || event.created_at)}</p>
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
  if (items.length === 0) return <p className="text-xs text-slate-400 text-center py-6">No activity recorded today.</p>;

  return (
    <div className="employees-hr-timeline max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {items.map((ev, i) => <ActivityEvent key={ev.id || i} event={ev} />)}
    </div>
  );
});
EmployeeActivityTimeline.displayName = "EmployeeActivityTimeline";

/* --- Employee Profile (Drawer) --- */
const EmployeeProfile = memo(({ profile, loading: isLoading, onPhotoUpdated }) => {
  if (isLoading || !profile) return null;
  return (
    <div className="employees-hr-profile">
      <ProfilePhotoUpload
        entity={profile}
        displayName={empName(profile)}
        size="2xl"
        enableCrop
        variant={profile.is_active !== false ? "emerald" : "neutral"}
        online={profile.is_online}
        onUpload={(file) => uploadEmployeePhoto(profile.id, file)}
        onPhotoUpdated={(url, data) =>
          onPhotoUpdated?.({
            ...profile,
            ...data,
            profile_photo_url: data?.profile_photo_url ?? url,
            profile_photo_updated_at:
              data?.profile_photo_updated_at ?? profile.profile_photo_updated_at,
          })
        }
      />
      <div className="employees-hr-profile__info">
        <p className="employees-hr-profile__name">{empName(profile)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap justify-center sm:justify-start">
          <RoleBadge role={profile.role} />
          {profile.phone && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3" aria-hidden="true" />
              {profile.phone}
            </span>
          )}
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
    <div className="employees-hr-kv-grid">
      {items.map((item) => (
        <div key={item.label} className="employees-hr-kv">
          <div className="employees-hr-kv__label">
            <item.icon className="w-3 h-3" aria-hidden="true" />
            {item.label}
          </div>
          <p className={`employees-hr-kv__value ${item.highlight ? "employees-hr-kv__value--highlight" : ""}`}>
            {item.value || "\u2014"}
          </p>
        </div>
      ))}
    </div>
  );
});
EmployeeSummary.displayName = "EmployeeSummary";

const EmployeePerformanceSummary = memo(({ summary, profile }) => {
  const s = summary || {};
  const p = profile || {};
  const items = [
    { label: "Visits completed", value: s.visits_today ?? s.total_visits ?? "\u2014" },
    { label: "Distance travelled", value: s.distance_km != null ? `${s.distance_km} km` : "\u2014" },
    { label: "Farmers visited", value: s.farmers_visited ?? s.farmers_today ?? "\u2014" },
    { label: "Evidence uploaded", value: s.attachments_today ?? s.evidence_count ?? "\u2014" },
    { label: "Last login", value: s.device_status?.last_login_at ? fmtRel(s.device_status.last_login_at) : "\u2014" },
    { label: "Last seen", value: fmtRel(s.last_seen || p.last_seen) },
  ];
  return (
    <HrSection icon={Briefcase} title="Performance" subtitle="Today\u2019s field performance">
      <div className="employees-hr-performance">
        {items.map((item) => (
          <div key={item.label} className="employees-hr-performance__card">
            <p className="employees-hr-performance__label">{item.label}</p>
            <p className="employees-hr-performance__value">{item.value}</p>
          </div>
        ))}
      </div>
    </HrSection>
  );
});
EmployeePerformanceSummary.displayName = "EmployeePerformanceSummary";

const AssignedVillagesSection = memo(({ profile, summary, loading: isLoading }) => {
  if (isLoading) {
    return (
      <HrSection icon={MapPin} title="Assigned villages" subtitle="Territory coverage">
        <div className="employees-hr-villages animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="!rounded-lg w-20 h-7" />
          ))}
        </div>
      </HrSection>
    );
  }

  const villages = resolveAssignedVillages(profile, summary);
  const district =
    profile?.district_name ||
    (typeof profile?.district === "object" ? profile?.district?.name : profile?.district);

  return (
    <HrSection icon={MapPin} title="Assigned villages" subtitle="Territory coverage">
      {villages.length > 0 ? (
        <div className="employees-hr-villages">
          {villages.map((v, i) => (
            <span key={`${v}-${i}`} className="employees-hr-village-chip">
              <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
              {v}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {district ? `No villages listed for ${district} district.` : "No villages assigned yet."}
        </p>
      )}
    </HrSection>
  );
});
AssignedVillagesSection.displayName = "AssignedVillagesSection";

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

  return (
    <div className="employees-hr-form">
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Admin Password Override</p>
          <p className="text-xs text-blue-600 mt-0.5">Set a new password directly — no existing password required.</p>
        </div>
      </div>

      <form onSubmit={handleReset} className="space-y-3">
        <div className="employees-hr-field">
          <label>
            New Password <span className="text-red-500">*</span>
          </label>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 mb-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /> {error}
            </div>
          )}
          <div className="relative">
            <input type={showPass ? "text" : "password"} required
              placeholder="Min 8 characters" value={newPass}
              onChange={e => { setNewPass(e.target.value); setLastSetPass(null); }} minLength={8} />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPass ? "Hide password" : "Show password"}>
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary btn-md w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Key className="w-4 h-4" aria-hidden="true" />}
          {saving ? "Setting…" : "Set Password"}
        </button>
      </form>

      {lastSetPass && (
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Password Set Successfully</p>
              <p className="text-xs text-emerald-600 mt-0.5">Share the password below with the employee.</p>
            </div>
          </div>
          <div className="employees-hr-field">
            <label>Employee&apos;s New Password</label>
            <div className="relative">
              <input readOnly type={showLastPass ? "text" : "password"}
                value={lastSetPass}
                className="font-mono tracking-wide pr-20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button type="button" onClick={() => setShowLastPass(s => !s)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  title={showLastPass ? "Hide password" : "Show password"}>
                  {showLastPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button type="button" onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                  title="Copy password">
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
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

  // Active / inactive toggle � instant PATCH
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

  // Save profile changes � PUT
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

  // Change password � POST /employees/change-password/
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
  const TABS = [
    { id: "details", label: "Details", icon: Info },
    { id: "edit", label: "Edit", icon: Edit2 },
    { id: "password", label: "Password", icon: Key },
  ];

  return createPortal(
    <>
      <div className="employees-hr-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="employees-hr-drawer" role="dialog" aria-modal="true" aria-label={`Employee profile: ${empName(profile)}`}>

        <div className="employees-hr-drawer-hero">
          <div className="employees-hr-drawer-hero__glow w-40 h-40 -top-10 -right-10" aria-hidden="true" />
          <div className="employees-hr-drawer-hero__glow w-28 h-28 bottom-0 left-1/3 opacity-60" aria-hidden="true" />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileAvatar
                entity={profile}
                name={empName(profile)}
                size="lg"
                variant={profile?.is_online ? "emerald" : "neutral"}
                online={profile?.is_online}
              />
              <div className="min-w-0">
                <p className="text-base font-bold truncate">{empName(profile)}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge online={profile?.is_online} />
                  <RoleBadge role={profile?.role} />
                  {profile?.employee_id && (
                    <span className="text-[10px] text-blue-100/90 font-medium flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" aria-hidden="true" />
                      {profile.employee_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-all" aria-label="Close drawer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="employees-hr-drawer-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`employees-hr-drawer-tab ${tab === t.id ? "employees-hr-drawer-tab--active" : "employees-hr-drawer-tab--idle"}`}
            >
              <t.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="employees-hr-drawer-body">

          {tab === "details" && (
            <>
              <div className="employees-hr-section">
                <div className="employees-hr-section__body">
                  <EmployeeProfile profile={profile} loading={false} onPhotoUpdated={onUpdated} />
                </div>
              </div>

              <HrSection icon={Signal} title="Tracking summary" subtitle="Real-time status">
                <EmployeeSummary summary={summary} profile={profile} loading={loadingSummary} />
                {(profile?.user_id ?? profile?.user ?? profile?.id) && (
                  <Link
                    to={`/tracking/routes?userId=${profile?.user_id ?? profile?.user ?? profile?.id}`}
                    className="mt-3 inline-flex items-center gap-2 btn btn-secondary btn-sm"
                  >
                    <Route className="w-4 h-4" aria-hidden="true" />
                    View route history
                    <ChevronRight className="w-4 h-4 ml-auto" aria-hidden="true" />
                  </Link>
                )}
              </HrSection>

              <AssignedVillagesSection profile={profile} summary={summary} loading={loadingSummary} />

              <HrSection icon={Radio} title="Device & connectivity" subtitle="Field app status">
                <EmployeeDeviceInfoSection employee={profile} summary={summary} />
              </HrSection>

              <EmployeePerformanceSummary summary={summary} profile={profile} />

              <HrSection icon={Activity} title="Activity timeline" subtitle="Today\u2019s events">
                <EmployeeActivityTimeline activities={activities} loading={loadingActivity} />
              </HrSection>
            </>
          )}

          {tab === "edit" && (
            <form onSubmit={handleSave} className="employees-hr-form !p-0 space-y-4">
              {saveSuccess && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  Employee updated successfully.
                </div>
              )}
              {saveError && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="employees-hr-field">
                <label>Username</label>
                <input readOnly value={selectedEmp?.username || selectedEmp?.employee_id || ""} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="employees-hr-field">
                  <label>First name</label>
                  <input placeholder="First name"
                    value={editForm.first_name || ""} onChange={e => setEF("first_name", e.target.value)} />
                </div>
                <div className="employees-hr-field">
                  <label>Last name</label>
                  <input placeholder="Last name"
                    value={editForm.last_name || ""} onChange={e => setEF("last_name", e.target.value)} />
                </div>
              </div>

              <div className="employees-hr-field">
                <label>Phone</label>
                <input placeholder="9876543210"
                  value={editForm.phone || ""} onChange={e => setEF("phone", e.target.value)} maxLength={15} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="employees-hr-field">
                  <label>Role</label>
                  <select value={editForm.role || ""} onChange={e => setEF("role", e.target.value)}>
                    <option value="field_officer">Field Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="employees-hr-field">
                  <label>District</label>
                  <select value={editForm.district || ""} onChange={e => setEF("district", e.target.value)}>
                    <option value="">Select district</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="employees-hr-toggle-card">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Account status</p>
                  <p className={`text-xs mt-0.5 font-medium ${editForm.is_active ? "text-emerald-600" : "text-red-500"}`}>
                    {editForm.is_active ? "Active — employee can log in" : "Inactive — login disabled"}
                  </p>
                </div>
                <button type="button" onClick={handleToggle} disabled={toggling}
                  aria-label="Toggle active status"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${editForm.is_active ? "bg-emerald-500" : "bg-slate-300"} ${toggling ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${editForm.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary btn-md w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                {saving ? "Saving\u2026" : "Save changes"}
              </button>
            </form>
          )}

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

  return createPortal(
    <>
      <div className="employees-hr-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div className="employees-hr-modal pointer-events-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-employee-title">
          <div className="employees-hr-modal__head">
            <div className="flex items-center gap-3">
              <div className="employees-hr-header__icon !p-2.5 !rounded-xl">
                <UserPlus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="add-employee-title" className="text-base font-bold text-slate-900">Add employee</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create a new field team member</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="employees-hr-modal__body">
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="employees-hr-field">
                  <label>First name</label>
                  <input placeholder="Ravi" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
                </div>
                <div className="employees-hr-field">
                  <label>Last name</label>
                  <input placeholder="Kumar" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
                </div>
              </div>
              <div className="employees-hr-field">
                <label>Username <span className="text-red-500">*</span></label>
                <input required placeholder="emp001" value={form.username} onChange={(e) => set("username", e.target.value)} />
              </div>
              <div className="employees-hr-field">
                <label>Password <span className="text-red-500">*</span></label>
                <input required type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={8} />
              </div>
              <div className="employees-hr-field">
                <label>Phone</label>
                <input placeholder="9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={15} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="employees-hr-field">
                  <label>Role <span className="text-red-500">*</span></label>
                  <select required value={form.role} onChange={(e) => set("role", e.target.value)}>
                    <option value="field_officer">Field Officer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="employees-hr-field">
                  <label>District</label>
                  <select value={form.district} onChange={(e) => set("district", e.target.value)}>
                    <option value="">Select district</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="employees-hr-modal__foot">
              <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <UserPlus className="w-4 h-4" aria-hidden="true" />}
                {saving ? "Creating\u2026" : "Create employee"}
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
    <div className="employees-hr page-container">

      <header className="employees-hr-header">
        <div className="employees-hr-header__inner">
          <div className="employees-hr-header__brand">
            <div className="employees-hr-header__icon" aria-hidden="true">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="employees-hr-header__badge">
                <Briefcase className="w-3 h-3" aria-hidden="true" />
                Human resources
              </span>
              <h1 className="employees-hr-header__title">Employees</h1>
              <p className="employees-hr-header__subtitle">
                Manage and monitor your field team &middot; {employees.length} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleRefresh} disabled={refreshing} className="btn btn-secondary btn-md disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {refreshing ? "Refreshing\u2026" : "Refresh"}
            </button>
            <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary btn-md">
              <Plus className="w-4 h-4" aria-hidden="true" /> Add employee
            </button>
          </div>
        </div>
      </header>

      <WorkforceStrip stats={stats} loading={loadingStats} />

      <EmployeeStats stats={stats} loading={loadingStats} error={statsError} onRetry={() => loadStats()} />

      <EmployeeFilters
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        roleFilter={roleFilter} setRoleFilter={setRoleFilter}
        viewMode={viewMode} setViewMode={setViewMode}
        total={employees.length} shown={filtered.length}
      />

      {listError && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(listError, "Couldn't load employees. Please try again.")}
          onRetry={() => loadList()}
        />
      )}

      <EmployeeGrid
        employees={filtered}
        loading={loadingList}
        viewMode={viewMode}
        onOpen={openDrawer}
        onAddEmployee={() => setAddOpen(true)}
      />

      <EmployeeDrawer emp={drawerEmp} open={drawerOpen} onClose={closeDrawer} onUpdated={handleUpdated} districts={districts} />

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} districts={districts} />
    </div>
  );
}
