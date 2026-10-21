import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import { RefreshCw, AlertCircle, BarChart3 } from "lucide-react";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { AttendanceStatusBadge } from "../../components/attendance/AttendanceBadges";
import { getDailyReport, getAttendanceShops } from "../../api/attendance.api";
import {
  attendanceErrorMessage,
  formatDateOnly,
  formatDateTime,
  formatWorkedSeconds,
  todayLocalISODate,
} from "../../utils/attendance";

const SOURCE_FILTERS = [
  { value: "verified_default", label: "Exclude test / manual", includeTest: false, verifiedOnly: false },
  { value: "all", label: "Include test / manual", includeTest: true, verifiedOnly: false },
  { value: "verified_only", label: "Verified only", includeTest: false, verifiedOnly: true },
];

/** Attendance reports — daily summaries with date/shop/employee filters. */
export default function AttendanceReports() {
  const today = todayLocalISODate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [shopId, setShopId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [source, setSource] = useState("verified_default");
  const [shops, setShops] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAttendanceShops({ is_active: true })
      .then((p) => setShops(p.results))
      .catch(() => setShops([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const src = SOURCE_FILTERS.find((s) => s.value === source) || SOURCE_FILTERS[0];
    try {
      const data = await getDailyReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        shop_id: shopId || undefined,
        employee_id: employeeCode.trim() || undefined,
        include_test: src.includeTest || undefined,
        verified_only: src.verifiedOnly || undefined,
      });
      setRows(data);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load attendance report."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, shopId, employeeCode, source]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t = { present: 0, halfDay: 0, incomplete: 0, workedSeconds: 0, testRows: 0 };
    for (const r of rows) {
      if (r.status === "PRESENT") t.present += 1;
      else if (r.status === "HALF_DAY") t.halfDay += 1;
      else if (r.status === "INCOMPLETE") t.incomplete += 1;
      if (r.contains_test_events) t.testRows += 1;
      t.workedSeconds += Number(r.worked_seconds) || 0;
    }
    return t;
  }, [rows]);

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Attendance Reports"
        subtitle="Daily attendance summaries by date range, shop and employee"
        badge={
          <span className="masters-admin-header__badge">
            <BarChart3 className="w-3 h-3" aria-hidden="true" />
            Reports
          </span>
        }
        actions={
          <button type="button" onClick={load} className="btn btn-secondary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        }
      />
      <AttendanceTabs />

      <section className="masters-admin-filters" aria-label="Report filters">
        <div className="masters-admin-filters__row flex-wrap">
          <div className="masters-admin-field">
            <label htmlFor="rep-from">From</label>
            <input id="rep-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rep-to">To</label>
            <input id="rep-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rep-shop">Shop</label>
            <select id="rep-shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rep-emp">Employee code</label>
            <input
              id="rep-emp"
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="e.g. EMP-001"
            />
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rep-source">Attendance source</label>
            <select id="rep-source" value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCE_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <p className="masters-admin-filters__meta lg:ml-auto">{rows.length} rows</p>
        </div>
      </section>

      {error && (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={load} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 text-[12.5px]">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
            Present: {totals.present}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            Half day: {totals.halfDay}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            Incomplete: {totals.incomplete}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            Total worked: {formatWorkedSeconds(totals.workedSeconds)}
          </span>
          {totals.testRows > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-semibold">
              {totals.testRows} test / manual row{totals.testRows === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading report">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 && !error ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <BarChart3 className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No summaries match these filters</p>
        </div>
      ) : rows.length > 0 ? (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Shop</th>
                  <th>First check-in</th>
                  <th>Last check-out</th>
                  <th>Worked</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateOnly(r.date)}</td>
                    <td>
                      <p className="masters-admin-row-name">{r.employee_name || "—"}</p>
                      <p className="masters-admin-row-sub">{r.employee_ref}</p>
                    </td>
                    <td>{r.shop_code}</td>
                    <td>{formatDateTime(r.first_check_in)}</td>
                    <td>{formatDateTime(r.last_check_out)}</td>
                    <td>{formatWorkedSeconds(r.worked_seconds)}</td>
                    <td>
                      <AttendanceStatusBadge status={r.status} />
                    </td>
                    <td>
                      {r.contains_test_events ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          TEST / MANUAL
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
