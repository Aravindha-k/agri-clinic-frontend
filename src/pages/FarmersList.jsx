import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { PageHeader, FilterBar, EmptyState, PageLoader } from "../components/ui/command";
import { Badge } from "../components/ui/DataTable";
import ErrorRetry from "../components/ui/ErrorRetry";
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
      .then((page) => {
        setVillageOptions(page.results || []);
        logApiDiagnostics({
          label: "farmers-village-dropdown",
          url: "/api/v1/masters/villages/",
          apiCount: page.count,
          rowsLoaded: page.results?.length ?? 0,
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

  return (
    <div className="page-container">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="icon-box w-9 h-9 rounded-lg">
              <Sprout className="w-4 h-4" strokeWidth={2} />
            </span>
            Farmers
          </span>
        }
        subtitle={
          loading
            ? "Loading from API…"
            : hasActiveFilters
              ? `${totalCount} farmers match filters`
              : `${totalCount} farmers`
        }
        actions={
          <>
            {!loading && totalCount > 0 && (
              <div className="stat-pill">
                <span className="font-bold text-gray-900">{totalCount}</span>
                <span className="text-gray-400">Total</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="btn btn-secondary btn-md"
              title="Refresh from API"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={farmers.length === 0}
              className="btn btn-secondary btn-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> CSV
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

      <FilterBar>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="search-wrapper flex-1 min-w-[200px]">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search name, phone, village…"
              value={searchInput}
              onChange={handleSearchInput}
            />
          </div>
          <select
            className="select max-w-xs"
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
          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="btn btn-ghost btn-md">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </FilterBar>

      {error && (
        <ErrorRetry
          compact
          message={friendlyErrorMessage(error, "Couldn't load farmers. Please try again.")}
          onRetry={handleRefresh}
        />
      )}

      <div className="section-card overflow-hidden">
        {loading ? (
          <PageLoader label="Loading farmers…" />
        ) : farmers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? "No farmers match your filters" : "No farmers found"}
            subtitle={
              hasActiveFilters
                ? "Try clearing filters or run backend import, then refresh."
                : "Add a farmer or import from Excel on the backend, then refresh."
            }
            action={
              hasActiveFilters ? (
                <button type="button" onClick={handleClearFilters} className="btn btn-secondary btn-md">
                  Clear filters
                </button>
              ) : (
                <button type="button" onClick={handleRefresh} className="btn btn-secondary btn-md">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>Phone</th>
                    <th>Village</th>
                    <th>District</th>
                    <th>Active Status</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody>
                  {farmers.map((f) => (
                    <tr key={f.id} className="hover:bg-emerald-50/30">
                      <td className="font-medium text-gray-900">{f.name || "—"}</td>
                      <td className="font-mono text-xs text-gray-600">{farmerPhone(f) || "—"}</td>
                      <td className="text-sm text-gray-700">{farmerVillage(f) || "—"}</td>
                      <td className="text-sm text-gray-700">{farmerDistrict(f) || "—"}</td>
                      <td>
                        <Badge active={farmerIsActive(f)} />
                      </td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-gray-100"
                            onClick={() => f.id && navigate(`/farmers/${f.id}`)}
                            aria-label="View farmer"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-gray-100"
                            onClick={() => f.id && navigate(`/farmers/${f.id}/edit`)}
                            aria-label="Edit farmer"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{showingFrom}–{showingTo}</span> of{" "}
                <span className="font-semibold">{totalCount}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="pagination-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 tabular-nums">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="pagination-btn"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
