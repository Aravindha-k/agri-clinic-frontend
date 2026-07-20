import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFarmers } from "../api/farmer.api";
import { fetchAllVillages } from "../api/master.api";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  UserPlus,
  Download,
  Eye,
  Pencil,
  Sprout,
  MapPin,
  Phone,
} from "lucide-react";
import { PageHeader, FilterBar, FilterField, EmptyState } from "../components/ui/command";
import ErrorRetry from "../components/ui/ErrorRetry";
import ProfileAvatar from "../components/ui/ProfileAvatar";
import { friendlyErrorMessage } from "../utils/friendlyError";
import {
  farmerPhone,
  farmerVillage,
  farmerDistrict,
  farmerIsActive,
} from "../utils/farmerListDisplay";

const PAGE_SIZE = 20;

const toCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

function FarmerStatusBadge({ active }) {
  return (
    <span className={`farmers-status ${active ? "farmers-status--active" : "farmers-status--inactive"}`}>
      <span className="farmers-status__dot" aria-hidden="true" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function FarmersTableSkeleton() {
  return (
    <div className="farmers-table-skeleton" aria-busy="true" aria-label="Loading farmers">
      <div className="farmers-table-skeleton__head">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1 rounded" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, r) => (
        <div key={r} className="farmers-table-skeleton__row">
          <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
          <div className="skeleton h-3.5 flex-[2] rounded" />
          <div className="skeleton h-3 flex-1 rounded hidden sm:block" />
          <div className="skeleton h-3 flex-1 rounded hidden md:block" />
          <div className="skeleton h-3 flex-1 rounded hidden lg:block" />
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function FarmerRowActions({ farmerId, onView, onEdit }) {
  return (
    <div className="farmers-action-group">
      <button
        type="button"
        className="farmers-action-btn farmers-action-btn--primary"
        onClick={() => farmerId && onView(farmerId)}
        aria-label="View farmer"
        title="View profile"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="farmers-action-btn"
        onClick={() => farmerId && onEdit(farmerId)}
        aria-label="Edit farmer"
        title="Edit farmer"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function FarmersList() {
  const navigate = useNavigate();
  const searchTimeout = useRef(null);
  const loadSeq = useRef(0);

  const [farmers, setFarmers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [page, setPage] = useState(1);
  const [villageOptions, setVillageOptions] = useState([]);

  useEffect(() => {
    fetchAllVillages()
      .then((pageData) => {
        setVillageOptions(pageData.results || []);
        logApiDiagnostics({
          label: "farmers-village-dropdown",
          url: "/api/v1/masters/villages/",
          apiCount: pageData.count,
          rowsLoaded: pageData.results?.length ?? 0,
        });
      })
      .catch(() => setVillageOptions([]));
  }, []);

  const loadFarmers = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError("");
    setFarmers([]);

    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (villageFilter) params.village = villageFilter;

      const pageData = await getFarmers(params);
      if (seq !== loadSeq.current) return;

      const list = Array.isArray(pageData?.results) ? pageData.results : [];
      const apiTotal =
        typeof pageData?.count === "number" ? pageData.count : list.length;

      setFarmers(list);
      setTotalCount(apiTotal);
      logApiDiagnostics({
        label: "farmers-list-ui",
        url: "/api/v1/farmers/",
        apiCount: apiTotal,
        rowsLoaded: list.length,
        rowsRendered: list.length,
        pagination: { page, page_size: PAGE_SIZE, search: search.trim() || null, village: villageFilter || null },
      });
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err?.message || "Failed to load farmers");
      setFarmers([]);
      setTotalCount(0);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [page, search, villageFilter]);

  useEffect(() => {
    loadFarmers();
  }, [loadFarmers]);

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setVillageFilter("");
    setPage(1);
  };

  const handleRefresh = () => {
    setFarmers([]);
    setTotalCount(0);
    loadFarmers();
  };

  const hasActiveFilters = Boolean(search.trim() || villageFilter);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  const pageNums = useMemo(() => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const exportRows = farmers.map((f, index) => ({
    s_no: (page - 1) * PAGE_SIZE + index + 1,
    name: f.name ?? "",
    phone: farmerPhone(f),
    village: farmerVillage(f),
    district: farmerDistrict(f),
    active: farmerIsActive(f) ? "Active" : "Inactive",
  }));

  const handleExportCsv = () => {
    if (exportRows.length === 0) return;
    const headers = Object.keys(exportRows[0]);
    const csv = [
      headers.join(","),
      ...exportRows.map((row) => headers.map((key) => toCsvValue(row[key])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `farmers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleView = (id) => navigate(`/farmers/${id}`);
  const handleEdit = (id) => navigate(`/farmers/${id}/edit`);

  return (
    <div className="page-container page-container--farmers">
      <PageHeader
        title="Farmers"
        subtitle={
          loading
            ? "Loading farmer registry…"
            : hasActiveFilters
              ? `${totalCount} farmers match your filters`
              : `${totalCount} registered farmers`
        }
        badge={
          <span className="command-hero-badge">
            <Sprout className="w-3 h-3" /> Registry
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn-secondary btn-md"
              title="Refresh from API"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={farmers.length === 0}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => navigate("/farmers/new")}
              className="btn btn-primary btn-md"
            >
              <UserPlus className="w-4 h-4" /> Add Farmer
            </button>
          </>
        }
      />

      {!loading && totalCount > 0 && (
        <div className="farmers-kpi-strip">
          <div className="farmers-kpi-pill farmers-kpi-pill--accent">
            <Users className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="farmers-kpi-pill__value">{totalCount}</p>
              <p className="farmers-kpi-pill__label">All farmers</p>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="farmers-kpi-pill">
              <Search className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <div>
                <p className="farmers-kpi-pill__value">{farmers.length}</p>
                <p className="farmers-kpi-pill__label">On this page</p>
              </div>
            </div>
          )}
          {!hasActiveFilters && totalPages > 1 && (
            <div className="farmers-kpi-pill">
              <div>
                <p className="farmers-kpi-pill__value">
                  {showingFrom}–{showingTo}
                </p>
                <p className="farmers-kpi-pill__label">Showing now</p>
              </div>
            </div>
          )}
        </div>
      )}

      <FilterBar className="farmers-filters">
        <div className="farmers-filters__row">
          <div className="farmers-filters__search">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search name, phone, village…"
              value={searchInput}
              onChange={handleSearchInput}
              aria-label="Search farmers"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <FilterField label="Village" className="min-w-[10rem]">
            <select
              className="farmers-filters__select"
              value={villageFilter}
              onChange={(e) => {
                setVillageFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All villages</option>
              {villageOptions.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </FilterField>
          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="btn btn-ghost btn-md self-end lg:self-auto">
              <X className="w-4 h-4" /> Clear filters
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="farmers-active-filters">
            <span className="farmers-active-filters__label">Active</span>
            {search.trim() && (
              <span className="filter-chip filter-chip--active capitalize">
                Search: {search.trim()}
              </span>
            )}
            {villageFilter && (
              <span className="filter-chip filter-chip--idle">
                Village: {villageFilter}
              </span>
            )}
          </div>
        )}
      </FilterBar>

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load farmers. Please try again.")}
          onRetry={handleRefresh}
        />
      )}

      <div className="farmers-table-card">
        <div className="farmers-table-card__header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="icon-box">
              <Users className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="section-title">Farmer Directory</h3>
              <p className="section-subtitle">
                {loading
                  ? "Loading records…"
                  : `${totalCount} farmer${totalCount !== 1 ? "s" : ""} · page ${page} of ${totalPages}`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <FarmersTableSkeleton />
        ) : farmers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? "No farmers match your filters" : "No farmers found"}
            subtitle={
              hasActiveFilters
                ? "Try adjusting search or village filter, then refresh."
                : "Add a farmer or import from Excel on the backend, then refresh."
            }
            action={
              hasActiveFilters ? (
                <button type="button" onClick={handleClearFilters} className="btn btn-secondary btn-md">
                  Clear filters
                </button>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={handleRefresh} className="btn btn-secondary btn-md">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                  <button type="button" onClick={() => navigate("/farmers/new")} className="btn btn-primary btn-md">
                    <UserPlus className="w-4 h-4" /> Add Farmer
                  </button>
                </div>
              )
            }
            className="py-16"
          />
        ) : (
          <>
            <div className="farmers-mobile-list">
              {farmers.map((f) => {
                const active = farmerIsActive(f);
                const village = farmerVillage(f) || "—";
                const district = farmerDistrict(f) || "—";
                const phone = farmerPhone(f) || "—";
                return (
                  <article key={f.id} className="farmers-mobile-card">
                    <div className="farmers-mobile-card__head">
                      <ProfileAvatar entity={f} name={f.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{f.name || "—"}</p>
                        <p className="farmers-cell-meta mt-0.5">
                          <Phone className="w-3 h-3" aria-hidden="true" />
                          {phone}
                        </p>
                      </div>
                      <FarmerStatusBadge active={active} />
                    </div>
                    <div className="farmers-mobile-card__body">
                      <div className="farmers-mobile-card__field">
                        <span className="farmers-mobile-card__label">Village</span>
                        <span className="farmers-mobile-card__value">{village}</span>
                      </div>
                      <div className="farmers-mobile-card__field">
                        <span className="farmers-mobile-card__label">District</span>
                        <span className="farmers-mobile-card__value">{district}</span>
                      </div>
                    </div>
                    <div className="farmers-mobile-card__actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm flex-1"
                        onClick={() => f.id && handleView(f.id)}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm flex-1"
                        onClick={() => f.id && handleEdit(f.id)}
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="farmers-table-wrap hidden md:block">
              <table className="data-table farmers-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Phone</th>
                    <th>Village</th>
                    <th className="hidden lg:table-cell">District</th>
                    <th>Status</th>
                    <th className="w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((f) => {
                    const active = farmerIsActive(f);
                    const village = farmerVillage(f) || "—";
                    const district = farmerDistrict(f) || "—";
                    const phone = farmerPhone(f) || "—";
                    return (
                      <tr key={f.id}>
                        <td>
                          <div className="farmers-cell-name">
                            <ProfileAvatar entity={f} name={f.name} size="sm" />
                            <span className="farmers-cell-name__text">{f.name || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="farmers-cell-phone">{phone}</span>
                        </td>
                        <td>
                          <span className="farmers-cell-meta">
                            <MapPin className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                            {village}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell">
                          <span className="text-sm text-slate-600">{district}</span>
                        </td>
                        <td>
                          <FarmerStatusBadge active={active} />
                        </td>
                        <td className="text-right">
                          <FarmerRowActions
                            farmerId={f.id}
                            onView={handleView}
                            onEdit={handleEdit}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="farmers-pagination">
              <div className="pagination">
                <span className="pagination-info">
                  Showing <span className="font-semibold text-slate-700">{showingFrom}–{showingTo}</span> of{" "}
                  <span className="font-semibold text-slate-700">{totalCount}</span> farmers
                </span>
                <div className="pagination-controls">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="pagination-btn"
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
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="pagination-btn"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
