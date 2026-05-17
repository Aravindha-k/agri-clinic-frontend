import { useEffect, useState, useCallback } from "react";
import { getVisits } from "../api/visit.api";
import { useNavigate, useLocation } from "react-router-dom";
import {
  normalizeVisitList,
  resolveVisitFarmer,
  visitWhenLabel,
  visitSubmittedLabel,
  visitLandLabel,
  visitEmployeeLabel,
} from "../utils/visitFarmer";
import { resolveCropLabel, resolveVillageLabel } from "../utils/displayValue";
import {
  PageHeader,
  FilterBar,
  EmptyState,
  GpsIndicator,
  PageLoader,
  SkeletonCard,
} from "../components/ui/command";
import {
  Search,
  AlertCircle,
  Leaf,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  User,
  Phone,
  LandPlot,
  Hash,
} from "lucide-react";

const PAGE_SIZE = 12;

function VisitCard({ v, onView }) {
  const farmer = resolveVisitFarmer(v);
  const whenLabel = visitWhenLabel(v);
  const submittedAt = visitSubmittedLabel(v);
  const cropName =
    farmer.cropName !== "—" ? farmer.cropName : resolveCropLabel(v?.crop);
  const villageLabel =
    farmer.village !== "—" ? farmer.village : resolveVillageLabel(v?.village);
  const land = visitLandLabel(v);
  const employee = visitEmployeeLabel(v);
  const farmerInitial = (farmer.name !== "—" ? farmer.name : "F")[0].toUpperCase();

  return (
    <article
      className="visit-card-premium group"
      onClick={() => onView(v.id)}
    >
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 font-mono">
            <Hash className="w-3 h-3" />
            Visit {v.id}
          </span>
          <GpsIndicator latitude={v.latitude} longitude={v.longitude} compact />
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
            {farmerInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 text-sm truncate">{farmer.name}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3 shrink-0" /> {farmer.phone}
            </p>
            {submittedAt && (
              <p className="text-[10px] text-emerald-700 font-medium mt-1">
                Submitted {submittedAt}
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-2 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <dd className="truncate">
              {farmer.village !== "—" ? farmer.village : v.village_name || v.village || "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Leaf className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <dd className="truncate">{cropName}</dd>
          </div>
          <div className="flex items-center gap-2">
            <LandPlot className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <dd className="truncate">{land}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <dd>{whenLabel}</dd>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <dd className="truncate">{employee}</dd>
          </div>
        </dl>

        <div className="flex items-center justify-end pt-3 border-t border-gray-50">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(v.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <Eye className="w-3 h-3" /> View details
          </button>
        </div>
      </div>
    </article>
  );
}

function VisitRow({ v, onView }) {
  const farmer = resolveVisitFarmer(v);
  const whenLabel = visitWhenLabel(v);
  const cropName =
    farmer.cropName !== "—" ? farmer.cropName : resolveCropLabel(v?.crop);
  const villageLabel =
    farmer.village !== "—" ? farmer.village : resolveVillageLabel(v?.village);
  const land = visitLandLabel(v);

  return (
    <tr
      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
      onClick={() => onView(v.id)}
    >
      <td className="font-mono text-xs text-slate-500">#{v.id}</td>
      <td>
        <p className="text-sm font-semibold text-gray-900">{farmer.name}</p>
        <p className="text-xs text-gray-400 font-mono">{farmer.phone}</p>
      </td>
      <td className="text-sm text-gray-700">{villageLabel}</td>
      <td className="text-sm text-gray-700">{cropName}</td>
      <td className="text-sm text-gray-600">{land}</td>
      <td className="text-sm text-gray-600">{visitEmployeeLabel(v)}</td>
      <td className="text-sm text-gray-500 whitespace-nowrap">{whenLabel}</td>
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
        <div className="flex flex-wrap gap-3">
          <div className="stat-pill">
            <span className="font-bold text-gray-900">{total}</span>
            <span className="text-gray-400">Submitted visits</span>
          </div>
          {!loading && visits.length > 0 && (
            <div className="stat-pill">
              <span className="font-bold text-gray-900">{visits.length}</span>
              <span className="text-gray-400">On this page</span>
            </div>
          )}
        </div>
      )}

      <FilterBar>
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
        <div className="alert-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          <button
            type="button"
            onClick={() => loadVisits(page)}
            className="ml-auto font-semibold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <PageLoader label="Loading field visits…" />
        )
      ) : visits.length === 0 ? (
        <div className="section-card">
          <EmptyState
            icon={Calendar}
            title="No submitted visits"
            subtitle={
              search
                ? "Try a different search term"
                : "When employees submit visits from the mobile app, each visit appears here as its own record"
            }
            action={
              search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="btn btn-secondary btn-md"
                >
                  <X className="w-4 h-4" /> Clear search
                </button>
              ) : null
            }
          />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visits.map((v) => (
            <VisitCard key={`visit-${v.id}`} v={v} onView={handleView} />
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-container">
            <table className="data-table">
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
                {visits.map((v) => (
                  <VisitRow key={`visit-${v.id}`} v={v} onView={handleView} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && visits.length > 0 && (
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
