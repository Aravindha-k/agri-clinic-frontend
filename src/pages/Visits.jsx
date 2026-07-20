import { useEffect, useState, useCallback, useMemo } from "react";
import { getVisits } from "../api/visit.api";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import VisitListCard from "../components/visits/VisitListCard";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  Paperclip,
  Plus,
  ClipboardList,
} from "lucide-react";
import { resolveVisitAttachmentCount } from "../utils/visitAttachments";

const PAGE_SIZE = 12;

const DATE_CHIPS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

function visitDateValue(v) {
  const raw = v?.visit_date ?? v?.created_at ?? v?.timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchesDateChip(v, chip) {
  if (chip === "all") return true;
  const d = visitDateValue(v);
  if (!d) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (chip === "today") {
    return d >= start;
  }
  if (chip === "week") {
    start.setDate(start.getDate() - 7);
    return d >= start;
  }
  if (chip === "month") {
    start.setMonth(start.getMonth() - 1);
    return d >= start;
  }
  return true;
}

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

function VisitRow({ v, onView }) {
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
      </td>
    </tr>
  );
}

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dateChip, setDateChip] = useState("all");

  const loadVisits = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: pageNum, page_size: PAGE_SIZE };
        if (search.trim()) params.search = search.trim();
        const data = await getVisits(params);
        const list = normalizeVisitList(data?.results ?? []);
        setVisits(list);
        setTotal(typeof data?.count === "number" ? data.count : list.length);
      } catch (err) {
        setError(err?.message || "Failed to load visits");
        setVisits([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    loadVisits(page);
  }, [loadVisits, page, location.key]);

  useEffect(() => {
    if (location.state?.refreshVisits) {
      loadVisits(page);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.refreshVisits, loadVisits, page, navigate, location.pathname]);

  const filteredVisits = useMemo(
    () => visits.filter((v) => matchesDateChip(v, dateChip)),
    [visits, dateChip]
  );

  const handleView = (id) => navigate(`/visits/${id}`);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageNums = (() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  })();

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);
  const hasActiveFilters = Boolean(search.trim()) || dateChip !== "all";

  return (
    <div className="page-container page-container--visits">
      <PageHeader
        title="Field Visits"
        subtitle={
          loading
            ? "Loading submitted field visits…"
            : "Submitted field visits across all employees"
        }
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

      {!loading && total > 0 && (
        <div className="visits-kpi-strip">
          <div className="visits-kpi-pill visits-kpi-pill--accent">
            <ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="visits-kpi-pill__value">{total}</p>
              <p className="visits-kpi-pill__label">Submitted visits</p>
            </div>
          </div>
          <div className="visits-kpi-pill">
            <div>
              <p className="visits-kpi-pill__value">{filteredVisits.length}</p>
              <p className="visits-kpi-pill__label">
                {dateChip === "all" ? "On this page" : "Matching filter"}
              </p>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="visits-kpi-pill">
              <div>
                <p className="visits-kpi-pill__value">Filtered</p>
                <p className="visits-kpi-pill__label">Active search or date</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="visits-filters">
        <div className="visits-date-chips">
          {DATE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setDateChip(chip.id)}
              className={`filter-chip ${
                dateChip === chip.id ? "filter-chip--active" : "filter-chip--idle"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="visits-filters__row">
          <div className="search-wrapper flex-1 min-w-0">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search farmer, mobile, village, crop, land, employee…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="search-input"
              aria-label="Search visits"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="visits-view-toggle">
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

          <button
            type="button"
            onClick={() => loadVisits(page)}
            className="btn btn-secondary btn-md flex-shrink-0"
            aria-label="Refresh visits"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load visits. Please try again.")}
          onRetry={() => loadVisits(page)}
        />
      )}

      {loading ? (
        viewMode === "grid" ? (
          <VisitsGridSkeleton />
        ) : (
          <div className="visits-table-card">
            <VisitsTableSkeleton />
          </div>
        )
      ) : filteredVisits.length === 0 ? (
        <div className="dashboard-section-card">
          <EmptyState
            icon={Calendar}
            title={hasActiveFilters ? "No visits match your filters" : "No field visits yet"}
            subtitle={
              hasActiveFilters
                ? "Try a different search term or date range."
                : "Visits appear here when field agents submit them from the mobile app."
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDateChip("all");
                    setPage(1);
                  }}
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
      ) : viewMode === "grid" ? (
        <div className="visits-grid">
          {filteredVisits.map((v) => (
            <VisitListCard key={`visit-${v.id}`} visit={v} onView={handleView} />
          ))}
        </div>
      ) : (
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
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((v) => (
                  <VisitRow key={`visit-${v.id}`} v={v} onView={handleView} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredVisits.length > 0 && (
        <div className="pagination visits-pagination">
          <span className="pagination-info">
            Showing <span className="font-semibold text-slate-700">{showingFrom}–{showingTo}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span> visits · Page {page} of {totalPages}
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
    </div>
  );
}
