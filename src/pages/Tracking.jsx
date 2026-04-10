import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    getDashboardStats,
    getAdminStatus,
    getEmployeeSummary,
    getEmployeeRoute,
    getEmployeeActivity,
} from "../api/tracking.api";
import {
    Users,
    Briefcase,
    Wifi,
    WifiOff,
    AlertTriangle,
    MapPin,
    Clock,
    Eye,
    X,
    RefreshCw,
    Search,
    Activity,
    Navigation,
    FileText,
    Radio,
    Signal,
    SignalZero,
    Smartphone,
    Route,
    Layers,
    TrendingUp,
    Battery,
    Globe,
    Cpu,
    ShieldAlert,
    Package,
    HeartPulse,
} from "lucide-react";

/* ================================================================
   CONSTANTS
   ================================================================ */
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";
const SHADOW_LG = "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)";
const REFRESH_INTERVAL = 30000;

/* ================================================================
   ANIMATED COUNT-UP HOOK
   ================================================================ */
const useCountUp = (target, duration = 900) => {
    const [val, setVal] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const s = prev.current;
        const e = Number(target) || 0;
        if (s === e) { setVal(e); return; }
        const t0 = performance.now();
        let raf;
        const step = (now) => {
            const p = Math.min((now - t0) / duration, 1);
            setVal(Math.round(s + (e - s) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
            else prev.current = e;
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return val;
};

/* ================================================================
   LEAFLET CUSTOM MARKERS
   ================================================================ */
const markerColors = {
    green: "#22c55e",
    yellow: "#eab308",
    red: "#ef4444",
    gray: "#9ca3af",
};

const createColoredIcon = (color, pulse = false) =>
    L.divIcon({
        className: "",
        html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        ${pulse ? `<div style="position:absolute;width:32px;height:32px;border-radius:50%;background:${color};opacity:0.25;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
        <div style="
          width:14px;height:14px;border-radius:50%;
          background:${color};
          border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          position:relative;z-index:1;
        "></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

const getMarkerIcon = (emp) => {
    const work = emp.work_status?.toLowerCase?.() || "";
    const conn = emp.connection_status?.toLowerCase?.() || "";
    const gps = emp.gps_status?.toLowerCase?.() || "";

    if (gps === "gps_off" || gps === "off") return createColoredIcon(markerColors.red);
    if (work === "working" && conn === "online") return createColoredIcon(markerColors.green, true);
    if (work === "working" && conn === "offline") return createColoredIcon(markerColors.yellow);
    return createColoredIcon(markerColors.gray);
};

const getStatusColor = (emp) => {
    const work = emp.work_status?.toLowerCase?.() || "";
    const conn = emp.connection_status?.toLowerCase?.() || "";
    const gps = emp.gps_status?.toLowerCase?.() || "";
    if (gps === "gps_off" || gps === "off") return "red";
    if (work === "working" && conn === "online") return "green";
    if (work === "working" && conn === "offline") return "yellow";
    return "gray";
};

/* ================================================================
   HELPERS
   ================================================================ */
const timeAgo = (dateStr) => {
    if (!dateStr) return "N/A";
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return "\u2014";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const empName = (e) => e?.username || e?.employee_id || "Unknown";

/**
 * Tracking health: prefer API field `tracking_health`, else compute from last_seen.
 * OK (data < 2 min), STALE (2-10 min), STOPPED (>10 min / null)
 */
const getTrackingHealth = (emp) => {
    const apiVal = emp?.tracking_health?.toLowerCase?.();
    if (apiVal === "ok" || apiVal === "stale" || apiVal === "stopped") return apiVal;
    if (!emp?.last_seen) return "stopped";
    const diffSec = (Date.now() - new Date(emp.last_seen).getTime()) / 1000;
    if (diffSec < 120) return "ok";
    if (diffSec < 600) return "stale";
    return "stopped";
};

const HEALTH_CFG = {
    ok: { color: "emerald", label: "OK", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
    stale: { color: "yellow", label: "STALE", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
    stopped: { color: "red", label: "STOPPED", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

/* ================================================================
   SKELETON COMPONENTS
   ================================================================ */
const Bone = ({ className = "" }) => (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

const StatsSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 bg-white" style={{ boxShadow: SHADOW }}>
                <Bone className="w-10 h-10 rounded-xl mb-3" />
                <Bone className="w-16 h-8 mb-2" />
                <Bone className="w-24 h-4" />
            </div>
        ))}
    </div>
);

/* ================================================================
   STAT CARD
   ================================================================ */
const StatCard = memo(({ icon: Icon, label, value, accent, gradient, iconBg }) => {
    const animVal = useCountUp(value);
    return (
        <div
            className="relative rounded-2xl p-5 overflow-hidden group card-hover cursor-default"
            style={{ background: gradient, boxShadow: SHADOW }}
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: accent }} />
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                style={{ background: iconBg, color: accent }}
            >
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">{animVal}</p>
            <div className="flex items-center justify-between mt-1.5">
                <p className="text-[13px] text-gray-500 font-medium">{label}</p>
                <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
            </div>
        </div>
    );
});
StatCard.displayName = "StatCard";

/* ================================================================
   BADGE COMPONENTS
   ================================================================ */
const WorkStatusBadge = ({ status }) => {
    const s = status?.toLowerCase?.() || "";
    const cfg = {
        working: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Working" },
        not_working: { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400", label: "Not Working" },
    };
    const c = cfg[s] || cfg.not_working;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${s === "working" ? "animate-pulse" : ""}`} />
            {c.label}
        </span>
    );
};

const ConnectionBadge = ({ status }) => {
    const s = status?.toLowerCase?.() || "";
    const isOnline = s === "online";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isOnline ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
        </span>
    );
};

const GpsBadge = ({ status }) => {
    const s = status?.toLowerCase?.() || "";
    const isOff = s === "gps_off" || s === "off";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isOff ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {isOff ? <SignalZero className="w-3 h-3" /> : <Signal className="w-3 h-3" />}
            {isOff ? "GPS Off" : "Active"}
        </span>
    );
};

/* ================================================================
   TRACKING HEALTH BADGE
   ================================================================ */
const TrackingHealthBadge = ({ employee }) => {
    const health = getTrackingHealth(employee);
    const c = HEALTH_CFG[health];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
            <HeartPulse className="w-3 h-3" />
            {c.label}
        </span>
    );
};

