import { PageLoader, EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import AdminMapFrame from "../components/map/AdminMapFrame";
import { GpsStatusMapLegend } from "../components/map/MapLegendPanel";
import MapEmployeeViewport from "../components/map/MapEmployeeViewport";
import LiveMapMarkers from "../components/tracking/LiveMapMarkers";
import EmployeeRoutePanel from "../components/tracking/EmployeeRoutePanel";
import EmployeeDeviceInfoSection from "../components/tracking/EmployeeDeviceInfoSection";
import "leaflet/dist/leaflet.css";
import { useAdaptivePolling } from "../hooks/useAdaptivePolling";
import useCloseOnRouteChange from "../hooks/useCloseOnRouteChange";
import {
    recordApiFailure,
    recordApiSuccess,
    backendUnavailableMessage,
    isUnreachableError,
} from "../utils/apiBackoff";
import {
    getDashboardStats,
} from "../api/tracking.api";
import { Link } from "react-router-dom";
import {
    DutyGpsStatusBadge,
    DutyWorkdayBadge,
    DutyMovementBadge,
} from "../components/tracking/TrackingStatusBadges";
import {
    getDutyStatusColor,
    resolveCanonicalGpsStatusKey,
    resolveCanonicalDutyStatusKey,
    canonicalDutyLabel,
    canonicalGpsLabel,
    dutyMovementLabel,
    formatLastGpsUpdate,
} from "../utils/dutyTracking";
import { getMapCenter, getValidEmployeeLocations, isValidTamilNaduCoordinate } from "../utils/mapCoordinates";
import { empName } from "../utils/trackingDisplay";
import {
    Users,
    Wifi,
    WifiOff,
    AlertTriangle,
    MapPin,
    Clock,
    Eye,
    X,
    Search,
    Navigation,
    FileText,
    Radio,
    Smartphone,
    Route,
    Layers,
    TrendingUp,
    Gauge,
    Battery,
    ClipboardList,
} from "lucide-react";
import { getTrackingLive } from "../api/adminTracking.api";
import { BRAND, BRAND_GRADIENTS } from "../theme/brand";

const SHADOW = "var(--card-shadow)";
const SHADOW_LG = "var(--card-shadow-hover)";
const REFRESH_INTERVAL = 12_000;

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
   STAT CARD
   ================================================================ */
const StatCard = memo(({ icon: Icon, label, value, accent, gradient, iconBg }) => {
    const animVal = useCountUp(value);
    return (
        <div
            className="mini-kpi-card group cursor-default"
            style={{ background: gradient, boxShadow: SHADOW }}
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-[0.06]" style={{ background: accent }} />
            <div className="mini-kpi-icon" style={{ background: iconBg, color: accent }}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="mini-kpi-value">{animVal}</p>
            <div className="flex items-center justify-between mt-1">
                <p className="mini-kpi-label">{label}</p>
                <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
            </div>
        </div>
    );
});
StatCard.displayName = "StatCard";

/* ================================================================
   BADGE COMPONENTS — see TrackingStatusBadges.jsx
   ================================================================ */

/* ================================================================
   EMPLOYEE DRAWER
   ================================================================ */
const EmployeeDrawer = ({ employee, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState("summary");
    const userId = employee?.user_id ?? employee?.id;

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) setActiveTab("summary");
    }, [isOpen, userId]);

    const tabs = [
        { key: "summary", label: "Summary", icon: FileText },
        { key: "route", label: "Today Route", icon: Route },
    ];

    const color = employee ? getDutyStatusColor(employee) : "gray";
    const accentMap = {
        green: { grad: "from-emerald-500 to-emerald-700" },
        orange: { grad: "from-orange-500 to-amber-600" },
        red: { grad: "from-red-500 to-red-700" },
        gray: { grad: "from-gray-500 to-gray-700" },
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                aria-hidden="true"
                data-overlay="tracking-drawer-backdrop"
            />

            <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-300 ease-in-out translate-x-0">
                {employee && (
                    <div className="flex flex-col h-full">
                        <div className={`bg-gradient-to-r ${accentMap[color]?.grad ?? accentMap.gray.grad} p-6`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl ring-2 ring-white/30">
                                        {empName(employee)[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{empName(employee)}</h3>
                                        <p className="text-white/80 text-sm mt-0.5">
                                            {[employee.employee_id, employee.district].filter(Boolean).join(" · ") || "—"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                                                {canonicalDutyLabel(employee)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                                                {canonicalGpsLabel(employee)}
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

                        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                            {activeTab === "route" ? (
                                <EmployeeRoutePanel
                                    userId={userId}
                                    employee={employee}
                                    isActive={activeTab === "route"}
                                    drawerOpen={isOpen}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <DutyWorkdayBadge employee={employee} />
                                        <DutyGpsStatusBadge employee={employee} />
                                        <DutyMovementBadge employee={employee} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: "Last GPS update", value: formatLastGpsUpdate(employee), icon: Eye },
                                            { label: "Battery", value: employee.battery_level != null ? `${employee.battery_level}%` : "—", icon: Battery },
                                            { label: "Accuracy", value: employee.accuracy != null ? `${Math.round(employee.accuracy)} m` : "—", icon: Gauge },
                                            { label: "Speed", value: employee.speed != null ? `${Number(employee.speed).toFixed(1)} km/h` : "—", icon: Navigation },
                                            { label: "Latitude", value: employee.latitude != null ? Number(employee.latitude).toFixed(5) : "—", icon: MapPin },
                                            { label: "Longitude", value: employee.longitude != null ? Number(employee.longitude).toFixed(5) : "—", icon: MapPin },
                                        ].map((item) => (
                                            <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100" style={{ boxShadow: SHADOW }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <item.icon className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {(employee.phone || employee.employee_id) && (
                                        <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4" style={{ boxShadow: SHADOW }}>
                                            <Smartphone className="w-5 h-5 text-blue-600" />
                                            <div>
                                                {employee.employee_id && <p className="text-xs text-gray-400">ID: {employee.employee_id}</p>}
                                                {employee.phone && <p className="text-sm text-gray-700">{employee.phone}</p>}
                                            </div>
                                        </div>
                                    )}

                                    <EmployeeDeviceInfoSection employee={employee} summary={employee} />

                                    {userId ? (
                                        <Link
                                            to="/reports"
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            View reports &amp; exports
                                        </Link>
                                    ) : null}
                                </div>
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

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        setSelectedEmployee(null);
    }, []);
    useCloseOnRouteChange(closeDrawer, drawerOpen);

    /* ── Data Loading ── */
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [liveRes, statsRes] = await Promise.allSettled([
                getTrackingLive(),
                getDashboardStats(),
            ]);

            const liveErr = liveRes.status === "rejected" ? liveRes.reason : null;
            if (isUnreachableError(liveErr)) {
                recordApiFailure(liveErr);
                setError(backendUnavailableMessage());
                return;
            }

            recordApiSuccess();
            setError(null);

            if (liveRes.status === "fulfilled") {
                setEmployees(liveRes.value?.employees ?? []);
            }
            if (statsRes.status === "fulfilled" && statsRes.value) {
                setStats(statsRes.value);
            }
            setLastRefresh(new Date());
        } catch (err) {
            if (isUnreachableError(err)) {
                recordApiFailure(err);
                setError(backendUnavailableMessage());
            } else {
                setError("Failed to load tracking data.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useAdaptivePolling(loadData, REFRESH_INTERVAL, [loadData]);

    const dutyStats = useMemo(() => {
        const onDuty = employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "on_duty");
        return {
            on_duty: onDuty.length,
            gps_active: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_active").length,
            gps_delayed: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_delayed").length,
            gps_lost: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_lost").length,
            gps_off: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_off").length,
            logged_out: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "logged_out").length,
        };
    }, [employees]);

    /* ── Filtered employees ── */
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const name = empName(emp).toLowerCase();
            const id = String(emp.employee_id ?? "").toLowerCase();
            const district = (emp.district || "").toLowerCase();
            const matchSearch =
                !searchTerm ||
                name.includes(searchTerm.toLowerCase()) ||
                id.includes(searchTerm.toLowerCase()) ||
                district.includes(searchTerm.toLowerCase());
            const gps = resolveCanonicalGpsStatusKey(emp);
            const duty = resolveCanonicalDutyStatusKey(emp);
            const matchFilter =
                filterStatus === "all" ||
                (filterStatus === "on_duty" && duty === "on_duty") ||
                (filterStatus === "logged_out" && duty === "logged_out") ||
                (filterStatus === "gps_active" && gps === "gps_active") ||
                (filterStatus === "gps_delayed" && gps === "gps_delayed") ||
                (filterStatus === "gps_lost" && gps === "gps_lost") ||
                (filterStatus === "gps_off" && gps === "gps_off");
            return matchSearch && matchFilter;
        });
    }, [employees, searchTerm, filterStatus]);

    /* ── Map helpers (Tamil Nadu bounds only) ── */
    const mapEmployees = useMemo(
        () =>
            filteredEmployees.filter(
                (emp) =>
                    emp.is_on_duty &&
                    isValidTamilNaduCoordinate(emp.latitude, emp.longitude)
            ),
        [filteredEmployees]
    );

    const validMapLocations = useMemo(
        () => getValidEmployeeLocations(mapEmployees),
        [mapEmployees]
    );

    const { center: mapCenter, zoom: mapZoom } = useMemo(
        () => getMapCenter(validMapLocations),
        [validMapLocations]
    );

    /* ── Drawer ── */
    const openDrawer = (emp) => {
        setSelectedEmployee(emp);
        setDrawerOpen(true);
    };

    /* ── Stat cards config ── */
    const statCards = [
        {
            icon: Users,
            label: "On Duty",
            value: dutyStats.on_duty,
            accent: BRAND.primary,
            gradient: BRAND_GRADIENTS.cardGreen,
            iconBg: "#dcfce7",
        },
        {
            icon: MapPin,
            label: "GPS Active",
            value: dutyStats.gps_active,
            accent: BRAND.primaryDark,
            gradient: "linear-gradient(135deg,#fff 0%,#ecfdf5 100%)",
            iconBg: "#d1fae5",
        },
        {
            icon: Clock,
            label: "GPS Delayed",
            value: dutyStats.gps_delayed,
            accent: BRAND.warning,
            gradient: BRAND_GRADIENTS.cardAccent,
            iconBg: BRAND.warningLight,
        },
        {
            icon: AlertTriangle,
            label: "GPS Lost",
            value: dutyStats.gps_lost,
            accent: BRAND.danger,
            gradient: "linear-gradient(135deg,#fff 0%,#fef2f2 100%)",
            iconBg: BRAND.dangerLight,
        },
        {
            icon: WifiOff,
            label: "GPS Off",
            value: dutyStats.gps_off,
            accent: "#64748b",
            gradient: "linear-gradient(135deg,#fff 0%,#f8fafc 100%)",
            iconBg: "#e2e8f0",
        },
    ];

    const filterOptions = [
        { key: "all", label: "All", count: employees.length },
        { key: "on_duty", label: "On duty", count: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "on_duty").length },
        { key: "gps_active", label: "GPS Active", count: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_active").length },
        { key: "gps_delayed", label: "GPS Delayed", count: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_delayed").length },
        { key: "gps_lost", label: "GPS Lost", count: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_lost").length },
        { key: "gps_off", label: "GPS Off", count: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_off").length },
    ];

    /* ── Loading screen ── */
    if (loading && employees.length === 0) {
        return (
            <div className="page-container">
                <PageLoader label="Loading live tracking…" />
            </div>
        );
    }

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <>
            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>

            <div className="page-container space-y-5">
                <div className="tracking-page-header">
                    <div className="flex items-center gap-3">
                        <div className="tracking-page-header__icon">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="page-title">Live Tracking</h1>
                            <p className="page-subtitle">Real-time GPS monitoring and field employee status</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="tracking-live-pill">
                            <div className="w-2 h-2 rounded-full bg-[var(--brand-primary-light)] animate-pulse" />
                            Live — <span className="text-slate-700 font-semibold tabular-nums">{lastRefresh.toLocaleTimeString()}</span>
                            <span className="text-slate-500">· auto 12s</span>
                        </div>
                        <Link to="/tracking/routes" className="btn btn-secondary btn-md">
                            <Route className="w-4 h-4" />
                            Route History
                        </Link>
                        <Link to="/reports" className="btn btn-secondary btn-md">
                            <ClipboardList className="w-4 h-4" />
                            Reports
                        </Link>
                    </div>
                </div>

                {/* ====== ERROR ====== */}
                {error && (
                    <ErrorRetry
                        compact
                        message={friendlyErrorMessage(error, "Couldn't load tracking data. Please try again.")}
                        onRetry={() => loadData(true)}
                    />
                )}

                {/* ====== STAT CARDS ====== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {statCards.map((card) => (
                        <StatCard key={card.label} {...card} />
                    ))}
                </div>

                {/* ====== LIVE MAP ====== */}
                <div className="section-card overflow-hidden" style={{ boxShadow: SHADOW_LG }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
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
                            Auto-refresh 12s
                        </div>
                    </div>

                    <div className="relative h-[420px] lg:h-[500px]">
                        <AdminMapFrame
                            center={mapCenter}
                            zoom={mapZoom}
                            height="100%"
                            legend={<GpsStatusMapLegend />}
                            legendTitle="Employee GPS"
                        >
                            <MapEmployeeViewport locations={validMapLocations} refitMode="roster" />
                            <LiveMapMarkers employees={mapEmployees} onSelect={openDrawer} />
                        </AdminMapFrame>
                        {mapEmployees.length === 0 && (
                            <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none bg-white/80 backdrop-blur-[1px]">
                                <div className="pointer-events-auto max-w-sm px-6">
                                    <EmptyState
                                        icon={MapPin}
                                        title="No employees on duty"
                                        subtitle="Map pins appear when field agents start duty and share GPS from the mobile app."
                                        action={
                                            <Link to="/tracking/routes" className="btn btn-secondary btn-sm">
                                                View route history
                                            </Link>
                                        }
                                        className="py-8"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ====== EMPLOYEE TABLE ====== */}
                <div className="section-card overflow-hidden" style={{ boxShadow: SHADOW_LG }}>
                    {/* Table Header Bar */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
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
                                            className={`tracking-filter-chip ${filterStatus === f.key ? "tracking-filter-chip--active" : "tracking-filter-chip--idle"}`}
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
                                    {[
                                        "Employee",
                                        "Duty",
                                        "GPS",
                                        "Movement",
                                        "Last GPS update",
                                        "Battery",
                                        "Accuracy",
                                        "Speed",
                                        "",
                                    ].map((h) => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp, idx) => {
                                        const c = getDutyStatusColor(emp);
                                        const dotMap = {
                                            green: "bg-emerald-500",
                                            orange: "bg-amber-500",
                                            red: "bg-red-500",
                                            gray: "bg-gray-400",
                                            slate: "bg-slate-500",
                                        };
                                        return (
                                            <tr
                                                key={emp.user_id || emp.id || idx}
                                                className="group hover:bg-emerald-50/40 transition-colors cursor-pointer"
                                                onClick={() => openDrawer(emp)}
                                            >
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex-shrink-0">
                                                            <ProfileAvatar entity={emp} name={empName(emp)} size="md" variant="neutral" />
                                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dotMap[c] ?? dotMap.gray}`} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors truncate">{empName(emp)}</p>
                                                            <p className="text-[11px] text-gray-400 truncate">
                                                                {[emp.district, emp.employee_id].filter(Boolean).join(" · ") || "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5"><DutyWorkdayBadge employee={emp} /></td>
                                                <td className="px-4 py-3.5"><DutyGpsStatusBadge employee={emp} /></td>
                                                <td className="px-4 py-3.5"><DutyMovementBadge employee={emp} /></td>
                                                <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                                                    {formatLastGpsUpdate(emp)}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                                                    {emp.battery_level != null ? `${emp.battery_level}%` : "—"}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                                                    {emp.accuracy != null ? `${Math.round(emp.accuracy)} m` : "—"}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-gray-700 tabular-nums">
                                                    {emp.speed != null ? `${Number(emp.speed).toFixed(1)}` : "—"}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); openDrawer(emp); }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 border border-emerald-200"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-4">
                                            <EmptyState
                                                icon={Search}
                                                title="No employees match your filters"
                                                subtitle="Try adjusting search or filter criteria."
                                                className="py-12"
                                            />
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
                onClose={closeDrawer}
            />
        </>
    );
}
