import { PageLoader, PageHeader, EmptyState, ErrorRetry, FilterBar, FilterField, FilterToolbarRow, FilterActiveRow } from "../components/ui/command";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAllMasterCrops } from "../api/master.api";
import { logApiDiagnostics } from "../utils/apiDiagnostics";
import { matchesAnyFieldPrefix } from "../utils/searchMatch";

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
    const q = search.trim();
    if (!q) return crops;
    return crops.filter((c) =>
      matchesAnyFieldPrefix(q, [cropName(c), cropCode(c), c?.name_ta])
    );
  }, [crops, search]);

  return (
    <div className="page-container crop-issues-page">
      <PageHeader
        title="Crop Directory"
        subtitle="Browse the crop directory used when recording field visits."
        actions={
          <button type="button" onClick={fetchCrops} className="btn btn-primary btn-md">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
          </button>
        }
      />

      <FilterBar className="crop-issues-filters">
        <FilterToolbarRow className="crop-issues-filters__row">
          <FilterField spacer className="filter-toolbar__grow">
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
                  className="search-clear-btn"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </FilterField>
          {!loading ? (
            <FilterField spacer>
              <p className="crop-issues-filters__meta filter-toolbar__meta">
                {filtered.length}
                {search.trim() ? ` of ${totalCount}` : ""} crops
              </p>
            </FilterField>
          ) : null}
          {search.trim() ? (
            <FilterField spacer>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="btn btn-ghost btn-md filter-toolbar__clear"
              >
                <X className="w-4 h-4" aria-hidden="true" /> Clear filters
              </button>
            </FilterField>
          ) : null}
        </FilterToolbarRow>
        {search.trim() ? (
          <FilterActiveRow>
            <span className="filter-chip filter-chip--active capitalize">
              Search: {search.trim()}
            </span>
          </FilterActiveRow>
        ) : null}
      </FilterBar>

      {error && (
        <ErrorRetry
          compact
          message={error}
          onRetry={fetchCrops}
          className="mb-4"
        />
      )}

      {loading ? (
        <PageLoader label="Loading master crops…" />
      ) : filtered.length === 0 ? (
        <div className="section-card">
          <EmptyState
            icon={Wheat}
            title={crops.length === 0 ? "No crops in master data" : "No crops match your search"}
            subtitle={
              crops.length === 0
                ? "Add crops under Masters → Crops so field visits can reference them in the crop directory."
                : "Try a different name or clear the search filter."
            }
            action={
              search.trim() ? (
                <button type="button" onClick={() => setSearch("")} className="btn btn-secondary btn-md">
                  Clear search
                </button>
              ) : null
            }
          />
        </div>
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
