import { useEffect, useState } from "react";
import { getVisits } from "../api/visit.api";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, CheckCircle, Clock, AlertCircle, Leaf, MapPin, Calendar,
  ChevronLeft, ChevronRight, Eye, Edit2, RefreshCw, X, LayoutGrid, List,
} from "lucide-react";

const PAGE_SIZE = 12;

const STATUS_CFG = {
  verified: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Verified" },
  pending: { cls: "badge badge-warning", dot: "bg-amber-500", label: "Pending" },
  completed: { cls: "badge badge-success", dot: "bg-emerald-500", label: "Completed" },
  in_progress: { cls: "badge badge-info", dot: "bg-sky-500", label: "In Progress" },
  cancelled: { cls: "badge badge-gray", dot: "bg-gray-400", label: "Cancelled" },
};

const HEALTH_CFG = {
  good: { cls: "badge badge-success", label: "Good" },
  poor: { cls: "badge badge-danger", label: "Poor" },
  moderate: { cls: "badge badge-warning", label: "Moderate" },
  fair: { cls: "badge badge-warning", label: "Fair" },
};

const normalizeStatusKey = (value) =>
  String(value || "pending").toLowerCase().trim().replace(/[\s-]/g, "_");

function StatusBadge({ status }) {
  const key = normalizeStatusKey(status);
  const cfg = STATUS_CFG[key] || STATUS_CFG.pending;
  return (
    <span className={cfg.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function HealthBadge({ health }) {
  const key = (health || "").toLowerCase();
  const cfg = HEALTH_CFG[key];
  if (!cfg) return null;
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function VisitCard({ v, onView, onEdit }) {
  const dateStr = v.visit_date
    ? new Date(v.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const cropName = v.crop?.name || v.crop_name || v.crop || "—";
  const farmerInitial = (v.farmer_name || "F")[0].toUpperCase();

  const statusKey = (v.status || "pending").toLowerCase();
  const accentColors = {
    verified: "#166534", completed: "#166534",
    pending: "#d97706",
    in_progress: "#0284c7",
    cancelled: "#6b7280",
  };
  const accent = accentColors[statusKey] || accentColors.pending;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}
      onClick={() => onView(v.id)}
    >
      {/* Color accent bar */}
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div className="p-5">
        {/* Header row: farmer + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent})` }}
            >
              {farmerInitial}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{v.farmer_name || "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{v.farmer_phone || "—"}</p>
            </div>
          </div>
          <StatusBadge status={v.status} />
        </div>

        {/* Info grid */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <span className="truncate">
              {v.village_name || v.village || "—"}
              {v.district_name && <span className="text-gray-400"> · {v.district_name}</span>}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Leaf className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-medium text-gray-700">{cropName}</span>
            {v.crop_stage && <span className="text-gray-400">· {v.crop_stage}</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <span>{dateStr}</span>
            {v.land_area && <span className="ml-auto text-gray-400">{v.land_area} ac</span>}
          </div>
        </div>

        {/* Health badge + actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <HealthBadge health={v.crop_health || v.severity} />
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(v.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onView(v.id); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Eye className="w-3 h-3" /> View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisitRow({ v, onView, onEdit }) {
  const dateStr = v.visit_date
    ? new Date(v.visit_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const cropName = v.crop?.name || v.crop_name || v.crop || "—";
  return (
    <tr
      className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors cursor-pointer group"
      onClick={() => onView(v.id)}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(v.farmer_name || "F")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{v.farmer_name || "—"}</p>
            <p className="text-xs text-gray-400 font-mono">{v.farmer_phone || "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="text-sm text-gray-700">{v.village_name || v.village || "—"}</div>
        <div className="text-xs text-gray-400">{v.district_name || ""}</div>
      </td>
      <td className="px-5 py-3.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
          <Leaf className="w-3 h-3" /> {cropName}
        </span>
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-500">{dateStr}</td>
      <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(v.id); }}
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onView(v.id); }}
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const loadVisits = async (pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pageNum, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (status) params.status = normalizeStatusKey(status);
      const data = await getVisits(params);
      const fetched = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      const normalizedSelectedStatus = normalizeStatusKey(status);
      const list = normalizedSelectedStatus
        ? fetched.filter((v) => normalizeStatusKey(v.status) === normalizedSelectedStatus)
        : fetched;

      setVisits(list);
      setTotal(typeof data?.count === "number" ? data.count : list.length);
    } catch {
      setError("Failed to load visits");
      setVisits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVisits(page); }, [page, search, status]);

  const handleView = (id) => navigate(`/visits/${id}`);
  const handleEdit = (id) => navigate(`/visits/${id}/edit`);
  const handleCreate = () => navigate(`/visits/create`);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const verifiedCount = visits.filter((v) => normalizeStatusKey(v.status) === "verified").length;
  const pendingCount = visits.filter((v) => normalizeStatusKey(v.status) === "pending").length;

  // Quick pagination pages array
  const pageNums = (() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();

  return (
    <div className="page-container">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Visits</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${total} visit${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary btn-md">
          <Plus className="w-4 h-4" /> Schedule Visit
        </button>
      </div>

      {/* ── Quick stats ── */}
      {!loading && visits.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Total", value: total, icon: Calendar, bg: "bg-gray-50", text: "text-gray-700" },
            { label: "Verified", value: verifiedCount, icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-700" },
            { label: "Pending", value: pendingCount, icon: Clock, bg: "bg-amber-50", text: "text-amber-700" },
          ].map(({ label, value, icon: Icon, bg, text }) => (
            <div key={label} className={`flex items-center gap-2.5 ${bg} rounded-xl px-4 py-2.5`}>
              <Icon className={`w-4 h-4 ${text}`} />
              <span className={`text-sm font-semibold ${text}`}>{value}</span>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="filters-bar">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="search-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search farmer name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="select min-w-[140px] w-auto"
          >
            <option value="">All Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadVisits(page)}
            className="btn btn-secondary btn-md flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          <button onClick={() => loadVisits(page)} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}>
                <div className="h-[3px] skeleton" />
                <div className="p-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    <div className="h-7 bg-gray-100 rounded-lg w-14" />
                    <div className="h-7 bg-gray-100 rounded-lg w-12 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="section-card animate-pulse">
            <div className="p-4 border-b border-gray-100 h-12 bg-gray-50" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-5 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-gray-100 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-20" /></div>
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-20" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        )
      ) : visits.length === 0 ? (
        <div className="section-card">
          <div className="empty-state">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold text-base">No visits found</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              {search || status ? "Try adjusting your filters" : "Schedule your first field visit"}
            </p>
            {(search || status) ? (
              <button
                onClick={() => { setSearch(""); setStatus(""); setPage(1); }}
                className="btn btn-secondary btn-md"
              >
                <X className="w-4 h-4" /> Clear filters
              </button>
            ) : (
              <button onClick={handleCreate} className="btn btn-primary btn-md">
                <Plus className="w-4 h-4" /> Schedule Visit
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visits.map((v, i) => (
            <VisitCard key={v.id || i} v={v} onView={handleView} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="section-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Crop</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <VisitRow key={v.id || i} v={v} onView={handleView} onEdit={handleEdit} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && visits.length > 0 && (
        <div className="pagination">
          <span className="pagination-info">
            Page <span className="font-semibold text-gray-700">{page}</span> of{" "}
            <span className="font-semibold text-gray-700">{totalPages}</span>
          </span>
          <div className="pagination-controls">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="pagination-btn disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {page > 3 && <span className="text-gray-400 text-sm px-1">…</span>}
            {pageNums.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`pagination-btn ${p === page ? "pagination-btn-active" : "hover:bg-gray-100 text-gray-600"}`}
              >
                {p}
              </button>
            ))}
            {page < totalPages - 2 && <span className="text-gray-400 text-sm px-1">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="pagination-btn disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
