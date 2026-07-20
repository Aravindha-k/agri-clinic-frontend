import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { fetchAllVisits } from "../api/visit.api";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import { getEmployeeGeo, getAdminStatus } from "../api/tracking.api";
import {
  PageLoader,
  EmptyState,
  ErrorRetry,
} from "../components/ui/command";
import { friendlyErrorMessage } from "../utils/friendlyError";
import RouteFallback from "../components/RouteFallback";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import AnalyticsBarRow from "../components/reports/AnalyticsBarRow";
import ReportKpiCard from "../components/reports/ReportKpiCard";
import {
  formatGpsComplianceLabel,
  formatDistanceKm,
  ANALYTICS_TOOLTIPS,
} from "../utils/analyticsLabels";
import { BRAND, CHART_COLORS } from "../theme/brand";
import { WidgetErrorBoundary, DashboardShellErrorBoundary } from "../components/dashboard/WidgetErrorBoundary";
import {
  buildGpsComplianceAnalytics,
  buildRouteAnalytics,
  filterVisitsByDateRange,
  topEntries,
  exportVisitsCsv,
  exportVisitsExcel,
  normalizeVisitsResponse,
  normalizeGeoRouteDistances,
  mergeRouteDistances,
} from "../utils/reportsAnalytics";
import {
  resolveTrackingEmployeeList,
  normalizeTrackingEmployee,
} from "../utils/trackingNormalize";
import {
  resolveCropLabel,
  resolveEmployeeLabel,
  resolveVillageLabel,
  resolveFarmerLabel,
} from "../utils/displayValue";
import {
  BarChart3,
  Users,
  Leaf,
  UserCheck,
  RefreshCw,
  Download,
  Calendar,
  MapPin,
  Route,
  Paperclip,
  Navigation,
  ShieldCheck,
  Search,
  FileSpreadsheet,
} from "lucide-react";

const ReportsRouteChart = lazy(() => import("../components/reports/ReportsRouteChart"));

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function getEmployeeName(item) {
  return item?.employee_name || resolveEmployeeLabel(item?.employee);
}

function getCropName(item) {
  return item?.crop_name || resolveCropLabel(item?.crop);
}

function getLocationName(item) {
  return (
    item?.village_name ||
    resolveVillageLabel(item?.village) ||
    item?.district_name ||
    "\u2014"
  );
}

function getVisitDate(item) {
  return item?.visit_date || item?.created_at || item?.timestamp || item?.start_time || null;
}

function normalizeReportRow(item, index) {
  return {
    ...item,
    id: item?.id ?? item?.visit_id ?? item?.report_id ?? index + 1,
    farmer_name: item?.farmer_name || resolveFarmerLabel(item?.farmer),
    crop: getCropName(item),
    employee: getEmployeeName(item),
    location_name: getLocationName(item),
    visit_date: getVisitDate(item),
    status: item?.status || item?.visit_status || "pending",
  };
}

function StatusBadge({ status }) {
  const s = (status || "completed").toLowerCase();
  const cfg = {
    verified: { cls: "reports-bi-status--verified", label: "Verified" },
    completed: { cls: "reports-bi-status--completed", label: "Completed" },
    pending: { cls: "reports-bi-status--pending", label: "Pending" },
    in_progress: { cls: "reports-bi-status--in_progress", label: "In Progress" },
  };
  const c = cfg[s] || cfg.completed;
  return (
    <span className={`reports-bi-status ${c.cls}`}>
      <span className="reports-bi-status__dot" aria-hidden="true" />
      {c.label}
    </span>
  );
}

function BiMetric({ value, label, hint, tone = "slate", title }) {
  return (
    <div className={`reports-bi-metric reports-bi-metric--${tone}`} title={title}>
      <p className="reports-bi-metric__value">{value}</p>
      <p className="reports-bi-metric__label">{label}</p>
      {hint ? <p className="reports-bi-metric__hint">{hint}</p> : null}
    </div>
  );
}

