import { EmptyState } from "../components/ui/command";
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
import { getDashboardStats } from "../api/tracking.api";
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
    formatLastGpsUpdate,
    dedupeLiveEmployees,
    isOnDutyWorking,
} from "../utils/dutyTracking";
import { getMapCenter, getValidEmployeeLocations, isValidTamilNaduCoordinate } from "../utils/mapCoordinates";
import { empName } from "../utils/trackingDisplay";
import {
    Users,
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
    Gauge,
    Battery,
    ClipboardList,
    Activity,
    Square,
} from "lucide-react";
import { forceEndEmployeeDuty, getTrackingLive } from "../api/adminTracking.api";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { normalizeForceEndError } from "../utils/apiErrorNormalize";
import { BRAND, BRAND_GRADIENTS } from "../theme/brand";

const REFRESH_INTERVAL = 12_000;

const useCountUp = (target, duration = 900) => {
    const [val, setVal] = useState(0);
    const prev = useRef(0);
    useEffect(() => {
        const s = prev.current;
        const e = Number(target) || 0;
        if (s === e) {
            setVal(e);
            return;
        }
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

const StatCard = memo(({ icon: Icon, label, value, accent, gradient, iconBg }) => {
    const animVal = useCountUp(value);
    return (
        <div className="tracking-stat-card group">
            <div className="tracking-stat-card__accent" style={{ background: accent }} aria-hidden="true" />
            <div className="flex items-start gap-3">
                <div className="tracking-stat-card__icon" style={{ background: iconBg, color: accent }}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="tracking-stat-card__value">{animVal}</p>
                    <p className="tracking-stat-card__label">{label}</p>
                </div>
            </div>
        </div>
    );
});
StatCard.displayName = "StatCard";

function TrackingSkeleton() {
    return (
        <div className="tracking-command" aria-busy="true" aria-label="Loading live tracking">
            <div className="tracking-command-header p-5 space-y-3">
                <div className="skeleton h-8 w-48 rounded-lg" />
                <div className="skeleton h-4 w-72 rounded" />
            </div>
            <div className="skeleton h-28 w-full rounded-2xl" />
            <div className="tracking-command-layout">
                <div className="tracking-map-panel">
                    <div className="tracking-skeleton-map" />
                </div>
                <div className="tracking-roster-panel">
                    <div className="tracking-skeleton-roster">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="tracking-skeleton-card">
                                <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-4 w-3/4 rounded" />
                                    <div className="skeleton h-3 w-1/2 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmployeeRosterCard({ emp, onView }) {
    const c = getDutyStatusColor(emp);
    const dotMap = {
        green: "bg-emerald-500",
        orange: "bg-amber-500",
        red: "bg-red-500",
        gray: "bg-slate-400",
        slate: "bg-slate-500",
    };

    return (
        <article
            className="tracking-emp-card group"
            onClick={() => onView(emp)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onView(emp);
                }
            }}
        >
            <div className="tracking-emp-card__head">
                <div className="tracking-emp-card__avatar-wrap">
                    <ProfileAvatar entity={emp} name={empName(emp)} size="md" variant="neutral" />
                    <span
                        className={`tracking-emp-card__status-dot ${dotMap[c] ?? dotMap.gray}`}
                        aria-hidden="true"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="tracking-emp-card__name group-hover:text-emerald-700 transition-colors">
                        {empName(emp)}
                    </p>
                    <p className="tracking-emp-card__meta">
                        {[emp.district, emp.employee_id].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="tracking-emp-card__badges">
                        <DutyWorkdayBadge employee={emp} />
                        <DutyGpsStatusBadge employee={emp} />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onView(emp);
                    }}
                    className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    aria-label={`View ${empName(emp)}`}
                >
                    <Eye className="w-4 h-4" />
                </button>
            </div>

            <div className="tracking-emp-card__metrics">
                <div className="tracking-emp-card__metric">
                    <p className="tracking-emp-card__metric-label">GPS</p>
                    <p className="tracking-emp-card__metric-value truncate">
                        {formatLastGpsUpdate(emp)}
                    </p>
                </div>
                <div className="tracking-emp-card__metric">
                    <p className="tracking-emp-card__metric-label">Battery</p>
                    <p className="tracking-emp-card__metric-value">
                        {emp.battery_level != null ? `${emp.battery_level}%` : "—"}
                    </p>
                </div>
                <div className="tracking-emp-card__metric">
                    <p className="tracking-emp-card__metric-label">Speed</p>
                    <p className="tracking-emp-card__metric-value">
                        {emp.speed != null ? `${Number(emp.speed).toFixed(1)}` : "—"}
                    </p>
                </div>
            </div>

            <div className="mt-2">
                <DutyMovementBadge employee={emp} />
            </div>
        </article>
    );
}

const EmployeeDrawer = ({ employee, isOpen, onClose, onForceEndSuccess }) => {
    const [activeTab, setActiveTab] = useState("summary");
    const [confirmEnd, setConfirmEnd] = useState(false);
    const [ending, setEnding] = useState(false);
    const [endError, setEndError] = useState("");
    const [endReason, setEndReason] = useState("");
    const endInFlightRef = useRef(false);
    const userId = employee?.user_id ?? employee?.id;
    const canForceEnd = Boolean(userId) && isOnDutyWorking(employee);

    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape" && !ending) onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose, ending]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab("summary");
            setConfirmEnd(false);
            setEndError("");
            setEndReason("");
        }
    }, [isOpen, userId]);

    const handleForceEnd = async () => {
        if (!userId || endInFlightRef.current) return;
        endInFlightRef.current = true;
        setEnding(true);
        setEndError("");
        try {
            const result = await forceEndEmployeeDuty(userId);
            const reason =
                result?.end_reason ??
                result?.duty_end_reason ??
                result?.reason ??
                "Admin ended";
            setEndReason(String(reason));
            setConfirmEnd(false);
            onForceEndSuccess?.(userId, result);
        } catch (err) {
            setEndError(normalizeForceEndError(err));
        } finally {
            endInFlightRef.current = false;
            setEnding(false);
        }
    };

    const tabs = [
        { key: "summary", label: "Summary", icon: FileText },
        { key: "route", label: "Today’s route", icon: Route },
    ];

    const color = employee ? getDutyStatusColor(employee) : "gray";
    const heroGrad = {
        green: "from-emerald-600 to-emerald-800",
        orange: "from-amber-500 to-orange-600",
        red: "from-red-500 to-red-700",
        gray: "from-slate-600 to-slate-800",
        slate: "from-slate-500 to-slate-700",
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="tracking-drawer-backdrop"
                onClick={ending ? undefined : onClose}
                aria-hidden="true"
                data-overlay="tracking-drawer-backdrop"
            />

            <div className="tracking-drawer">
                {employee && (
                    <div className="flex flex-col h-full">
                        <div className={`tracking-drawer-hero bg-gradient-to-br ${heroGrad[color] ?? heroGrad.gray}`}>
                            <div className="tracking-drawer-hero__glow -top-8 -right-8 w-36 h-36" aria-hidden="true" />
                            <div className="relative z-10 flex items-start justify-between gap-3">
                                <div className="flex items-center gap-4 min-w-0">
                                    <ProfileAvatar
                                        entity={employee}
                                        name={empName(employee)}
                                        size="lg"
                                        variant="neutral"
                                    />
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-bold truncate">{empName(employee)}</h3>
                                        <p className="text-white/80 text-sm mt-0.5 truncate">
                                            {[employee.employee_id, employee.district].filter(Boolean).join(" · ") || "—"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-white/15 text-white border border-white/20">
                                                {canonicalDutyLabel(employee)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-white/15 text-white border border-white/20">
                                                {canonicalGpsLabel(employee)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={ending}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 disabled:opacity-50"
                                    aria-label="Close panel"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="tracking-drawer-tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`tracking-drawer-tab ${
                                        activeTab === tab.key
                                            ? "tracking-drawer-tab--active"
                                            : "tracking-drawer-tab--idle"
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" aria-hidden="true" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="tracking-drawer-body">
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

                                    {endReason ? (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                            Workday ended. Reason: {String(endReason).replace(/_/g, " ")}
                                        </div>
                                    ) : null}
                                    {endError ? (
                                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                            {endError}
                                        </div>
                                    ) : null}

                                    <div className="tracking-drawer-metric-grid">
                                        {[
                                            { label: "Last GPS update", value: formatLastGpsUpdate(employee), icon: Eye },
                                            { label: "Battery", value: employee.battery_level != null ? `${employee.battery_level}%` : "—", icon: Battery },
                                            { label: "Accuracy", value: employee.accuracy != null ? `${Math.round(employee.accuracy)} m` : "—", icon: Gauge },
                                            { label: "Speed", value: employee.speed != null ? `${Number(employee.speed).toFixed(1)} km/h` : "—", icon: Navigation },
                                            { label: "Latitude", value: employee.latitude != null ? Number(employee.latitude).toFixed(5) : "—", icon: MapPin },
                                            { label: "Longitude", value: employee.longitude != null ? Number(employee.longitude).toFixed(5) : "—", icon: MapPin },
                                        ].map((item) => (
                                            <div key={item.label} className="tracking-drawer-metric">
                                                <p className="tracking-drawer-metric__label">
                                                    <item.icon className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                                    {item.label}
                                                </p>
                                                <p className="tracking-drawer-metric__value">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {(employee.phone || employee.employee_id) && (
                                        <div className="dashboard-section-card p-4 flex items-center gap-4">
                                            <Smartphone className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
                                            <div>
                                                {employee.employee_id && (
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                                        ID {employee.employee_id}
                                                    </p>
                                                )}
                                                {employee.phone && (
                                                    <p className="text-sm font-semibold text-slate-800">{employee.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <EmployeeDeviceInfoSection employee={employee} summary={employee} />

                                    {canForceEnd ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEndError("");
                                                setConfirmEnd(true);
                                            }}
                                            disabled={ending}
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                        >
                                            <Square className="w-4 h-4" aria-hidden="true" />
                                            Force end workday
                                        </button>
                                    ) : null}

                                    {userId ? (
                                        <Link
                                            to="/reports"
                                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                                        >
                                            <ClipboardList className="w-4 h-4" aria-hidden="true" />
                                            View reports &amp; exports
                                        </Link>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmEnd}
                title="Force end workday?"
                message={`End ${empName(employee)}’s active duty session now? Route history will be preserved.`}
                onConfirm={handleForceEnd}
                onCancel={() => !ending && setConfirmEnd(false)}
                loading={ending}
                variant="danger"
            />
        </>
    );
};

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
                setEmployees(dedupeLiveEmployees(liveRes.value?.employees ?? []));
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
        const working = employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "working");
        return {
            working: working.length,
            stopped: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "stopped").length,
            auto_ended: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "auto_ended").length,
            admin_ended: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "admin_ended").length,
            gps_active: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_active").length,
            gps_stale: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_stale").length,
            gps_offline: employees.filter((e) => resolveCanonicalGpsStatusKey(e) === "gps_offline").length,
        };
    }, [employees]);

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
                (filterStatus === "working" && duty === "working") ||
                (filterStatus === "stopped" && duty === "stopped") ||
                (filterStatus === "auto_ended" && duty === "auto_ended") ||
                (filterStatus === "admin_ended" && duty === "admin_ended") ||
                (filterStatus === "gps_active" && gps === "gps_active") ||
                (filterStatus === "gps_stale" && gps === "gps_stale") ||
                (filterStatus === "gps_offline" && gps === "gps_offline");
            return matchSearch && matchFilter;
        });
    }, [employees, searchTerm, filterStatus]);

    const mapEmployees = useMemo(
        () =>
            filteredEmployees.filter(
                (emp) =>
                    isOnDutyWorking(emp) &&
                    emp.latitude != null &&
                    emp.longitude != null &&
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

    const openDrawer = (emp) => {
        setSelectedEmployee(emp);
        setDrawerOpen(true);
    };

    const handleForceEndSuccess = useCallback(
        (userId, result) => {
            const reason = result?.end_reason ?? result?.duty_end_reason ?? result?.reason ?? null;
            setEmployees((prev) =>
                prev.map((emp) => {
                    if (String(emp.user_id ?? emp.id) !== String(userId)) return emp;
                    return {
                        ...emp,
                        is_on_duty: false,
                        duty_status: "ADMIN_ENDED",
                        work_status: "ADMIN_ENDED",
                        end_reason: reason ?? "ADMIN_ENDED",
                    };
                })
            );
            setSelectedEmployee((prev) => {
                if (!prev || String(prev.user_id ?? prev.id) !== String(userId)) return prev;
                return {
                    ...prev,
                    is_on_duty: false,
                    duty_status: "ADMIN_ENDED",
                    work_status: "ADMIN_ENDED",
                    end_reason: reason ?? "ADMIN_ENDED",
                };
            });
            loadData(true);
        },
        [loadData]
    );

    const statCards = [
        {
            icon: Users,
            label: "Working",
            value: dutyStats.working,
            accent: BRAND.primary,
            gradient: BRAND_GRADIENTS.cardGreen,
            iconBg: "#dcfce7",
        },
        {
            icon: MapPin,
            label: "GPS online",
            value: dutyStats.gps_active,
            accent: BRAND.primaryDark,
            gradient: "linear-gradient(135deg,#fff 0%,#ecfdf5 100%)",
            iconBg: "#d1fae5",
        },
        {
            icon: Clock,
            label: "Location stale",
            value: dutyStats.gps_stale,
            accent: BRAND.warning,
            gradient: BRAND_GRADIENTS.cardAccent,
            iconBg: BRAND.warningLight,
        },
        {
            icon: WifiOff,
            label: "GPS offline",
            value: dutyStats.gps_offline,
            accent: "#64748b",
            gradient: "linear-gradient(135deg,#fff 0%,#f8fafc 100%)",
            iconBg: "#e2e8f0",
        },
        {
            icon: AlertTriangle,
            label: "Auto ended",
            value: dutyStats.auto_ended,
            accent: BRAND.danger,
            gradient: "linear-gradient(135deg,#fff 0%,#fef2f2 100%)",
            iconBg: BRAND.dangerLight,
        },
    ];

    const filterOptions = [
        { key: "all", label: "All", count: employees.length },
        { key: "working", label: "Working", count: dutyStats.working },
        { key: "gps_active", label: "GPS online", count: dutyStats.gps_active },
        { key: "gps_stale", label: "Location stale", count: dutyStats.gps_stale },
        { key: "gps_offline", label: "GPS offline", count: dutyStats.gps_offline },
        { key: "stopped", label: "Stopped", count: dutyStats.stopped },
    ];

    const todaySummary = [
        { label: "Working", value: dutyStats.working },
        { label: "GPS online", value: dutyStats.gps_active },
        { label: "Location stale", value: dutyStats.gps_stale },
        { label: "GPS offline", value: dutyStats.gps_offline },
        { label: "Total roster", value: stats?.total_employees ?? employees.length },
        { label: "On map", value: mapEmployees.length },
    ];

    if (loading && employees.length === 0) {
        return <TrackingSkeleton />;
    }

    return (
        <>
            <div className="tracking-command">
                <header className="tracking-command-header">
                    <div className="tracking-command-header__inner">
                        <div className="tracking-command-header__brand">
                            <div className="tracking-command-header__icon">
                                <Layers className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="tracking-command-header__title">Live Tracking</h1>
                                <p className="tracking-command-header__subtitle">
                                    Real-time GPS command center for field operations
                                </p>
                            </div>
                        </div>

                        <div className="tracking-command-header__actions">
                            <div className="tracking-live-pill">
                                <span className="tracking-live-pill__dot" aria-hidden="true" />
                                Live
                                <span className="text-slate-700 font-bold tabular-nums">
                                    {lastRefresh.toLocaleTimeString()}
                                </span>
                                <span className="text-slate-400 font-medium">· 12s sync</span>
                                {refreshing ? (
                                    <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" aria-hidden="true" />
                                ) : null}
                            </div>
                            <Link to="/tracking/routes" className="btn btn-secondary btn-md">
                                <Route className="w-4 h-4" aria-hidden="true" />
                                Route history
                            </Link>
                            <Link to="/reports" className="btn btn-secondary btn-md">
                                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                                Reports
                            </Link>
                        </div>
                    </div>
                </header>

                {error && (
                    <ErrorRetry
                        compact
                        message={friendlyErrorMessage(error, "Couldn't load tracking data. Please try again.")}
                        onRetry={() => loadData(true)}
                    />
                )}

                <section className="tracking-today-summary" aria-label="Today's operations summary">
                    <div className="tracking-today-summary__glow -top-10 -right-10 w-44 h-44" aria-hidden="true" />
                    <div className="tracking-today-summary__inner">
                        <p className="tracking-today-summary__label">Today&apos;s field operations</p>
                        <div className="tracking-today-summary__grid">
                            {todaySummary.map((cell) => (
                                <div key={cell.label} className="visit-report-summary__cell">
                                    <p className="visit-report-summary__cell-label">{cell.label}</p>
                                    <p className="visit-report-summary__cell-value tabular-nums">{cell.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {statCards.map((card) => (
                        <StatCard key={card.label} {...card} />
                    ))}
                </div>

                <div className="tracking-command-layout">
                    <section className="tracking-map-panel" aria-label="Live map">
                        <div className="tracking-map-panel__head">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="list-meta-icon list-meta-icon--crop">
                                    <MapPin className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Live operations map</h2>
                                    <p className="text-xs text-slate-500 truncate">
                                        {mapEmployees.length} agents plotted · Tamil Nadu bounds
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" aria-hidden="true" />
                                Auto-refresh
                            </div>
                        </div>

                        <div className="tracking-map-panel__body">
                            <div className="tracking-map-overlay">
                                <span className="tracking-map-overlay__pill">
                                    <Users className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                                    {mapEmployees.length} on map
                                </span>
                                <span className="tracking-map-overlay__pill">
                                    <Activity className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                                    {dutyStats.gps_active} GPS live
                                </span>
                            </div>

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
                                <div className="tracking-map-empty">
                                    <div className="max-w-sm px-6 pointer-events-auto">
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
                    </section>

                    <aside className="tracking-roster-panel" aria-label="Employee roster">
                        <div className="tracking-roster-panel__head">
                            <div className="flex items-center gap-3 min-w-0 w-full">
                                <div className="list-meta-icon list-meta-icon--crop shrink-0">
                                    <Users className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm font-bold text-slate-900">Field roster</h2>
                                    <p className="text-xs text-slate-500">
                                        {filteredEmployees.length} of {employees.length} employees
                                    </p>
                                </div>
                            </div>

                            <div className="tracking-roster-search w-full">
                                <Search className="search-icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    placeholder="Search name, district, ID…"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                    aria-label="Search employees"
                                />
                            </div>

                            <div className="tracking-roster-filters w-full">
                                {filterOptions.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setFilterStatus(f.key)}
                                        className={`tracking-filter-chip shrink-0 ${
                                            filterStatus === f.key
                                                ? "tracking-filter-chip--active"
                                                : "tracking-filter-chip--idle"
                                        }`}
                                    >
                                        {f.label}
                                        <span className="ml-1 opacity-70 tabular-nums">{f.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="tracking-roster-body">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp, idx) => (
                                    <EmployeeRosterCard
                                        key={emp.user_id || emp.id || idx}
                                        emp={emp}
                                        onView={openDrawer}
                                    />
                                ))
                            ) : (
                                <div className="tracking-roster-empty">
                                    <EmptyState
                                        icon={Search}
                                        title="No employees match your filters"
                                        subtitle="Try adjusting search or filter criteria."
                                    />
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <EmployeeDrawer
                employee={selectedEmployee}
                isOpen={drawerOpen}
                onClose={closeDrawer}
                onForceEndSuccess={handleForceEndSuccess}
            />
        </>
    );
}
