import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/command";
import { RefreshCw, AlertCircle, LogIn, LogOut, ListChecks, X } from "lucide-react";
import AttendanceTabs from "../../components/attendance/AttendanceTabs";
import { VerificationBadge } from "../../components/attendance/AttendanceBadges";
import { getEventReport, getAttendanceShops, getAttendanceEmployees } from "../../api/attendance.api";
import {
  attendanceErrorMessage,
  formatDateTime,
  todayLocalISODate,
} from "../../utils/attendance";

/** Daily attendance records — raw check-in/check-out events. */
export default function AttendanceRecords() {
  const [date, setDate] = useState(todayLocalISODate());
  const [shopId, setShopId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [includeTest, setIncludeTest] = useState(false);
  const [shops, setShops] = useState([]);
  const [empNames, setEmpNames] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAttendanceShops({ is_active: true })
      .then((p) => setShops(p.results))
      .catch(() => setShops([]));
    getAttendanceEmployees()
      .then((p) =>
        setEmpNames(
          Object.fromEntries(p.results.map((e) => [e.employee_code, e.full_name]))
        )
      )
      .catch(() => setEmpNames({}));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getEventReport({
        date_from: date || undefined,
        date_to: date || undefined,
        shop_id: shopId || undefined,
        employee_id: employeeCode.trim() || undefined,
        include_test: includeTest || undefined,
      });
      setEvents(data);
    } catch (err) {
      setError(attendanceErrorMessage(err, "Failed to load attendance records."));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [date, shopId, employeeCode, includeTest]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 15s while the page is visible — silently, so the
  // table doesn't flicker. Pauses when the tab is hidden.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") load(true);
    };
    const t = setInterval(tick, 15000);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <div className="masters-admin page-container">
      <PageHeader
        title="Daily Attendance Records"
        subtitle="Check-in and check-out events recorded by attendance devices"
        badge={
          <span className="masters-admin-header__badge">
            <ListChecks className="w-3 h-3" aria-hidden="true" />
            Events
          </span>
        }
        actions={
          <button type="button" onClick={() => load()} className="btn btn-secondary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        }
      />
      <AttendanceTabs />

      <section className="masters-admin-filters" aria-label="Record filters">
        <div className="masters-admin-filters__row">
          <div className="masters-admin-field">
            <label htmlFor="rec-date">Date</label>
            <input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rec-shop">Shop</label>
            <select id="rec-shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="masters-admin-field">
            <label htmlFor="rec-emp">Employee code</label>
            <input
              id="rec-emp"
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="e.g. EMP-001"
            />
          </div>
          <label className="masters-admin-check self-end pb-2">
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
            />
            Include test / manual
          </label>
          {date ? (
            <button
              type="button"
              onClick={() => setDate("")}
              className="btn btn-ghost btn-md filter-toolbar__clear self-end"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" /> All dates
            </button>
          ) : null}
          <p className="masters-admin-filters__meta lg:ml-auto">
            {events.length} events · auto-refreshes every 15s
          </p>
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

      {loading ? (
        <div className="masters-admin-table-card" aria-busy="true" aria-label="Loading records">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="cpd-skeleton-row">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-4 w-36 rounded" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="masters-admin-empty">
          <div className="masters-admin-empty__icon">
            <ListChecks className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-slate-600">No attendance events found</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="data-table compact-table masters-admin-table w-full">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Employee</th>
                  <th>Shop</th>
                  <th>Time</th>
                  <th>Device</th>
                  <th>Verification</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-[12.5px] ${
                          ev.event_type === "CHECK_IN" ? "text-emerald-700" : "text-slate-700"
                        }`}
                      >
                        {ev.event_type === "CHECK_IN" ? (
                          <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {ev.event_type === "CHECK_IN" ? "Check in" : "Check out"}
                      </span>
                    </td>
                    <td>
                      <p className="masters-admin-row-name">{empNames[ev.employee_ref] || ev.employee_ref || "—"}</p>
                      {empNames[ev.employee_ref] && (
                        <p className="masters-admin-row-sub">{ev.employee_ref}</p>
                      )}
                    </td>
                    <td>{ev.shop_code || "—"}</td>
                    <td>{formatDateTime(ev.occurred_at)}</td>
                    <td className="text-slate-500">{ev.device_uid || "—"}</td>
                    <td>
                      <VerificationBadge method={ev.verification_method} isTest={ev.is_test_mode} />
                    </td>
                    <td className="text-slate-500 max-w-[180px] truncate" title={ev.notes || ""}>
                      {ev.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
