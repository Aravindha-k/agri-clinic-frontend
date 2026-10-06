import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getVisits, getVisitActivitySummary, deleteVisit } from "../api/visit.api";
import { getEmployees } from "../api/employee.api";
import { useNavigate, useLocation } from "react-router-dom";
import { todayIsoDate } from "../utils/businessDate";
import { debounce } from "../utils/debounce";
import {
  normalizeVisitList,
  resolveVisitFarmer,
  visitWhenLabel,
  visitEmployeeLabel,
  visitLandLabel,
} from "../utils/visitFarmer";
import { asDisplayString, resolveVillageLabel } from "../utils/displayValue";
import {
  resolveVisitCropDisplay,
  resolveVisitFieldNotes,
  resolveVisitProblemSeen,
  resolveVisitActionTaken,
  resolveVisitFollowUpDate,
  truncateVisitText,
  VISIT_FIELD_NOTES_LABEL,
} from "../utils/visitDisplay";
import {
  PageHeader,
  EmptyState,
  GpsIndicator,
  FilterBar,
  FilterField,
  FilterToolbarRow,
  FilterActiveRow,
} from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { friendlyErrorMessage } from "../utils/friendlyError";
import VisitListCard from "../components/visits/VisitListCard";
import TodayActivityKpis, { TodayActivityKpiSkeleton } from "../components/visits/TodayActivityKpis";
import EmployeeActivityStrip, {
  EmployeeActivitySkeleton,
} from "../components/visits/EmployeeActivityStrip";
import {
  ACTIVITY_PERIODS,
  DEFAULT_ACTIVITY_PERIOD,
  activityEmployeeUserId,
  activityErrorMessage,
  activitySectionCopy,
  activityViewState,
  employeesForVisitSelect,
  findEmployeeByUserId,
  normalizeActivityPeriod,
  visitEmployeeDisplayName,
  visitEmployeeOptionLabel,
} from "../utils/visitsActivity";
import {
  PAGE_SIZE,
  DATE_CHIPS,
  activityPeriodRange,
  applyActivityEmployeeDrillDown,
  applyAllEmployeesFromActivity,
  buildVisitsQueryParams,
  applyClearVisitFilters,
  visitsScopeKey,
  visitResultsViewState,
  visitRecordsCountFromResponse,
  visitRecordsScopeLine,
  visitRecordsCountLine,
  visitRecordsEmptyCopy,
} from "../utils/visitsFilters";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  Paperclip,
  Plus,
} from "lucide-react";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";

