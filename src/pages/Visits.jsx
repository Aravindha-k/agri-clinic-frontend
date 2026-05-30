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
import { asDisplayString, resolveCropLabel, resolveVillageLabel } from "../utils/displayValue";
import {
  PageHeader,
  FilterBar,
  EmptyState,
  GpsIndicator,
  SkeletonCard,
  SkeletonTable,
} from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import { friendlyErrorMessage } from "../utils/friendlyError";
import VisitListCard from "../components/visits/VisitListCard";
import {
  Search,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  Paperclip,
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

function VisitRow({ v, onView }) {
  const farmer = resolveVisitFarmer(v);
  const whenLabel = visitWhenLabel(v);
  const cropName = asDisplayString(
    farmer.cropName !== "—" ? farmer.cropName : resolveCropLabel(v?.crop)
  );
  const villageLabel = asDisplayString(
    farmer.village !== "—" ? farmer.village : resolveVillageLabel(v?.village ?? v?.village_name)
  );
  const land = asDisplayString(visitLandLabel(v));
  const attachmentCount = resolveVisitAttachmentCount(v);

  return (
    <tr
      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
      onClick={() => onView(v.id)}
    >
      <td className="font-mono text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          #{v.id}
          {attachmentCount != null && attachmentCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-gray-500"
              title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
            >
              <Paperclip className="w-3 h-3" />
              {attachmentCount}
            </span>
          )}
        </span>
      </td>
      <td>
        <p className="text-sm font-semibold text-gray-900">{asDisplayString(farmer.name)}</p>
        <p className="text-xs text-gray-400 font-mono">{asDisplayString(farmer.phone)}</p>
      </td>
      <td className="text-sm text-gray-700">{villageLabel}</td>
      <td className="text-sm text-gray-700">{cropName}</td>
      <td className="text-sm text-gray-600">{land}</td>
      <td className="text-sm text-gray-600">{asDisplayString(visitEmployeeLabel(v))}</td>
      <td className="text-sm text-gray-500 whitespace-nowrap">{asDisplayString(whenLabel)}</td>
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
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="View"
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

  return (
    <div className="page-container">
      <PageHeader
        title="Field Visits"
        subtitle={
          loading
            ? "Loading submitted field visits…"
            : "Submitted field visits across all employees"
        }
        badge={
          <span className="command-hero-badge">
            <Calendar className="w-3 h-3" /> Submitted only
          </span>
        }
      />

      {!loading && total > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="stat-pill">
            <span className="font-bold text-gray-900">{total}</span>
            <span className="text-gray-400">Submitted visits</span>
          </div>
          <div className="stat-pill">
            <span className="font-bold text-gray-900">{filteredVisits.length}</span>
            <span className="text-gray-400">
              {dateChip === "all" ? "On this page" : "Matching filter"}
            </span>
          </div>
        </div>
      )}

      <FilterBar>
        <div className="flex flex-wrap gap-2 mb-3">
          {DATE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setDateChip(chip.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                dateChip === chip.id
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-200 hover:text-emerald-700"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="search-wrapper flex-1">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search farmer, mobile, village, crop, land, employee…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white shadow-sm text-emerald-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white shadow-sm text-emerald-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadVisits(page)}
            className="btn btn-secondary btn-md flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </FilterBar>

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load visits. Please try again.")}
          onRetry={() => loadVisits(page)}
        />
      )}

      {loading ? (
        viewMode === "grid" ? (
          <div className="list-grid list-grid--visits">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={8} cols={8} />
        )
      ) : filteredVisits.length === 0 ? (
        <div className="section-card">
          <EmptyState
            icon={Calendar}
            title={search || dateChip !== "all" ? "No visits match your filters" : "No field visits yet"}
            subtitle={
              search || dateChip !== "all"
                ? "Try a different search term or date range."
                : "Visits appear here when field agents submit them from the mobile app."
            }
            action={
              search || dateChip !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setDateChip("all");
                    setPage(1);
                  }}
                  className="btn btn-secondary btn-md"
                >
                  <X className="w-4 h-4" /> Clear filters
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
        <div className="list-grid list-grid--visits">
          {filteredVisits.map((v) => (
            <VisitListCard key={`visit-${v.id}`} visit={v} onView={handleView} />
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-container">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Farmer / Mobile</th>
                  <th>Village</th>
                  <th>Crop</th>
                  <th>Land</th>
                  <th>Employee</th>
                  <th>Date & time</th>
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
        <div className="pagination">
          <span className="pagination-info">
            Showing <span className="font-semibold text-gray-700">{showingFrom}–{showingTo}</span> of{" "}
            <span className="font-semibold text-gray-700">{total}</span> visits · Page {page} of {totalPages}
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="pagination-btn disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNums.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`pagination-btn ${p === page ? "pagination-btn-active" : ""}`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="pagination-btn disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