/* ================================================================
   SUSPICIOUS ALERT
   ================================================================ */
const SuspiciousAlert = ({ employee }) => {
    if (!employee?.is_suspicious) return null;
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm" style={{ boxShadow: SHADOW }}>
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600" />
            <div>
                <p className="font-semibold text-sm">Suspicious Activity Detected</p>
                <p className="text-xs text-red-500 mt-0.5">{employee.suspicious_reason || "Unusual location or movement pattern flagged by the system."}</p>
            </div>
        </div>
    );
};

/* ================================================================
   DEVICE INFO CARD (Drawer)
   ================================================================ */
const DeviceInfoCard = ({ employee, summary }) => {
    const batt = employee?.battery_level ?? employee?.battery_percent ?? summary?.battery_level ?? summary?.battery_percent;
    const network = employee?.network_type ?? summary?.network_type ?? null;
    const model = employee?.device_model ?? summary?.device_model ?? null;
    const appVer = employee?.app_version ?? summary?.app_version ?? null;

    const battColor = batt != null
        ? batt > 50 ? "text-emerald-600" : batt > 20 ? "text-yellow-600" : "text-red-600"
        : "text-gray-400";

    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3" style={{ boxShadow: SHADOW }}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Device Info
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                    <Battery className={`w-4 h-4 ${battColor}`} />
                    <div>
                        <p className="text-[10px] text-gray-400">Battery</p>
                        <p className={`text-sm font-semibold ${battColor}`}>{batt != null ? `${batt}%` : "N/A"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <div>
                        <p className="text-[10px] text-gray-400">Network</p>
                        <p className="text-sm font-semibold text-gray-700">{network || "N/A"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <div>
                        <p className="text-[10px] text-gray-400">Device</p>
                        <p className="text-sm font-semibold text-gray-700">{model || "N/A"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-500" />
                    <div>
                        <p className="text-[10px] text-gray-400">App Version</p>
                        <p className="text-sm font-semibold text-gray-700">{appVer || "N/A"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ================================================================
   MAP LEGEND
   ================================================================ */
const MapLegend = () => (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-3 border border-gray-200 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Legend</p>
        <div className="space-y-1.5">
            {[
                { color: "bg-green-500", label: "Working + Online" },
                { color: "bg-yellow-500", label: "Working + Offline" },
                { color: "bg-red-500", label: "GPS Off" },
                { color: "bg-gray-400", label: "Not Working" },
            ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-[11px] text-gray-600">{item.label}</span>
                </div>
            ))}
        </div>
    </div>
);

/* ================================================================
   EMPLOYEE DRAWER
   ================================================================ */
const EmployeeDrawer = ({ employee, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState("summary");
    const [summary, setSummary] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [activityData, setActivityData] = useState(null);
    const [loading, setLoading] = useState(false);

    const userId = employee?.user_id || employee?.id;

    /* Reset on open / employee change */
    useEffect(() => {
        if (!isOpen || !userId) return;
        setActiveTab("summary");
        setSummary(null);
        setRouteData(null);
        setActivityData(null);
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userId]);

    /* Tab switching */
    useEffect(() => {
        if (!isOpen || !userId) return;
        if (activeTab === "summary" && !summary) loadSummary();
        if (activeTab === "route" && !routeData) loadRoute();
        if (activeTab === "activity" && !activityData) loadActivity();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadSummary = async () => {
        setLoading(true);
        try { setSummary(await getEmployeeSummary(userId)); } catch { setSummary(null); }
        setLoading(false);
    };
    const loadRoute = async () => {
        setLoading(true);
        try { setRouteData(await getEmployeeRoute(userId)); } catch { setRouteData(null); }
        setLoading(false);
    };
    const loadActivity = async () => {
        setLoading(true);
        try { setActivityData(await getEmployeeActivity(userId)); } catch { setActivityData(null); }
        setLoading(false);
    };

    const tabs = [
        { key: "summary", label: "Summary", icon: FileText },
        { key: "route", label: "Route", icon: Route },
        { key: "activity", label: "Activity", icon: Activity },
    ];

    const color = employee ? getStatusColor(employee) : "gray";
    const accentMap = {
        green: { grad: "from-emerald-500 to-emerald-700" },
        yellow: { grad: "from-yellow-500 to-amber-600" },
        red: { grad: "from-red-500 to-red-700" },
        gray: { grad: "from-gray-500 to-gray-700" },
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {employee && (
                    <div className="flex flex-col h-full">
                        {/* ── Header ── */}
                        <div className={`bg-gradient-to-r ${accentMap[color].grad} p-6`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl ring-2 ring-white/30">
                                        {empName(employee)[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{empName(employee)}</h3>
                                        <p className="text-white/80 text-sm mt-0.5">{employee.district || employee.designation || "\u2014"}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                                                {employee.work_status || "\u2014"}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                                                {employee.connection_status || "\u2014"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex border-b border-gray-200 bg-gray-50">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 ${activeTab === tab.key
                                        ? "border-emerald-600 text-emerald-700 bg-white"
                                        : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-white/60"
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ── Tab Content ── */}
                        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                            {loading ? (
                                <div className="flex items-center justify-center h-40">
                                    <div className="w-8 h-8 border-[3px] border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* SUMMARY */}
                                    {activeTab === "summary" && (
                                        <div className="space-y-4">
                                            {/* Suspicious Alert */}
                                            <SuspiciousAlert employee={employee} />

                                            {summary ? (
                                                <>
                                                    {/* Tracking Health + Status Row */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <TrackingHealthBadge employee={employee} />
                                                        <WorkStatusBadge status={employee.work_status} />
                                                        <ConnectionBadge status={employee.connection_status} />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { label: "Today\u2019s Visits", value: summary.visits_today ?? summary.total_visits ?? "\u2014", icon: MapPin },
                                                            { label: "Distance", value: summary.distance_km ? `${summary.distance_km} km` : "\u2014", icon: Navigation },
                                                            { label: "Work Hours", value: summary.work_hours ?? summary.hours_worked ?? "\u2014", icon: Clock },
                                                            { label: "Last Seen", value: timeAgo(summary.last_seen || employee.last_seen), icon: Eye },
                                                        ].map((item) => (
                                                            <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: SHADOW }}>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <item.icon className="w-4 h-4 text-emerald-600" />
                                                                    <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                                                                </div>
                                                                <p className="text-lg font-bold text-gray-900">{item.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {summary.current_location && (
                                                        <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: SHADOW }}>
                                                            <p className="text-xs text-gray-400 mb-1 flex items-center gap-2 font-medium">
                                                                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Current Location
                                                            </p>
                                                            <p className="text-sm text-gray-700">{summary.current_location}</p>
                                                        </div>
                                                    )}

                                                    {(summary.phone || summary.employee_id) && (
                                                        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4" style={{ boxShadow: SHADOW }}>
                                                            <Smartphone className="w-5 h-5 text-blue-600" />
                                                            <div>
                                                                {summary.employee_id && <p className="text-xs text-gray-400">ID: {summary.employee_id}</p>}
                                                                {summary.phone && <p className="text-sm text-gray-700">{summary.phone}</p>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Device Info */}
                                                    <DeviceInfoCard employee={employee} summary={summary} />

                                                    {/* Distance Today */}
                                                    <div className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: SHADOW }}>
                                                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-2 font-medium">
                                                            <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Today Distance
                                                        </p>
                                                        <p className="text-2xl font-bold text-gray-900">
                                                            {(() => {
                                                                const dist = employee?.today_distance_km ?? employee?.distance_km ?? summary?.today_distance_km ?? summary?.distance_km ?? 0;
                                                                return typeof dist === "number" ? dist.toFixed(1) : dist;
                                                            })()}{" "}
                                                            <span className="text-sm font-medium text-gray-400">km</span>
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center text-gray-400 py-12">
                                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p>No summary data available</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ROUTE MAP */}
                                    {activeTab === "route" && (
                                        <div className="space-y-4">
                                            {(routeData?.points?.length > 0 || routeData?.route?.length > 0) ? (
                                                <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200" style={{ boxShadow: SHADOW }}>
                                                    <MapContainer
                                                        center={(() => {
                                                            const pts = routeData.points || routeData.route || [];
                                                            if (pts.length > 0) {
                                                                const p = pts[0];
                                                                return [p.latitude || p.lat || 11.1, p.longitude || p.lng || 78.6];
                                                            }
                                                            return [11.1271, 78.6569];
                                                        })()}
                                                        zoom={13}
                                                        style={{ width: "100%", height: "100%" }}
                                                    >
                                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                        <Polyline
                                                            positions={(routeData.points || routeData.route || []).map((p) => [
                                                                p.latitude || p.lat,
                                                                p.longitude || p.lng,
                                                            ])}
                                                            color="#059669"
                                                            weight={4}
                                                            opacity={0.8}
                                                        />
                                                        {(routeData.points || routeData.route || []).map((p, i, arr) => {
                                                            if (i === 0 || i === arr.length - 1) {
                                                                return (
                                                                    <Marker
                                                                        key={i}
                                                                        position={[p.latitude || p.lat, p.longitude || p.lng]}
                                                                        icon={createColoredIcon(i === 0 ? "#3b82f6" : "#ef4444")}
                                                                    >
                                                                        <Popup>
                                                                            <span className="text-xs font-semibold">
                                                                                {i === 0 ? "Start" : "Latest"} \u2014 {p.timestamp || p.time || ""}
                                                                            </span>
                                                                        </Popup>
                                                                    </Marker>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </MapContainer>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400 py-12">
                                                    <Route className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p>No route data for today</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIVITY */}
                                    {activeTab === "activity" && (
                                        <div className="space-y-3">
                                            {(Array.isArray(activityData) ? activityData : activityData?.activities || []).length > 0 ? (
                                                <div className="relative">
                                                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                                                    {(Array.isArray(activityData) ? activityData : activityData?.activities || []).map((act, i) => (
                                                        <div key={i} className="relative flex items-start gap-4 pb-5">
                                                            <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                <Activity className="w-4 h-4 text-emerald-600" />
                                                            </div>
                                                            <div className="flex-1 bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-sm font-semibold text-gray-800">{act.type || act.action || act.title || "Activity"}</p>
                                                                    <span className="text-xs text-gray-400">{act.timestamp || act.time || act.created_at || ""}</span>
                                                                </div>
                                                                {(act.description || act.details || act.location) && (
                                                                    <p className="text-xs text-gray-500">{act.description || act.details || act.location}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400 py-12">
                                                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                                    <p>No activity recorded today</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

/* ================================================================
   MAIN TRACKING PAGE
   ================================================================ */
export default function Tracking() {
    const [stats, setStats] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);

    /* ── Data Loading ── */
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const [statsRes, statusRes] = await Promise.allSettled([
                getDashboardStats(),
                getAdminStatus(),
            ]);

            if (statsRes.status === "fulfilled" && statsRes.value) {
                const d = statsRes.value?.data ?? statsRes.value;
                setStats(d);
            }
            if (statusRes.status === "fulfilled") {
                const raw = statusRes.value;
                const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? raw?.employees ?? [];
                setEmployees(Array.isArray(list) ? list : []);
            }
            setLastRefresh(new Date());
        } catch (err) {
            setError("Failed to load tracking data.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        intervalRef.current = setInterval(() => loadData(), REFRESH_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [loadData]);

    /* ── Filtered employees ── */
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const name = empName(emp).toLowerCase();
            const district = (emp.district || "").toLowerCase();
            const matchSearch =
                !searchTerm ||
                name.includes(searchTerm.toLowerCase()) ||
                district.includes(searchTerm.toLowerCase());
            const color = getStatusColor(emp);
            const matchFilter =
                filterStatus === "all" ||
                (filterStatus === "working" && color === "green") ||
                (filterStatus === "offline" && color === "yellow") ||
                (filterStatus === "gps_off" && color === "red") ||
                (filterStatus === "inactive" && color === "gray");
            return matchSearch && matchFilter;
        });
    }, [employees, searchTerm, filterStatus]);

    /* ── Map helpers ── */
    const mapEmployees = filteredEmployees.filter(
        (emp) =>
            emp.latitude != null &&
            emp.longitude != null &&
            !isNaN(emp.latitude) &&
            !isNaN(emp.longitude)
    );

    const mapCenter =
        mapEmployees.length > 0
            ? [
                mapEmployees.reduce((s, e) => s + Number(e.latitude), 0) / mapEmployees.length,
                mapEmployees.reduce((s, e) => s + Number(e.longitude), 0) / mapEmployees.length,
            ]
            : [11.1271, 78.6569];

    /* ── Drawer ── */
    const openDrawer = (emp) => {
        setSelectedEmployee(emp);
        setDrawerOpen(true);
    };

    /* ── Stat cards config ── */
    const statCards = [
        {
            icon: Users,
            label: "Total Employees",
            value: stats?.total_employees ?? employees.length,
            accent: "#166534",
            gradient: "linear-gradient(135deg,#fff 0%,#f0fdf4 100%)",
            iconBg: "#dcfce7",
        },
        {
            icon: Briefcase,
            label: "Working Now",
            value: stats?.working_now ?? stats?.working ?? 0,
            accent: "#059669",
            gradient: "linear-gradient(135deg,#fff 0%,#ecfdf5 100%)",
            iconBg: "#d1fae5",
        },
        {
            icon: Wifi,
            label: "Online",
            value: stats?.online ?? 0,
            accent: "#2563eb",
            gradient: "linear-gradient(135deg,#fff 0%,#eff6ff 100%)",
            iconBg: "#dbeafe",
        },
        {
            icon: WifiOff,
            label: "Offline",
            value: stats?.offline ?? 0,
            accent: "#d97706",
            gradient: "linear-gradient(135deg,#fff 0%,#fffbeb 100%)",
            iconBg: "#fef3c7",
        },
        {
            icon: AlertTriangle,
            label: "GPS Issues",
            value: stats?.gps_issues ?? stats?.gps_off ?? 0,
            accent: "#dc2626",
            gradient: "linear-gradient(135deg,#fff 0%,#fef2f2 100%)",
            iconBg: "#fee2e2",
        },
    ];

    const filterOptions = [
        { key: "all", label: "All", count: employees.length },
        { key: "working", label: "Working", count: employees.filter((e) => getStatusColor(e) === "green").length },
        { key: "offline", label: "Offline", count: employees.filter((e) => getStatusColor(e) === "yellow").length },
        { key: "gps_off", label: "GPS Off", count: employees.filter((e) => getStatusColor(e) === "red").length },
        { key: "inactive", label: "Inactive", count: employees.filter((e) => getStatusColor(e) === "gray").length },
    ];

    /* ── Loading screen ── */
    if (loading && employees.length === 0) {
        return (
            <div className="min-h-screen bg-[#f4f6f8] p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Bone className="w-48 h-7" />
                        <Bone className="w-72 h-4" />
                    </div>
                    <Bone className="w-32 h-9 rounded-xl" />
                </div>
                <StatsSkeleton />
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW }}>
                    <Bone className="w-full h-[420px]" />
                </div>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: SHADOW }}>
                    <div className="p-5 border-b border-gray-100"><Bone className="w-40 h-5" /></div>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
                            <Bone className="w-9 h-9 !rounded-xl" />
                            <Bone className="w-28 h-4" />
                            <Bone className="w-20 h-4" />
                            <Bone className="w-20 h-6 rounded-full" />
                            <Bone className="w-16 h-6 rounded-full" />
                            <Bone className="w-16 h-6 rounded-full" />
                            <Bone className="w-16 h-4" />
                            <Bone className="w-14 h-4 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="min-h-screen bg-[#f4f6f8]">
            {/* Ping keyframes for markers */}
            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>

            <div className="page-container">
                {/* ====== PAGE HEADER ====== */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20">
                                <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Tracking</h1>
                                <p className="text-gray-500 text-sm">Real-time GPS monitoring &amp; field employee status</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-xs text-gray-400" style={{ boxShadow: SHADOW }}>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live &mdash; <span className="text-gray-600 font-medium">{lastRefresh.toLocaleTimeString()}</span>
                        </div>
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-50"
                            style={{ boxShadow: SHADOW }}
                            title="Refresh now"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* ====== ERROR ====== */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3" style={{ boxShadow: SHADOW }}>
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ====== STAT CARDS ====== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {statCards.map((card) => (
                        <StatCard key={card.label} {...card} />
                    ))}
                </div>

                {/* ====== LIVE MAP ====== */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: SHADOW_LG }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-50">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Live Map</h2>
                                <p className="text-xs text-gray-400">{mapEmployees.length} field agents on map</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                            Auto-refresh 30s
                        </div>
                    </div>

                    <div className="relative h-[420px] lg:h-[500px]">
                        <MapContainer
                            center={mapCenter}
                            zoom={mapEmployees.length > 0 ? 8 : 7}
                            style={{ width: "100%", height: "100%" }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <MarkerClusterGroup
                                chunkedLoading
                                maxClusterRadius={50}
                                spiderfyOnMaxZoom
                                showCoverageOnHover={false}
                            >
                                {mapEmployees.map((emp, idx) => (
                                    <Marker
                                        key={emp.user_id || emp.id || idx}
                                        position={[Number(emp.latitude), Number(emp.longitude)]}
                                        icon={getMarkerIcon(emp)}
                                        eventHandlers={{ click: () => openDrawer(emp) }}
                                    >
                                        <Popup>
                                            <div className="min-w-[200px] p-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className="font-bold text-sm text-gray-900">{empName(emp)}</p>
                                                    {emp.is_suspicious && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">{emp.district || "\u2014"}</p>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Status</span>
                                                        <span className={`font-semibold ${emp.work_status?.toLowerCase() === "working" ? "text-emerald-600" : "text-gray-500"}`}>
                                                            {emp.work_status || "\u2014"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Tracking</span>
                                                        <span className={`font-semibold ${HEALTH_CFG[getTrackingHealth(emp)].text}`}>
                                                            {HEALTH_CFG[getTrackingHealth(emp)].label}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Last Seen</span>
                                                        <span className="font-medium text-gray-700">{timeAgo(emp.last_seen)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-400">Duration</span>
                                                        <span className="font-medium text-gray-700">{formatDuration(emp.duration_minutes ?? emp.work_duration)}</span>
                                                    </div>
                                                    {emp.battery_percent != null && (
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Battery</span>
                                                            <span className={`font-semibold ${emp.battery_percent > 50 ? "text-emerald-600" : emp.battery_percent > 20 ? "text-yellow-600" : "text-red-600"}`}>
                                                                {emp.battery_percent}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MarkerClusterGroup>
                        </MapContainer>
                        <MapLegend />
                    </div>
                </div>

                {/* ====== EMPLOYEE TABLE ====== */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: SHADOW_LG }}>
                    {/* Table Header Bar */}
                    <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Employee Status</h2>
                                    <p className="text-xs text-gray-400">{filteredEmployees.length} of {employees.length} employees</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search name, district, ID\u2026"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 transition-all"
                                    />
                                </div>

                                {/* Filter Pills */}
                                <div className="flex gap-1.5 flex-wrap">
                                    {filterOptions.map((f) => (
                                        <button
                                            key={f.key}
                                            onClick={() => setFilterStatus(f.key)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterStatus === f.key
                                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                : "bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                }`}
                                        >
                                            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {["Employee", "District", "Work Status", "Connection", "GPS", "Health", "Last Seen", "Today Duration", ""].map(
                                        (h) => (
                                            <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp, idx) => {
                                        const c = getStatusColor(emp);
                                        const dotMap = { green: "bg-emerald-500", yellow: "bg-yellow-500", red: "bg-red-500", gray: "bg-gray-400" };
                                        return (
                                            <tr
                                                key={emp.user_id || emp.id || idx}
                                                className="group hover:bg-emerald-50/40 transition-colors cursor-pointer"
                                                onClick={() => openDrawer(emp)}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex-shrink-0">
                                                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 ring-1 ring-gray-200 group-hover:ring-emerald-200 transition-all">
                                                                {empName(emp)[0]?.toUpperCase()}
                                                            </div>
                                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dotMap[c]}`} />
                                                            <span className={`absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${HEALTH_CFG[getTrackingHealth(emp)].dot}`} title={`Tracking: ${HEALTH_CFG[getTrackingHealth(emp)].label}`} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">{empName(emp)}</p>
                                                            {emp.employee_id && <p className="text-[11px] text-gray-400">{emp.employee_id}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-gray-600">{emp.district || "\u2014"}</td>
                                                <td className="px-5 py-3.5"><WorkStatusBadge status={emp.work_status} /></td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <ConnectionBadge status={emp.connection_status} />
                                                        {emp.is_suspicious && <ShieldAlert className="w-3.5 h-3.5 text-red-500" title="Suspicious activity" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5"><GpsBadge status={emp.gps_status} /></td>
                                                <td className="px-5 py-3.5"><TrackingHealthBadge employee={emp} /></td>
                                                <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{timeAgo(emp.last_seen)}</td>
                                                <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDuration(emp.duration_minutes ?? emp.work_duration)}</td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openDrawer(emp); }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-5 py-16 text-center">
                                            <Search className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                                            <p className="text-gray-400 font-medium">No employees match your filters</p>
                                            <p className="text-gray-300 text-sm mt-1">Try adjusting your search or filter criteria</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ====== EMPLOYEE DRAWER ====== */}
            <EmployeeDrawer
                employee={selectedEmployee}
                isOpen={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setTimeout(() => setSelectedEmployee(null), 300);
                }}
            />
        </div>
    );
}