function VisitsTableSkeleton() {
  return (
    <div className="visits-table-skeleton" aria-busy="true" aria-label="Loading visits">
      <div className="visits-table-skeleton__row border-b border-slate-100 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded hidden sm:block first:block" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, r) => (
        <div key={r} className="visits-table-skeleton__row">
          <div className="skeleton h-3 w-10 rounded flex-shrink-0" />
          <div className="skeleton h-3.5 flex-[2] rounded" />
          <div className="skeleton h-3 flex-1 rounded hidden md:block" />
          <div className="skeleton h-3 flex-1 rounded hidden lg:block" />
          <div className="skeleton h-3 flex-1 rounded hidden xl:block" />
          <div className="skeleton h-6 w-14 rounded-full hidden lg:block" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function VisitsGridSkeleton() {
  return (
    <div className="visits-grid-skeleton" aria-busy="true" aria-label="Loading visits">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="visits-card-skeleton">
          <div className="flex justify-between gap-2">
            <div className="skeleton h-5 w-20 rounded-md" />
            <div className="skeleton h-5 w-24 rounded-md" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-lg" />
            <div className="skeleton h-6 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="skeleton h-12 rounded-lg" />
            <div className="skeleton h-12 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisitRow({ v, onView, onEdit, onDelete }) {
  const farmer = resolveVisitFarmer(v);
  const whenLabel = visitWhenLabel(v);
  const cropName = resolveVisitCropDisplay(v);
  const fieldNotes = truncateVisitText(resolveVisitFieldNotes(v));
  const problemSeen = truncateVisitText(resolveVisitProblemSeen(v));
  const actionTaken = truncateVisitText(resolveVisitActionTaken(v));
  const followUpDate = resolveVisitFollowUpDate(v);
  const villageLabel = asDisplayString(
    farmer.village !== "—" ? farmer.village : resolveVillageLabel(v?.village ?? v?.village_name)
  );
  const land = asDisplayString(visitLandLabel(v));
  const attachmentCount = resolveVisitAttachmentCount(v);

  return (
    <tr
      className="cursor-pointer group"
      onClick={() => onView(v.id)}
    >
      <td className="font-mono text-xs text-slate-500 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          #{v.id}
          {attachmentCount != null && attachmentCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-violet-600"
              title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
            >
              <Paperclip className="w-3 h-3" aria-hidden="true" />
              {attachmentCount}
            </span>
          )}
        </span>
      </td>
      <td>
        <p className="text-sm font-semibold text-slate-900">{asDisplayString(farmer.name)}</p>
        <p className="text-xs text-slate-500 font-mono tabular-nums">{asDisplayString(farmer.phone)}</p>
      </td>
      <td className="text-sm text-slate-700">{villageLabel}</td>
      <td className="text-sm text-slate-700 max-w-[8rem]">
        <span className="line-clamp-1">{cropName}</span>
      </td>
      <td className="text-sm text-slate-600 max-w-[10rem] hidden xl:table-cell">
        <span className="line-clamp-2" title={resolveVisitFieldNotes(v)}>{fieldNotes}</span>
      </td>
      <td className="text-sm text-slate-600 max-w-[9rem] hidden lg:table-cell">
        <span className="line-clamp-2" title={resolveVisitProblemSeen(v)}>{problemSeen}</span>
      </td>
      <td className="text-sm text-slate-600 max-w-[9rem] hidden lg:table-cell">
        <span className="line-clamp-2" title={resolveVisitActionTaken(v)}>{actionTaken}</span>
      </td>
      <td className="text-sm text-slate-500 whitespace-nowrap hidden md:table-cell">{followUpDate}</td>
      <td className="text-sm text-slate-600 max-w-[7rem] hidden lg:table-cell">
        <span className="line-clamp-1">{land}</span>
      </td>
      <td className="text-sm text-slate-600 max-w-[8rem] hidden md:table-cell">
        <span className="line-clamp-1">{asDisplayString(visitEmployeeLabel(v))}</span>
      </td>
      <td className="text-sm text-slate-500 whitespace-nowrap">{asDisplayString(whenLabel)}</td>
      <td>
        <GpsIndicator latitude={v.latitude} longitude={v.longitude} compact />
      </td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(v.id);
            }}
            className="visits-action-btn"
            title="View visit"
            aria-label="View visit"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(v.id);
            }}
            className="visits-action-btn"
            title="Edit visit"
            aria-label="Edit visit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(v);
            }}
            className="visits-action-btn visits-action-btn--danger"
            title="Delete visit"
            aria-label="Delete visit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateChip, setDateChip] = useState("today");
  const [employeeUserId, setEmployeeUserId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const visitsRequestSeq = useRef(0);

  const [activity, setActivity] = useState(null);
  const [activityPeriod, setActivityPeriod] = useState(DEFAULT_ACTIVITY_PERIOD);
  const [loadedActivityPeriod, setLoadedActivityPeriod] = useState("");
  const [activityFetchedAtMs, setActivityFetchedAtMs] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const activityRequestSeq = useRef(0);
  const [fallbackEmployees, setFallbackEmployees] = useState([]);
  const activityCopy = activitySectionCopy(activityPeriod);
  const activityView = activityViewState({
    loading: activityLoading,
    period: activityPeriod,
    loadedPeriod: loadedActivityPeriod,
    error: activityError,
  });

  const currentScope = visitsScopeKey({ employeeUserId, dateChip, search, page });
  const visitsView = visitResultsViewState({
    currentScope,
    loadedScope,
    loading: visitsLoading,
    error: visitsError,
  });

  const loadActivity = useCallback(async () => {
    const period = normalizeActivityPeriod(activityPeriod);
    const seq = ++activityRequestSeq.current;
    const range = activityPeriodRange(period, todayIsoDate());
    setActivityLoading(true);
    setActivityError("");
    try {
      const data = await getVisitActivitySummary({
        startDate: range.start_date,
        endDate: range.end_date,
      });
      if (seq !== activityRequestSeq.current) return;
      setActivity(data);
      setLoadedActivityPeriod(period);
      setActivityFetchedAtMs(Date.now());
    } catch (err) {
      if (seq !== activityRequestSeq.current) return;
      setActivityError(activityErrorMessage(period));
      setActivity(null);
      setLoadedActivityPeriod(period);
      setActivityFetchedAtMs(null);
    } finally {
      if (seq === activityRequestSeq.current) setActivityLoading(false);
    }
  }, [activityPeriod]);

  const loadVisits = useCallback(
    async (pageNum = 1) => {
      const seq = ++visitsRequestSeq.current;
      const scope = visitsScopeKey({ employeeUserId, dateChip, search, page: pageNum });
      setVisitsLoading(true);
      setVisitsError("");
      try {
        const params = buildVisitsQueryParams({
          page: pageNum,
          pageSize: PAGE_SIZE,
          search,
          dateChip,
          employeeUserId,
        });
        const data = await getVisits(params);
        if (seq !== visitsRequestSeq.current) return;
        const list = normalizeVisitList(data?.results ?? []);
        setVisits(list);
        setTotal(visitRecordsCountFromResponse(data, list.length));
        setLoadedScope(scope);
      } catch (err) {
        if (seq !== visitsRequestSeq.current) return;
        setVisitsError(err?.message || "Failed to load visits");
        setVisits([]);
        setTotal(null);
        setLoadedScope(scope);
      } finally {
        if (seq === visitsRequestSeq.current) setVisitsLoading(false);
      }
    },
    [search, dateChip, employeeUserId]
  );

  useEffect(() => {
    loadActivity();
  }, [loadActivity, location.key]);

  useEffect(() => {
    loadVisits(page);
  }, [loadVisits, page, location.key]);

  useEffect(() => {
    if (location.state?.refreshVisits) {
      loadActivity();
      loadVisits(page);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refreshVisits, loadActivity, loadVisits, page, navigate, location.pathname]);

  const activityEmployees = activity?.employees ?? [];
  const selectableFromActivity = useMemo(
    () => employeesForVisitSelect(activityEmployees),
    [activityEmployees]
  );

  useEffect(() => {
    if (selectableFromActivity.length > 0) return undefined;
    if (activityLoading) return undefined;
    let cancelled = false;
    getEmployees()
      .then((rows) => {
        if (cancelled) return;
        setFallbackEmployees(employeesForVisitSelect(rows));
      })
      .catch(() => {
        if (!cancelled) setFallbackEmployees([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectableFromActivity.length, activityLoading]);

  const selectorEmployees = selectableFromActivity.length > 0
    ? selectableFromActivity
    : fallbackEmployees;

  const selectedEmployee =
    findEmployeeByUserId(selectorEmployees, employeeUserId) ||
    findEmployeeByUserId(activityEmployees, employeeUserId);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value) => {
        setSearch(value);
        setPage(1);
      }, 300),
    []
  );

  useEffect(() => () => debouncedSetSearch.cancel?.(), [debouncedSetSearch]);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (!value.trim()) {
      debouncedSetSearch.cancel?.();
      setSearch("");
      setPage(1);
      return;
    }
    debouncedSetSearch(value);
  };

  const handleDateChip = (chipId) => {
    if (chipId === dateChip) return;
    setDateChip(chipId);
    setPage(1);
  };

  const handleActivityPeriod = (periodId) => {
    const next = normalizeActivityPeriod(periodId);
    if (next === activityPeriod) return;
    setActivityPeriod(next);
    setActivity(null);
    setActivityError("");
    setActivityLoading(true);
    setLoadedActivityPeriod("");
    setActivityFetchedAtMs(null);
  };

  const handleEmployeeChange = (userId) => {
    const next = String(userId ?? "");
    if (next === String(employeeUserId)) return;
    setEmployeeUserId(next);
    setPage(1);
  };

  const handleActivityCardSelect = (userId) => {
    const drilled = applyActivityEmployeeDrillDown(
      { employeeUserId, dateChip, page },
      userId,
      activityPeriod
    );
    if (drilled.employeeUserId === String(employeeUserId) && drilled.dateChip === dateChip) return;
    setEmployeeUserId(drilled.employeeUserId);
    setDateChip(drilled.dateChip);
    setPage(drilled.page);
  };

  const handleActivitySelectAll = () => {
    const next = applyAllEmployeesFromActivity({ employeeUserId, dateChip, page });
    setEmployeeUserId(next.employeeUserId);
    setPage(next.page);
  };

  const handleClearFilters = () => {
    const cleared = applyClearVisitFilters();
    debouncedSetSearch.cancel?.();
    setSearchInput("");
    setSearch(cleared.search);
    setDateChip(cleared.dateChip);
    setEmployeeUserId(cleared.employeeUserId);
    setPage(cleared.page);
  };

  const handleRefresh = () => {
    loadActivity();
    loadVisits(page);
  };

  const handleView = (id) => navigate(`/visits/${id}`);
  const handleEdit = (id) => navigate(`/visits/${id}/edit`);
  const handleAskDelete = (visit) => {
    setDeleteError("");
    setDeleteTarget(visit);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteVisit(deleteTarget.id);
      setDeleteTarget(null);
      await Promise.all([loadVisits(page), loadActivity()]);
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err, "Failed to delete visit."));
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((typeof total === "number" ? total : 0) / PAGE_SIZE));
  const pageNums = (() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  })();

  const safeTotal = typeof total === "number" ? total : 0;
  const showingFrom = safeTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, safeTotal);
  const hasActiveFilters =
    Boolean(search.trim()) || dateChip !== "all" || Boolean(employeeUserId);
  const emptyCopy = visitRecordsEmptyCopy({
    hasSearch: Boolean(search.trim()),
    dateChip,
    employeeName: visitEmployeeDisplayName(selectedEmployee),
  });
  const scopeLine = visitRecordsScopeLine({ employee: selectedEmployee, dateChip });
  const countLine = visitsView === "ready" ? visitRecordsCountLine(total) : null;
  const showVisitSkeleton = visitsView === "loading";
  const showVisitList = visitsView === "ready" && visits.length > 0;
  const showVisitEmpty = visitsView === "ready" && visits.length === 0;

  return (
    <div className="page-container page-container--visits">
      <PageHeader
        title="Field Visits"
        subtitle="Monitor daily field activity and review submitted visits"
        badge={
          <span className="command-hero-badge">
            <Calendar className="w-3 h-3" aria-hidden="true" /> Submitted only
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => navigate("/visits/create")}
            className="btn btn-primary btn-md"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add Visit
          </button>
        }
      />

      <div className="visits-today-bundle">
      <section className="visits-ops-section" aria-labelledby="visits-today-heading">
        <header className="visits-ops-heading">
          <div>
            <h2 id="visits-today-heading" className="visits-ops-heading__title">
              {activityCopy.title}
            </h2>
            <p className="visits-ops-heading__sub">{activityCopy.subtitle}</p>
          </div>
          <div className="visits-activity-period" role="group" aria-label="Field activity period">
            {ACTIVITY_PERIODS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleActivityPeriod(chip.id)}
                className={`filter-chip ${
                  activityPeriod === chip.id ? "filter-chip--active" : "filter-chip--idle"
                }`}
                aria-pressed={activityPeriod === chip.id}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </header>
        {activityView === "error" ? (
          <ErrorRetry
            compact
            message={friendlyErrorMessage(activityError, activityErrorMessage(activityPeriod))}
            onRetry={loadActivity}
          />
        ) : activityView === "loading" ? (
          <TodayActivityKpiSkeleton />
        ) : (
          <TodayActivityKpis summary={activity} period={activityPeriod} />
        )}
      </section>

      <section className="visits-ops-section" aria-labelledby="visits-emp-heading">
        <header className="visits-ops-heading">
          <div>
            <h2 id="visits-emp-heading" className="visits-ops-heading__title">
              {activityCopy.employeeTitle}
            </h2>
            <p className="visits-ops-heading__sub">{activityCopy.employeeSubtitle}</p>
          </div>
        </header>
        {activityView === "error" ? null : activityView === "loading" ? (
          <EmployeeActivitySkeleton />
        ) : activityEmployees.length === 0 ? (
          <p className="visits-emp-empty">{activityCopy.emptyEmployees}</p>
        ) : (
          <EmployeeActivityStrip
            employees={activityEmployees}
            selectedUserId={employeeUserId}
            period={activityPeriod}
            dutyFetchedAtMs={activityFetchedAtMs}
            onSelectEmployee={handleActivityCardSelect}
            onSelectAll={handleActivitySelectAll}
          />
        )}
      </section>
      </div>

      <section className="visits-records-section" aria-labelledby="visits-records-heading">
        <header className="visits-ops-heading">
          <div>
            <h2 id="visits-records-heading" className="visits-ops-heading__title">
              Visit Records
            </h2>
            <p className="visits-ops-heading__sub">Inspect submitted visits for the selected employee and period</p>
          </div>
        </header>

        <FilterBar className="visits-filters">
          <FilterToolbarRow className="visits-filters__row visits-filters__row--primary">
            <FilterField label="Employee">
              <select
                id="visits-employee"
                className="search-input w-full visits-employee-select"
                value={employeeUserId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                aria-label="Filter visits by employee"
              >
                <option value="">All Employees</option>
                {selectorEmployees.map((emp) => {
                  const userPk = activityEmployeeUserId(emp);
                  return (
                    <option key={userPk} value={userPk}>
                      {visitEmployeeOptionLabel(emp)}
                    </option>
                  );
                })}
              </select>
            </FilterField>
            <FilterField label="Period" className="visits-filters__period">
              <div className="visits-date-chips" role="group" aria-label="Visit period">
                {DATE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleDateChip(chip.id)}
                    className={`filter-chip ${
                      dateChip === chip.id ? "filter-chip--active" : "filter-chip--idle"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </FilterField>
            {hasActiveFilters ? (
              <FilterField spacer>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn btn-ghost btn-md filter-toolbar__clear"
                >
                  <X className="w-4 h-4" aria-hidden="true" /> Clear filters
                </button>
              </FilterField>
            ) : null}
          </FilterToolbarRow>

          <FilterToolbarRow className="visits-filters__row visits-filters__row--search">
            <FilterField spacer className="filter-toolbar__grow">
              <div className="search-wrapper">
                <Search className="search-icon" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search farmer, mobile, village, crop, land, employee…"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
                  aria-label="Search visits"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      debouncedSetSearch.cancel?.();
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                    }}
                    className="search-clear-btn"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </FilterField>

            <FilterField spacer>
              <div className="visits-view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`visits-view-toggle__btn ${
                    viewMode === "grid" ? "visits-view-toggle__btn--active" : ""
                  }`}
                  title="Grid view"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`visits-view-toggle__btn ${
                    viewMode === "list" ? "visits-view-toggle__btn--active" : ""
                  }`}
                  title="List view"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </FilterField>

            <FilterField spacer>
              <button
                type="button"
                onClick={handleRefresh}
                className="btn btn-secondary btn-md filter-toolbar__clear"
                aria-label="Refresh visits and today's activity"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </FilterField>
          </FilterToolbarRow>

          {search.trim() ? (
            <FilterActiveRow>
              <span className="filter-chip filter-chip--active capitalize">
                Search: {search.trim()}
              </span>
            </FilterActiveRow>
          ) : null}
        </FilterBar>

        <div className="visits-scope" aria-live="polite">
          <p className="visits-scope__line">{scopeLine}</p>
          {visitsView === "loading" ? (
            <p className="visits-scope__count">Loading submitted visits…</p>
          ) : visitsView === "error" ? null : (
            <p className="visits-scope__count">{countLine}</p>
          )}
        </div>

        {visitsError && (
          <ErrorRetry
            compact
            message={friendlyErrorMessage(visitsError, "Couldn't load visits. Please try again.")}
            onRetry={() => loadVisits(page)}
          />
        )}

        {showVisitSkeleton ? (
          viewMode === "grid" ? (
            <VisitsGridSkeleton />
          ) : (
            <div className="visits-table-card">
              <VisitsTableSkeleton />
            </div>
          )
        ) : showVisitEmpty ? (
          <div className="dashboard-section-card">
            <EmptyState
              icon={Calendar}
              title={emptyCopy.title}
              subtitle={emptyCopy.subtitle}
              action={
                hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="btn btn-secondary btn-md"
                  >
                    <X className="w-4 h-4" aria-hidden="true" /> Clear filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/tracking")}
                    className="btn btn-primary btn-md"
                  >
                    Open live tracking
                  </button>
                )
              }
            />
          </div>
        ) : showVisitList && viewMode === "grid" ? (
          <div className="visits-grid">
            {visits.map((v) => (
              <VisitListCard
                key={`visit-${v.id}`}
                visit={v}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleAskDelete}
              />
            ))}
          </div>
        ) : showVisitList ? (
          <div className="visits-table-card">
            <div className="visits-table-wrap">
              <table className="data-table compact-table visits-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Farmer / Mobile</th>
                    <th>Village</th>
                    <th>Crop</th>
                    <th className="hidden xl:table-cell">{VISIT_FIELD_NOTES_LABEL}</th>
                    <th className="hidden lg:table-cell">Problem</th>
                    <th className="hidden lg:table-cell">Action</th>
                    <th className="hidden md:table-cell">Follow-up</th>
                    <th className="hidden lg:table-cell">Land</th>
                    <th className="hidden md:table-cell">Employee</th>
                    <th>Date</th>
                    <th>GPS</th>
                    <th className="w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <VisitRow
                      key={`visit-${v.id}`}
                      v={v}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleAskDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {showVisitList && (
          <div className="pagination visits-pagination">
            <span className="pagination-info">
              Showing <span className="font-semibold text-slate-700">{showingFrom}–{showingTo}</span> of{" "}
              <span className="font-semibold text-slate-700">{safeTotal}</span> visits · Page {page} of {totalPages}
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="pagination-btn disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNums.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`pagination-btn ${p === page ? "pagination-btn-active" : ""}`}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="pagination-btn disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete visit?"
        message={
          deleteError
            ? deleteError
            : `Visit #${deleteTarget?.id} will be permanently removed. This action cannot be undone.`
        }
        confirmLabel={deleteError ? "Retry delete" : "Delete"}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      />
    </div>
  );
}
