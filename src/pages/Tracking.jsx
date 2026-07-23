import { EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import AdminMapCard from "../components/map/AdminMapCard";
import { GpsStatusMapLegend } from "../components/map/MapLegendPanel";
import MapEmployeeViewport from "../components/map/MapEmployeeViewport";
import LiveMapMarkers from "../components/tracking/LiveMapMarkers";
import LiveTrackingSelectedSummary from "../components/tracking/LiveTrackingSelectedSummary";
import LiveMapPanController from "../components/tracking/LiveMapPanController";
import LiveMapFullscreenController from "../components/tracking/LiveMapFullscreenController";
import EmployeeRoutePanel from "../components/tracking/EmployeeRoutePanel";
import EmployeeDeviceInfoSection from "../components/tracking/EmployeeDeviceInfoSection";
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
    resolveCanonicalTrackingStatusKey,
    canonicalDutyLabel,
    canonicalGpsLabel,
    formatLastGpsUpdate,
    formatLastHeartbeat,
    dedupeLiveEmployees,
    isOnDutyWorking,
    hasLiveMapLocation,
    liveLocationStatusLabel,
    mergeLiveEmployeeUpdate,
    isNoLocationYet,
} from "../utils/dutyTracking";
import {
    saveLiveTrackingSnapshot,
    loadLiveTrackingSnapshot,
} from "../utils/mapSnapshotCache";
import { getMapCenter, getValidEmployeeLocations, isValidTamilNaduCoordinate, TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../utils/mapCoordinates";
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
    Maximize2,
    RefreshCw,
} from "lucide-react";
import { forceEndEmployeeDuty, getTrackingLive } from "../api/adminTracking.api";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { normalizeForceEndError } from "../utils/apiErrorNormalize";
import { LIVE_TRACKING_POLL_MS } from "../utils/trackingPoll";
import { BRAND, BRAND_GRADIENTS } from "../theme/brand";

const REFRESH_INTERVAL = LIVE_TRACKING_POLL_MS;

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

function EmployeeRosterCard({ emp, selected = false, onSelect, onOpenDrawer }) {
    const c = getDutyStatusColor(emp);
    const dotMap = {
        green: "bg-emerald-500",
        orange: "bg-amber-500",
        red: "bg-red-500",
        gray: "bg-slate-400",
        slate: "bg-slate-500",
        blue: "bg-sky-500",
    };
    const hasLoc = hasLiveMapLocation(emp);
    const trackingKey = resolveCanonicalTrackingStatusKey(emp);
    const trackingLabel = liveLocationStatusLabel(emp);
    const dutyLabel = canonicalDutyLabel(emp);
    const lastLoc = formatLastGpsUpdate(emp);
    const heartbeat = formatLastHeartbeat(emp);

    let detailLine = null;
    if (trackingKey === "no_location" || !hasLoc) {
        detailLine = "Waiting for first GPS update";
    } else if (heartbeat) {
        detailLine =
            trackingKey === "gps_offline"
                ? `Last heartbeat ${heartbeat}`
                : `Heartbeat ${heartbeat}`;
        if (lastLoc) detailLine += ` · Location ${lastLoc}`;
    } else if (lastLoc) {
        detailLine = `Last location ${lastLoc}`;
    }

    return (
        <article
            className={`tracking-emp-card group${selected ? " tracking-emp-card--selected" : ""}`}
            onClick={() => onSelect?.(emp)}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(emp);
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
                        {[emp.employee_code ?? emp.employee_id, emp.district].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="tracking-emp-card__badges">
                        <DutyWorkdayBadge employee={emp} />
                        <DutyGpsStatusBadge employee={emp} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                        {dutyLabel} · {trackingLabel}
                        {detailLine ? (
                            <>
                                <br />
                                {detailLine}
                            </>
                        ) : null}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenDrawer?.(emp);
                    }}
                    className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    aria-label={`Open ${empName(emp)} details`}
                >
                    <Eye className="w-4 h-4" />
                </button>
            </div>
        </article>
    );
}