function ReportsLoadingSkeleton() {
  return (
    <div className="reports-bi page-container">
      <div className="reports-bi-header">
        <div className="reports-bi-header__inner">
          <div className="skeleton h-12 w-12 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-7 w-64 rounded" />
            <div className="skeleton h-4 w-80 max-w-full rounded" />
          </div>
        </div>
      </div>
      <div className="reports-bi-skeleton-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="reports-bi-skeleton-card">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-8 w-20 mt-4 rounded" />
            <div className="skeleton h-3 w-28 mt-2 rounded" />
          </div>
        ))}
      </div>
      <PageLoader label="Loading report data\u2026" />
    </div>
  );
}

function ReportSection({ icon: Icon, title, subtitle, children, action, boundaryName }) {
  const inner = (
    <div className="reports-bi-panel">
      <div className="reports-bi-panel__head">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="reports-bi-panel__icon">
            <Icon className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="reports-bi-panel__title">{title}</h3>
            {subtitle && <p className="reports-bi-panel__subtitle">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="reports-bi-panel__body">{children}</div>
    </div>
  );

  if (!boundaryName) return inner;

  return (
    <WidgetErrorBoundary name={boundaryName} title={`${title} unavailable`}>
      {inner}
    </WidgetErrorBoundary>
  );
}

export default function Reports() {
  const [data, setData] = useState([]);
  const [routeDistances, setRouteDistances] = useState([]);
  const [trackingEmployees, setTrackingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => defaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => defaultDateRange().to);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [visitsR, geoR, adminR] = await Promise.allSettled([
        fetchAllVisits(),
        getEmployeeGeo(),
        getAdminStatus(),
      ]);

      if (visitsR.status === "fulfilled") {
        const merged = visitsR.value;
        const records = normalizeVisitsResponse(merged).map(normalizeReportRow);
        setData(records);
        logApiDiagnostics({
          label: "reports-visits",
          url: "/api/v1/admin/visits/",
          apiCount: merged?.count,
          rowsLoaded: records.length,
          pagination: { pagesLoaded: merged?.pagesLoaded },
        });
      } else {
        throw visitsR.reason;
      }

      let employees = [];
      if (adminR.status === "fulfilled") {
        employees = resolveTrackingEmployeeList(adminR.value).map(normalizeTrackingEmployee);
        setTrackingEmployees(employees);
      } else {
        setTrackingEmployees([]);
      }

      if (geoR.status === "fulfilled") {
        const fromGeo = normalizeGeoRouteDistances(geoR.value, employees);
        const fromEmployees = normalizeGeoRouteDistances(null, employees);
        setRouteDistances(mergeRouteDistances(fromGeo, fromEmployees));
      } else {
        setRouteDistances(normalizeGeoRouteDistances(null, employees));
      }
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dateFiltered = useMemo(
    () => filterVisitsByDateRange(data, dateFrom, dateTo),
    [data, dateFrom, dateTo]
  );

  const analytics = useMemo(
    () => buildGpsComplianceAnalytics(dateFiltered, trackingEmployees),
    [dateFiltered, trackingEmployees]
  );

  const routeAnalytics = useMemo(
    () => buildRouteAnalytics(routeDistances),
    [routeDistances]
  );

  const routeChartData = useMemo(
    () =>
      (routeAnalytics.mostActive ?? []).map((r) => ({
        label: (r.name || "—").split(" ")[0] || r.name || "—",
        km: Number(Number(r.km ?? 0).toFixed(1)),
      })),
    [routeAnalytics]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return dateFiltered;
    const q = search.toLowerCase();
    return dateFiltered.filter(
      (r) =>
        (r.farmer_name || "").toLowerCase().includes(q) ||
        (r.crop || "").toLowerCase().includes(q) ||
        (r.employee || "").toLowerCase().includes(q) ||
        (r.location_name || "").toLowerCase().includes(q) ||
        String(r.id || "").includes(q)
    );
  }, [dateFiltered, search]);

  const totalRouteKm = routeAnalytics.totalKm;

  const kpis = [
    {
      icon: BarChart3,
      label: "Total Visits",
      value: analytics.totalVisits,
      description: "Field visits submitted in the selected date range",
      accent: BRAND.primary,
      iconBg: "#dcfce7",
    },
    {
      icon: Users,
      label: "Farmers Served",
      value: analytics.totalFarmers,
      description: "Unique farmers visited at least once",
      accent: BRAND.primaryDark,
      iconBg: "#d1fae5",
    },
    {
      icon: ShieldCheck,
      label: "GPS Tracking Compliance",
      value: formatGpsComplianceLabel(analytics.gpsCompliancePct),
      description: `${analytics.gpsCompliant} of ${analytics.totalVisits} visits include GPS coordinates`,
      tooltip: ANALYTICS_TOOLTIPS.gpsCompliance,
      accent: BRAND.info,
      iconBg: "#cffafe",
    },
    {
      icon: Paperclip,
      label: "Visits With Evidence",
      value: analytics.visitsWithEvidence,
      description: `${analytics.evidenceRatePct}% of visits include uploaded photos or files`,
      accent: BRAND.accent,
      iconBg: "#ede9fe",
    },
  ];

  if (loading) {
    return <ReportsLoadingSkeleton />;
  }

  const pageHeader = (
    <header className="reports-bi-header">
      <div className="reports-bi-header__inner">
        <div className="reports-bi-header__brand">
          <div className="reports-bi-header__icon" aria-hidden="true">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="reports-bi-header__badge">
              <BarChart3 className="w-3 h-3" aria-hidden="true" />
              Business intelligence
            </span>
            <h1 className="reports-bi-header__title">Analytics &amp; Reports</h1>
            <p className="reports-bi-header__subtitle">
              Field visits, farmer coverage, GPS compliance, evidence uploads, and route activity
            </p>
          </div>
        </div>
        <div className="reports-bi-header__actions">
          <button type="button" onClick={() => load()} className="btn btn-primary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <DashboardShellErrorBoundary header={pageHeader}>
    <div className="reports-bi page-container">
      {pageHeader}

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load reports. Please try again.")}
          onRetry={load}
        />
      )}

      <section className="reports-bi-export" aria-label="Export reports">
        <div className="reports-bi-export__inner">
          <div className="reports-bi-export__copy">
            <p className="reports-bi-export__label">Export center</p>
            <p className="reports-bi-export__title">{filtered.length} visit records ready to export</p>
            <p className="reports-bi-export__hint">
              Downloads respect your current date range and search filters
            </p>
          </div>
          <div className="reports-bi-export__actions">
            <button
              type="button"
              onClick={() => exportVisitsExcel(filtered)}
              disabled={!filtered.length}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportVisitsCsv(filtered)}
              disabled={!filtered.length}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="reports-bi-filters" aria-label="Report filters">
        <div className="reports-bi-filters__row">
          <div className="reports-bi-filters__dates">
            <div className="reports-bi-date-field">
              <label htmlFor="report-from">From date</label>
              <input
                id="report-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="reports-bi-date-field">
              <label htmlFor="report-to">To date</label>
              <input
                id="report-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <p className="reports-bi-filters__summary">
            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {dateFiltered.length} visits in selected range
          </p>
        </div>
      </section>

      <div className="reports-bi-kpi-grid">
        {kpis.map((kpi) => (
          <WidgetErrorBoundary key={kpi.label} name={`KPI:${kpi.label}`} title={`${kpi.label} unavailable`} className="min-h-[120px]">
            <ReportKpiCard {...kpi} />
          </WidgetErrorBoundary>
        ))}
      </div>

      <div className="reports-bi-analytics-grid">
        <ReportSection
          icon={UserCheck}
          title="Visits by Employee"
          subtitle="How field visits are distributed across your team"
          boundaryName="VisitsByEmployee"
        >
          {topEntries(analytics.visitsByEmployee).length === 0 ? (
            <div className="reports-bi-empty-panel">
              <EmptyState icon={Users} title="No visit data" subtitle="Visits will appear once field agents submit records." />
            </div>
          ) : (
            <div className="space-y-3">
              {topEntries(analytics.visitsByEmployee).map(([name, count]) => (
                <AnalyticsBarRow
                  key={name}
                  label={name}
                  count={count}
                  total={analytics.totalVisits}
                  accent={CHART_COLORS.secondary}
                  variant="employee"
                />
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection
          icon={MapPin}
          title="Farmer Coverage"
          subtitle={`${analytics.totalFarmers} farmers reached across ${analytics.villagesCovered} villages`}
          boundaryName="FarmerCoverage"
        >
          <div className="reports-bi-metric-grid reports-bi-metric-grid--2 mb-4">
            <BiMetric
              value={analytics.totalFarmers}
              label="Farmers served"
              hint="Unique farmers visited"
              tone="emerald"
            />
            <BiMetric
              value={analytics.villagesCovered}
              label="Villages covered"
              hint="Villages with at least one visit"
              tone="sky"
            />
          </div>
          {topEntries(analytics.farmerCoverageByVillage, 5).length > 0 ? (
            <div className="space-y-3">
              <p className="reports-bi-section-label">Top villages by farmers served</p>
              {topEntries(analytics.farmerCoverageByVillage, 5).map(([village, count]) => (
                <AnalyticsBarRow
                  key={village}
                  label={village}
                  count={count}
                  total={analytics.totalFarmers}
                  variant="coverage"
                />
              ))}
            </div>
          ) : (
            <div className="reports-bi-empty-panel">
              <EmptyState icon={MapPin} title="No village coverage yet" subtitle="Farmer coverage by village appears once visits include location data." />
            </div>
          )}
          {Object.keys(analytics.cropTypes).length > 0 && (
            <div className="space-y-3 mt-5 pt-5 border-t border-slate-100">
              <p className="reports-bi-section-label">Visits by crop type</p>
              {topEntries(analytics.cropTypes, 5).map(([crop, count]) => (
                <AnalyticsBarRow
                  key={crop}
                  label={crop}
                  count={count}
                  total={analytics.totalVisits}
                  variant="crop"
                />
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection
          icon={ShieldCheck}
          title="GPS Compliance Report"
          subtitle={`${analytics.gpsCompliant} of ${analytics.totalVisits} visits include GPS location proof`}
          boundaryName="GpsCompliance"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-2">
            <div
              className="reports-bi-donut"
              style={{
                background: `conic-gradient(#059669 ${analytics.gpsCompliancePct * 3.6}deg, #e2e8f0 0)`,
              }}
              title={ANALYTICS_TOOLTIPS.gpsCompliance}
            >
              <div className="reports-bi-donut__inner">
                <span className="reports-bi-donut__value">{analytics.gpsCompliancePct}%</span>
              </div>
            </div>
            <div className="reports-bi-donut-copy">
              <p className="font-semibold text-emerald-800">
                {formatGpsComplianceLabel(analytics.gpsCompliancePct)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">{analytics.gpsCompliant}</span> visits with GPS coordinates recorded
              </p>
              <p>
                <span className="font-semibold text-slate-900">{analytics.gpsDisabledIncidents}</span> active GPS incidents right now
              </p>
              <p>
                Live tracking uptime:{" "}
                <span className="font-semibold text-emerald-700">{analytics.trackingUptimePct}%</span>
              </p>
            </div>
          </div>
        </ReportSection>

        <ReportSection
          icon={Paperclip}
          title="Attachment Upload Report"
          subtitle={`${analytics.attachmentTotal} files uploaded across ${analytics.visitsWithEvidence} visits`}
          boundaryName="Attachments"
        >
          <div className="reports-bi-metric-grid reports-bi-metric-grid--3">
            <BiMetric value={analytics.visitsWithEvidence} label="Visits with files" tone="violet" />
            <BiMetric value={analytics.attachmentTotal} label="Total files uploaded" tone="amber" />
            <BiMetric value={`${analytics.evidenceRatePct}%`} label="Evidence upload rate" tone="slate" />
          </div>
        </ReportSection>
      </div>

      <ReportSection
        icon={Route}
        title="Route Analytics"
        subtitle="Today's tracked field travel based on employee GPS routes"
        boundaryName="RouteAnalytics"
        action={
          <Link to="/tracking/routes" className="btn btn-secondary btn-sm">
            <Navigation className="w-3.5 h-3.5" /> Route History
          </Link>
        }
      >
        {routeDistances.length === 0 ? (
          <div className="reports-bi-empty-panel">
            <EmptyState
              icon={Route}
              title="No route distance data"
              subtitle="Distance travelled appears when employees share GPS during active workdays."
              action={
                <Link to="/tracking" className="btn btn-primary btn-sm">
                  Open Live Tracking
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="reports-bi-metric-grid reports-bi-metric-grid--4 mb-4">
              <BiMetric
                value={formatDistanceKm(totalRouteKm)}
                label="Distance travelled"
                hint="Combined today"
                tone="indigo"
                title={ANALYTICS_TOOLTIPS.routeDistance}
              />
              <BiMetric
                value={formatDistanceKm(routeAnalytics.avgKm)}
                label="Average distance"
                hint="Per employee today"
                tone="sky"
                title={ANALYTICS_TOOLTIPS.routeAverage}
              />
              <BiMetric
                value={routeAnalytics.employeeCount}
                label="Total routes"
                hint="Employees tracked today"
                tone="emerald"
                title={ANALYTICS_TOOLTIPS.routeTotal}
              />
              <BiMetric
                value={routeAnalytics.topDistance?.name || "\u2014"}
                label="Longest route today"
                hint={
                  routeAnalytics.topDistance
                    ? formatDistanceKm(routeAnalytics.topDistance.km)
                    : "No route data"
                }
                tone="violet"
              />
            </div>
            <Suspense fallback={<RouteFallback label="Loading route chart\u2026" />}>
              <WidgetErrorBoundary name="RouteChart" title="Route chart unavailable">
                <ReportsRouteChart data={routeChartData} />
              </WidgetErrorBoundary>
            </Suspense>
            <div className="reports-bi-route-list">
              <p className="reports-bi-route-list__title">Distance by employee</p>
              {routeDistances
                .slice()
                .sort((a, b) => Number(b.km ?? 0) - Number(a.km ?? 0))
                .slice(0, 8)
                .map((r) => (
                  <div key={r.name} className="reports-bi-route-row">
                    <span className="reports-bi-route-row__name">{r.name}</span>
                    <span className="text-right flex-shrink-0">
                      <span className="reports-bi-route-row__km">{formatDistanceKm(r.km)}</span>
                      <span className="reports-bi-route-row__hint">Distance travelled</span>
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </ReportSection>

      <WidgetErrorBoundary name="VisitRecords" title="Visit records unavailable">
      <div className="reports-bi-table-card">
        <div className="reports-bi-table-head">
          <div className="flex items-center gap-3 min-w-0">
            <div className="reports-bi-panel__icon">
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <h3 className="reports-bi-panel__title">Visit records</h3>
              <p className="reports-bi-panel__subtitle">{filtered.length} records</p>
            </div>
          </div>
          <div className="reports-bi-table-search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search records\u2026"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              aria-label="Search visit records"
            />
          </div>
        </div>
        <div className="reports-bi-table-wrap">
          <table className="data-table compact-table reports-bi-table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer</th>
                <th>Crop</th>
                <th>Location</th>
                <th>Agent</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="reports-bi-id">#{item.id}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProfileAvatar entity={item.farmer ?? item} name={item.farmer_name} size="xs" />
                        <span className="font-medium text-slate-900 truncate">{item.farmer_name || "\u2014"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="reports-bi-crop-chip">
                        <Leaf className="w-3 h-3 shrink-0" aria-hidden="true" />
                        {item.crop || "\u2014"}
                      </span>
                    </td>
                    <td>
                      <span className="reports-bi-cell-muted">
                        <MapPin className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />
                        {item.location_name || "\u2014"}
                      </span>
                    </td>
                    <td className="text-slate-600 text-sm">{item.employee || "\u2014"}</td>
                    <td>
                      <span className="reports-bi-cell-muted">
                        <Calendar className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />
                        {item.visit_date
                          ? new Date(item.visit_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "\u2014"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="reports-bi-empty-panel">
                      <EmptyState
                        icon={BarChart3}
                        title="No records found"
                        subtitle={search ? "Try a different search term or date range." : "Visit records will appear here once field agents submit visits."}
                        action={
                          search || dateFrom || dateTo ? (
                            <button type="button" onClick={() => { setSearch(""); load(); }} className="btn btn-secondary btn-md">
                              Reset filters
                            </button>
                          ) : (
                            <Link to="/visits" className="btn btn-primary btn-md">
                              View visits
                            </Link>
                          )
                        }
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="reports-bi-table-footer">
            Showing first 50 of {filtered.length} records
          </div>
        )}
      </div>
      </WidgetErrorBoundary>
    </div>
    </DashboardShellErrorBoundary>
  );
}
