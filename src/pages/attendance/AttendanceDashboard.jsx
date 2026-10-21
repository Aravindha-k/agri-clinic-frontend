import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import { RefreshCw, Store, AlertCircle, Clock3 } from "lucide-react";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { AttendanceStatusBadge } from "../../components/attendance/AttendanceBadges";
import { getDailyReport, getAttendanceShops } from "../../api/attendance.api";
import {
  aggregateByShop,
  attendanceErrorMessage,
  formatWorkedSeconds,
  formatDateTime,
  todayLocalISODate,
} from "../../utils/attendance";

export default function AttendanceDashboard() {
  const [date, setDate] = useState(todayLocalISODate());
  const [shopId, setShopId] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
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
    try {
      const data = await getDailyReport({
        date_from: date,
        date_to: date,
        shop_id: shopId || undefined,
        include_test: includeTest || undefined,
      });
      setRows(data);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load attendance dashboard."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, shopId, includeTest]);

  useEffect(() => {
    load();
  }, [load]);

  const shopAggs = useMemo(() => aggregateByShop(rows), [rows]);

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Attendance Dashboard"
        subtitle="Shop-wise daily attendance statistics"
        badge={
          <span className="masters-admin-header__badge">
            <Clock3 className="w-3 h-3" aria-hidden="true" />
            Attendance
          </span>
        }
        actions={
          <button type="button" onClick={load} className="btn btn-secondary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        }
      />
      <AttendanceTabs />

      <section className="masters-admin-filters" aria-label="Attendance filters">
        <div className="masters-admin-filters__row">
          <div className="masters-admin-field">
            <label htmlFor="att-date">Date</label>
            <input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="masters-admin-field">
            <label htmlFor="att-shop">Shop</label>
            <select id="att-shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="masters-admin-check self-end pb-2">
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
            />
            Include test / manual entries
          </label>
          <p className="masters-admin-filters__meta lg:ml-auto">{rows.length} summaries</p>
        </div>
      </section>

      {includeTest ? (
        <div className="masters-admin-alert masters-admin-alert--error !bg-amber-50 !border-amber-200 !text-amber-800" role="note">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>Test / manual records are included below — they are not biometrically verified.</span>
        </div>
      ) : null}

      {error && (
        <div className="masters-admin-alert masters-admin-alert--error" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={load} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading attendance">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <Store className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No attendance recorded for this date</p>
          {!includeTest && (
            <p className="text-sm text-slate-500 mt-1">
              Test / manual entries are hidden — enable the toggle above to include them.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            {shopAggs.map((agg) => (
              <article key={agg.shop_code} className="masters-admin-table-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="masters-admin-row-icon">
                    <Store className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <p className="masters-admin-row-name">{agg.shop_code}</p>
                  {agg.testRows > 0 && (
                    <span className="ml-auto inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      {agg.testRows} test
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Present</dt>
                    <dd className="font-semibold text-emerald-700">{agg.present}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Half day</dt>
                    <dd className="font-semibold text-amber-700">{agg.halfDay}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Incomplete</dt>
                    <dd className="font-semibold text-slate-700">{agg.incomplete}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Open sessions</dt>
                    <dd className="font-semibold text-slate-700">{agg.openSessions}</dd>
                  </div>
                  <div className="flex justify-between col-span-2 pt-1 border-t border-slate-100">
                    <dt className="text-slate-500">Total worked</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatWorkedSeconds(agg.workedSeconds)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="masters-admin-table-card">
            <div className="masters-admin-table-wrap">
              <table className="data-table compact-table masters-admin-table w-full">
                <thead>
                  <tr>
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
                      <td>
                        <p className="masters-admin-row-name">{r.employee_name || "—"}</p>
                        <p className="masters-admin-row-sub">{r.employee_ref}</p>
                      </td>
                      <td>{r.shop_code}</td>
                      <td>{formatDateTime(r.first_check_in)}</td>
                      <td>
                        {formatDateTime(r.last_check_out)}
                        {r.has_open_session ? (
                          <span className="ml-1.5 text-[11px] font-semibold text-amber-700">open</span>
                        ) : null}
                      </td>
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
        </>
      )}
    </div>
  );
}