const EmployeeDrawer = ({ employee, isOpen, onClose, onForceEndSuccess, routeRefreshToken = 0 }) => {
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
                                    refreshToken={routeRefreshToken}
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
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [routeRefreshToken, setRouteRefreshToken] = useState(0);
    const [fitRequestId, setFitRequestId] = useState(0);
    const [showingCachedLive, setShowingCachedLive] = useState(false);
    const employeesRef = useRef([]);
    const liveRequestSeqRef = useRef(0);
    const liveAbortRef = useRef(null);

    useEffect(() => {
        employeesRef.current = employees;
    }, [employees]);

    useEffect(() => {
        return () => {
            liveAbortRef.current?.abort?.();
        };
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);
    useCloseOnRouteChange(closeDrawer, drawerOpen);

    const loadData = useCallback(async (isRefresh = false) => {
        const seq = ++liveRequestSeqRef.current;
        liveAbortRef.current?.abort?.();
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        liveAbortRef.current = controller;

        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [liveRes, statsRes] = await Promise.allSettled([
                getTrackingLive({ signal: controller?.signal }),
                getDashboardStats(),
            ]);

            if (seq !== liveRequestSeqRef.current) {
                return;
            }

            const liveErr = liveRes.status === "rejected" ? liveRes.reason : null;
            if (liveRes.status === "rejected") {
                if (liveErr?.name === "CanceledError" || liveErr?.code === "ERR_CANCELED" || liveErr?.name === "AbortError") {
                    return;
                }
                if (isUnreachableError(liveErr)) {
                    recordApiFailure(liveErr);
                }
                setError("Live updates are temporarily unavailable.");
                setShowingCachedLive(Boolean(employeesRef.current?.length));
                if (!employeesRef.current?.length) {
                    const snap = loadLiveTrackingSnapshot();
                    if (snap?.employees?.length) {
                        setEmployees(dedupeLiveEmployees(snap.employees));
                        setShowingCachedLive(true);
                    }
                }
                return;
            }

            recordApiSuccess();
            setError(null);

            if (liveRes.status === "fulfilled") {
                const list = dedupeLiveEmployees(liveRes.value?.employees ?? []);
                setEmployees((prev) => {
                    const prevById = new Map(
                        (prev || []).map((e) => [String(e.user_id ?? e.id), e])
                    );
                    return list.map((next) => {
                        const id = String(next.user_id ?? next.id);
                        const prior = prevById.get(id);
                        return prior ? mergeLiveEmployeeUpdate(prior, next) : next;
                    });
                });
                setShowingCachedLive(false);
                if (list.some((e) => isOnDutyWorking(e))) {
                    saveLiveTrackingSnapshot(list.filter(isOnDutyWorking));
                }
            }
            if (statsRes.status === "fulfilled" && statsRes.value) {
                setStats(statsRes.value);
            }
            setLastRefresh(new Date());
        } catch (err) {
            if (seq !== liveRequestSeqRef.current) return;
            if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || err?.name === "AbortError") {
                return;
            }
            if (isUnreachableError(err)) {
                recordApiFailure(err);
            }
            setError("Live updates are temporarily unavailable.");
            setShowingCachedLive(Boolean(employeesRef.current?.length));
        } finally {
            if (seq === liveRequestSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useAdaptivePolling(loadData, REFRESH_INTERVAL, [loadData]);

    const activeEmployees = useMemo(
        () => employees.filter((e) => isOnDutyWorking(e)),
        [employees]
    );

    const dutyStats = useMemo(() => {
        const working = activeEmployees;
        const trackingKey = (e) => resolveCanonicalTrackingStatusKey(e);
        return {
            working: working.length,
            stopped: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "stopped").length,
            auto_ended: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "auto_ended").length,
            admin_ended: employees.filter((e) => resolveCanonicalDutyStatusKey(e) === "admin_ended").length,
            gps_active: working.filter((e) => trackingKey(e) === "gps_active").length,
            gps_stale: working.filter((e) => trackingKey(e) === "gps_stale").length,
            gps_offline: working.filter((e) => trackingKey(e) === "gps_offline").length,
            no_location: working.filter((e) => trackingKey(e) === "no_location").length,
        };
    }, [employees, activeEmployees]);

    const filteredEmployees = useMemo(() => {
        return activeEmployees.filter((emp) => {
            const name = empName(emp).toLowerCase();
            const id = String(emp.employee_id ?? emp.employee_code ?? "").toLowerCase();
            const district = (emp.district || "").toLowerCase();
            const matchSearch =
                !searchTerm ||
                name.includes(searchTerm.toLowerCase()) ||
                id.includes(searchTerm.toLowerCase()) ||
                district.includes(searchTerm.toLowerCase());
            const tracking = resolveCanonicalTrackingStatusKey(emp);
            const matchFilter =
                filterStatus === "all" ||
                (filterStatus === "working" && true) ||
                (filterStatus === "gps_active" && tracking === "gps_active") ||
                (filterStatus === "gps_stale" && tracking === "gps_stale") ||
                (filterStatus === "gps_offline" && tracking === "gps_offline") ||
                (filterStatus === "no_location" && tracking === "no_location");
            return matchSearch && matchFilter;
        });
    }, [activeEmployees, searchTerm, filterStatus]);

    const mapEmployees = useMemo(
        () =>
            filteredEmployees.filter(
                (emp) =>
                    !isNoLocationYet(emp) &&
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

    const mapSelectedEmployee = useMemo(() => {
        if (!selectedUserId) return null;
        return (
            activeEmployees.find(
                (e) => String(e.user_id ?? e.id) === String(selectedUserId)
            ) ?? null
        );
    }, [selectedUserId, activeEmployees]);

    const selectEmployee = useCallback((emp) => {
        const id = emp?.user_id ?? emp?.id;
        if (id == null) return;
        setSelectedUserId(String(id));
    }, []);

    const openDrawer = useCallback((emp) => {
        selectEmployee(emp);
        setDrawerOpen(true);
    }, [selectEmployee]);

    const selectedPanTarget = useMemo(() => {
        if (!mapSelectedEmployee || !hasLiveMapLocation(mapSelectedEmployee)) return null;
        if (isNoLocationYet(mapSelectedEmployee)) return null;
        const lat = Number(mapSelectedEmployee.latitude);
        const lng = Number(mapSelectedEmployee.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (!isValidTamilNaduCoordinate(lat, lng)) return null;
        return {
            lat,
            lng,
            userId: mapSelectedEmployee.user_id ?? mapSelectedEmployee.id,
        };
    }, [mapSelectedEmployee]);

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
            setSelectedUserId((prev) => {
                if (!prev || String(prev) !== String(userId)) return prev;
                return null;
            });
            setRouteRefreshToken((n) => n + 1);
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
            label: "Online",
            value: dutyStats.gps_active,
            accent: BRAND.primaryDark,
            gradient: "linear-gradient(135deg,#fff 0%,#ecfdf5 100%)",
            iconBg: "#d1fae5",
        },
        {
            icon: Clock,
            label: "Stale",
            value: dutyStats.gps_stale,
            accent: BRAND.warning,
            gradient: BRAND_GRADIENTS.cardAccent,
            iconBg: BRAND.warningLight,
        },
        {
            icon: WifiOff,
            label: "Offline",
            value: dutyStats.gps_offline,
            accent: "#64748b",
            gradient: "linear-gradient(135deg,#fff 0%,#f8fafc 100%)",
            iconBg: "#e2e8f0",
        },
        {
            icon: AlertTriangle,
            label: "No location",
            value: dutyStats.no_location,
            accent: BRAND.danger,
            gradient: "linear-gradient(135deg,#fff 0%,#fef2f2 100%)",
            iconBg: BRAND.dangerLight,
        },
    ];

    const filterOptions = [
        { key: "all", label: "All active", count: activeEmployees.length },
        { key: "working", label: "Working", count: dutyStats.working },
        { key: "gps_active", label: "Online", count: dutyStats.gps_active },
        { key: "gps_stale", label: "Stale", count: dutyStats.gps_stale },
        { key: "gps_offline", label: "Offline", count: dutyStats.gps_offline },
        { key: "no_location", label: "No location", count: dutyStats.no_location },
    ];

    const todaySummary = [
        { label: "Working", value: dutyStats.working },
        { label: "Online", value: dutyStats.gps_active },
        { label: "Stale", value: dutyStats.gps_stale },
        { label: "Offline", value: dutyStats.gps_offline },
        { label: "On map", value: mapEmployees.length },
        { label: "No location", value: dutyStats.no_location },
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
                                <span className="text-slate-400 font-medium">· 60s sync</span>
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
                    <AdminMapCard
                        className="tracking-map-panel"
                        title="Live employee locations"
                        subtitle={`${activeEmployees.length} active employee${activeEmployees.length === 1 ? "" : "s"} · ${dutyStats.gps_active} online · ${dutyStats.gps_stale} stale · ${dutyStats.gps_offline} offline · ${dutyStats.no_location} no location`}
                        showOpenInMaps={false}
                        headerActions={
                            <>
                                <button
                                    type="button"
                                    onClick={() => setFitRequestId((n) => n + 1)}
                                    className="btn btn-secondary btn-sm"
                                    disabled={validMapLocations.length === 0}
                                >
                                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    Fit all
                                </button>
                                <button
                                    type="button"
                                    onClick={() => loadData(true)}
                                    className="btn btn-secondary btn-sm"
                                    disabled={refreshing}
                                    aria-label="Refresh employee locations now"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                                    Refresh
                                </button>
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" aria-hidden="true" />
                                    60s refresh
                                </span>
                            </>
                        }
                        beforeMap={
                            mapSelectedEmployee ? (
                                <LiveTrackingSelectedSummary
                                    employee={mapSelectedEmployee}
                                    onViewDetails={openDrawer}
                                />
                            ) : null
                        }
                        footerMessage="Markers show each active employee's latest valid location. Offline employees remain visible at their last known position."
                        footerIcon={Navigation}
                        mapSize="live"
                        mapProps={{
                            center: validMapLocations.length ? mapCenter : TAMIL_NADU_CENTER,
                            zoom: validMapLocations.length ? mapZoom : TAMIL_NADU_ZOOM,
                            mapKey: "live-tracking-active",
                            legend: <GpsStatusMapLegend />,
                            legendTitle: "",
                            loading: loading && activeEmployees.length === 0,
                            loadingLabel: "Updating employee locations…",
                            statusMessage:
                                showingCachedLive
                                    ? "Live updates are temporarily unavailable. Showing the last known locations."
                                    : error
                                      ? "Live updates are temporarily unavailable. Showing the last known locations."
                                      : !loading && activeEmployees.length === 0
                                        ? "No employees currently have an active workday."
                                        : !loading && mapEmployees.length === 0 && activeEmployees.length > 0
                                          ? "No employee locations are available yet."
                                          : null,
                            statusTone: error || showingCachedLive ? "warn" : "info",
                            statusDetail:
                                !loading && mapEmployees.length === 0 && activeEmployees.length > 0
                                    ? "Employees appear in the roster until the first GPS update arrives."
                                    : null,
                            onRetry: () => loadData(true),
                            onFitAll: () => setFitRequestId((n) => n + 1),
                            fitAllDisabled: validMapLocations.length === 0,
                            zoomControlPosition: "topleft",
                            fallbackAction: (
                                <Link to="/tracking/routes" className="btn btn-secondary btn-sm">
                                    Open route history
                                </Link>
                            ),
                        }}
                        mapChildren={
                            <>
                                <MapEmployeeViewport
                                    locations={validMapLocations}
                                    refitMode="once"
                                    fitRequestId={fitRequestId}
                                />
                                <LiveMapFullscreenController locations={validMapLocations} />
                                {selectedPanTarget ? (
                                    <LiveMapPanController
                                        lat={selectedPanTarget.lat}
                                        lng={selectedPanTarget.lng}
                                        userId={selectedPanTarget.userId}
                                    />
                                ) : null}
                                <LiveMapMarkers
                                    employees={mapEmployees}
                                    selectedUserId={selectedUserId}
                                    onSelect={selectEmployee}
                                    onViewEmployee={openDrawer}
                                />
                            </>
                        }
                    />

                    <aside className="tracking-roster-panel" aria-label="Employee roster">
                        <div className="tracking-roster-panel__head">
                            <div className="flex items-center gap-3 min-w-0 w-full">
                                <div className="list-meta-icon list-meta-icon--crop shrink-0">
                                    <Users className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm font-bold text-slate-900">Field roster</h2>
                                    <p className="text-xs text-slate-500">
                                        {filteredEmployees.length} of {activeEmployees.length} active
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
                                        selected={String(selectedUserId) === String(emp.user_id ?? emp.id)}
                                        onSelect={selectEmployee}
                                        onOpenDrawer={openDrawer}
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
                employee={mapSelectedEmployee}
                isOpen={drawerOpen}
                onClose={closeDrawer}
                onForceEndSuccess={handleForceEndSuccess}
                routeRefreshToken={routeRefreshToken}
            />
        </>
    );
}
