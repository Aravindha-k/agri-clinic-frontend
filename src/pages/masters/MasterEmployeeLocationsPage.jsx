import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Loader2,
  MapPinned,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  FilterBar,
  FilterField,
  FilterToolbarRow,
  PageHeader,
  PageLoader,
} from "../../components/ui/command";
import ErrorRetry from "../../components/ui/ErrorRetry";
import EmployeeLocationAssignmentDrawer from "../../components/masters/EmployeeLocationAssignmentDrawer";
import { fetchEmployeeLocationAssignments } from "../../api/employeeLocationAssignments.api";
import { fetchAllDistricts, fetchTaluksByDistrict } from "../../api/master.api";
import { friendlyErrorMessage } from "../../utils/friendlyError";

const PAGE_SIZE = 25;

function empDisplayName(employee) {
  if (!employee) return "\u2014";
  return (
    employee.display_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    employee.username ||
    employee.employee_id
  );
}

function formatRole(role) {
  if (!role) return "\u2014";
  return String(role).replace(/([a-z])([A-Z])/g, "$1 $2");
}

function countLabel(count, singular, plural) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

export default function MasterEmployeeLocationsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [talukFilter, setTalukFilter] = useState("");

  const [districts, setDistricts] = useState([]);
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterTaluksLoading, setFilterTaluksLoading] = useState(false);

  const [drawerEmployee, setDrawerEmployee] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAllDistricts({ is_active: true })
      .then(({ results }) => setDistricts(results || []))
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!districtFilter) {
      setFilterTaluks([]);
      setTalukFilter("");
      return;
    }
    let cancelled = false;
    setFilterTaluksLoading(true);
    fetchTaluksByDistrict(districtFilter, { is_active: true })
      .then((list) => {
        if (!cancelled) setFilterTaluks(list || []);
      })
      .finally(() => {
        if (!cancelled) setFilterTaluksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [districtFilter]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
      };
      if (searchDebounced) params.search = searchDebounced;
      if (districtFilter) params.district = districtFilter;
      if (talukFilter) params.taluk = talukFilter;

      const data = await fetchEmployeeLocationAssignments(params);
      setRows(data.results || []);
      setTotal(data.count ?? 0);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Could not load employee location assignments."));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, districtFilter, talukFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, districtFilter, talukFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSaved = useCallback((employeeId, summary) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row?.employee?.id !== employeeId) return row;
        return {
          ...row,
          location_assignment_summary: summary ?? row.location_assignment_summary,
        };
      })
    );
    loadRows();
  }, [loadRows]);

  const shownLabel = useMemo(() => {
    if (loading) return "Loading…";
    return `${rows.length} of ${total} employees`;
  }, [loading, rows.length, total]);

  return (
    <div className="masters-admin page-container emp-loc-page">
      <PageHeader
        title="Employee Locations"
        subtitle="Administrative reference — assign districts, taluks, and villages to field employees"
        badge={
          <span className="masters-admin-header__badge">
            <MapPinned className="w-3 h-3" aria-hidden="true" />
            Reference only
          </span>
        }
        actions={
          <Link to="/masters" className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to Masters
          </Link>
        }
      />

      <div className="emp-loc-page__note" role="note">
        <p>
          Location assignments are for administrative reference only and do not restrict
          employee access, farmers, visits, or tracking.
        </p>
      </div>

      <FilterBar className="masters-admin-filters emp-loc-page__filters">
        <FilterToolbarRow>
          <FilterField spacer className="filter-toolbar__grow">
            <div className="search-wrapper">
              <Search className="search-icon" aria-hidden="true" />
              <input
                type="search"
                className="search-input"
                placeholder="Search employee name, ID, username…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search employees"
              />
            </div>
          </FilterField>
          <FilterField label="District" className="min-w-[10rem]">
            <select
              className="select filter-toolbar__select"
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setTalukFilter("");
              }}
              aria-label="Filter by district"
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Taluk" className="min-w-[10rem]">
            <select
              className="select filter-toolbar__select"
              value={talukFilter}
              onChange={(e) => setTalukFilter(e.target.value)}
              disabled={!districtFilter || filterTaluksLoading}
              aria-label="Filter by taluk"
            >
              <option value="">
                {filterTaluksLoading ? "Loading…" : "All taluks"}
              </option>
              {filterTaluks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadRows}
              disabled={loading}
              aria-label="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
          </FilterField>
        </FilterToolbarRow>
        <p className="emp-loc-page__count">{shownLabel}</p>
      </FilterBar>

      {loading && rows.length === 0 ? (
        <PageLoader label="Loading employee locations…" />
      ) : error ? (
        <ErrorRetry message={error} onRetry={loadRows} />
      ) : rows.length === 0 ? (
        <div className="emp-loc-empty-state">
          <Users className="w-8 h-8 text-slate-400" aria-hidden="true" />
          <p>No field employees match your filters.</p>
        </div>
      ) : (
        <div className="masters-admin-table-card">
          <div className="masters-admin-table-wrap">
            <table className="masters-admin-table data-table emp-loc-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Districts</th>
                  <th>Taluks</th>
                  <th>Villages</th>
                  <th>Account Status</th>
                  <th aria-label="Actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const employee = row.employee || {};
                  const summary = row.location_assignment_summary || {};
                  const dc = summary.district_count ?? 0;
                  const tc = summary.taluk_count ?? 0;
                  const vc = summary.village_count ?? 0;
                  const noAssignment = dc === 0 && tc === 0 && vc === 0;

                  return (
                    <tr key={employee.id ?? employee.employee_id}>
                      <td>
                        <span className="emp-loc-table__name">{empDisplayName(employee)}</span>
                        {employee.username && (
                          <span className="emp-loc-table__username">{employee.username}</span>
                        )}
                      </td>
                      <td>{employee.employee_id || "\u2014"}</td>
                      <td>{formatRole(employee.role)}</td>
                      <td>
                        {noAssignment
                          ? "\u2014"
                          : countLabel(dc, "District", "Districts")}
                      </td>
                      <td>
                        {noAssignment ? "\u2014" : countLabel(tc, "Taluk", "Taluks")}
                      </td>
                      <td>
                        {noAssignment ? "\u2014" : countLabel(vc, "Village", "Villages")}
                      </td>
                      <td>
                        <span
                          className={
                            employee.is_active
                              ? "emp-loc-status emp-loc-status--active"
                              : "emp-loc-status emp-loc-status--inactive"
                          }
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDrawerEmployee(employee)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="emp-loc-pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <EmployeeLocationAssignmentDrawer
        open={Boolean(drawerEmployee)}
        employee={drawerEmployee}
        onClose={() => setDrawerEmployee(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
