import { PageLoader, PageHeader } from "../components/ui/command";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAllMasterCrops } from "../api/master.api";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import { AlertCircle, Leaf, RefreshCw, Search, Wheat, X } from "lucide-react";

/** Prefer API name fields used by Masters → Crops. */
function cropName(crop) {
  return crop?.name_en || crop?.name || crop?.crop_name || "\u2014";
}

/** Only show a code when the master record actually provides one. */
function cropCode(crop) {
  const raw = crop?.crop_code ?? crop?.code ?? null;
  if (raw == null || raw === "") return null;
  return String(raw);
}

function isActive(crop) {
  return crop?.is_active !== false;
}

export default function Issues() {
  const [crops, setCrops] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchCrops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const merged = await fetchAllMasterCrops();
      const list = Array.isArray(merged?.results) ? merged.results : [];
      setCrops(list);
      setTotalCount(typeof merged?.count === "number" ? merged.count : list.length);
      logApiDiagnostics({
        label: "crop-issues-master-crops",
        url: "/api/v1/masters/crops/",
        apiCount: merged?.count,
        rowsLoaded: list.length,
        pagination: { pagesLoaded: merged?.pagesLoaded },
      });
    } catch {
      setError("Failed to load master crops.");
      setCrops([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrops();
  }, [fetchCrops]);

  const hasAnyCode = useMemo(
    () => crops.some((c) => cropCode(c) != null),
    [crops]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return crops;
    return crops.filter((c) => {
      const name = cropName(c).toLowerCase();
      const code = (cropCode(c) || "").toLowerCase();
      const ta = String(c?.name_ta || "").toLowerCase();
      return name.includes(q) || code.includes(q) || ta.includes(q);
    });
  }, [crops, search]);

  return (
    <div className="page-container crop-issues-page">
      <PageHeader
        title="Crop Issues"
        subtitle="Master Crops"
        actions={
          <button type="button" onClick={fetchCrops} className="btn btn-primary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        }
      />

      <div className="filters-bar crop-issues-filters">
        <div className="crop-issues-filters__row">
          <div className="search-wrapper crop-issues-filters__search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder={hasAnyCode ? "Search crop name or code…" : "Search crop name…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              aria-label="Search master crops"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          {!loading && (
            <p className="crop-issues-filters__meta">
              {filtered.length}
              {search.trim() ? ` of ${totalCount}` : ""} crops
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={fetchCrops} className="ml-auto font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader label="Loading master crops…" />
      ) : filtered.length === 0 ? (
        <p className="crop-issues-empty">
          {crops.length === 0
            ? "No crops available in Master data."
            : "No crops match your search."}
        </p>
      ) : (
        <div className="section-card">
          <div className="section-card-header">
            <div className="flex items-center gap-3 min-w-0">
              <div className="icon-box" aria-hidden="true">
                <Wheat className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="section-title">Master Crops</h3>
                <p className="section-subtitle">{filtered.length} crops from master data</p>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="table-container crop-issues-desktop">
            <table className="data-table compact-table crop-issues-master-table w-full">
              <thead>
                <tr>
                  <th>Crop Name</th>
                  {hasAnyCode ? <th>Crop Code</th> : null}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((crop, idx) => {
                  const code = cropCode(crop);
                  const active = isActive(crop);
                  return (
                    <tr key={crop.id ?? idx}>
                      <td>
                        <div className="crop-issues-crop-cell">
                          <span className="crop-issues-crop-cell__icon" aria-hidden="true">
                            <Leaf className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="crop-issues-crop-cell__name">{cropName(crop)}</p>
                            {crop.name_ta ? (
                              <p className="crop-issues-crop-cell__sub">{crop.name_ta}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      {hasAnyCode ? (
                        <td className="crop-issues-code-cell">
                          {code ?? "\u2014"}
                        </td>
                      ) : null}
                      <td>
                        <span
                          className={`masters-admin-status ${
                            active
                              ? "masters-admin-status--active"
                              : "masters-admin-status--inactive"
                          }`}
                        >
                          <span className="masters-admin-status__dot" aria-hidden="true" />
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="crop-issues-mobile">
            {filtered.map((crop, idx) => {
              const code = cropCode(crop);
              const active = isActive(crop);
              return (
                <article key={crop.id ?? idx} className="crop-issues-mobile-card">
                  <div className="crop-issues-crop-cell">
                    <span className="crop-issues-crop-cell__icon" aria-hidden="true">
                      <Leaf className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="crop-issues-crop-cell__name">{cropName(crop)}</p>
                      {crop.name_ta ? (
                        <p className="crop-issues-crop-cell__sub">{crop.name_ta}</p>
                      ) : null}
                    </div>
                    <span
                      className={`masters-admin-status ${
                        active
                          ? "masters-admin-status--active"
                          : "masters-admin-status--inactive"
                      }`}
                    >
                      <span className="masters-admin-status__dot" aria-hidden="true" />
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {hasAnyCode ? (
                    <p className="crop-issues-mobile-card__code">
                      Code: <span>{code ?? "\u2014"}</span>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
