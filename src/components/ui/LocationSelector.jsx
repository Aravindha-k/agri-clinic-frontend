import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCachedActiveVillages } from "../../api/master.api";
import { filterVillagesByPrefix, villageTamilName } from "../../utils/employeeLocationAssignmentForm";
import { MapPin, Loader2, Search } from "lucide-react";
import ErrorRetry from "./ErrorRetry";

/**
 * Village-only location picker. Search is prefix-only.
 * Shared by Farmer and Visit forms.
 */
export default function LocationSelector({
  value = {},
  onChange,
  className = "",
  disabled = false,
  required = false,
}) {
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadVillages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const page = await fetchCachedActiveVillages();
      setVillages(page.results || []);
    } catch {
      setError("Could not load villages.");
      setVillages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVillages();
  }, [loadVillages]);

  const filtered = useMemo(
    () => filterVillagesByPrefix(villages, query).slice(0, 200),
    [villages, query]
  );

  const selected = villages.find((v) => String(v.id) === String(value.village));

  const handleSelect = (village) => {
    onChange?.({
      village: village ? String(village.id) : "",
      village_name: village?.name || "",
    });
  };

  return (
    <div className={`village-picker ${className}`}>
      <label className="form-label flex items-center gap-1" htmlFor="loc-village-search">
        <MapPin className="w-3 h-3" aria-hidden="true" /> Village
        {required ? <span className="form-required" aria-hidden="true"> *</span> : null}
      </label>
      {selected ? (
        <p className="village-picker__selected">
          {selected.name}
          {villageTamilName(selected) ? (
            <span className="village-picker__tamil"> · {villageTamilName(selected)}</span>
          ) : null}
        </p>
      ) : null}
      <div className="village-picker__search">
        <Search className="search-icon" aria-hidden="true" />
        <input
          id="loc-village-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={loading ? "Loading villages…" : "Search villages…"}
          disabled={disabled || loading}
          className="search-input"
          aria-label="Search villages"
        />
        {loading ? (
          <Loader2 className="village-picker__spin w-4 h-4 animate-spin" aria-hidden="true" />
        ) : null}
      </div>
      {error ? (
        <ErrorRetry compact message={error} onRetry={loadVillages} className="mt-2" />
      ) : (
        <ul className="village-picker__list" role="listbox" aria-label="Villages">
          {filtered.length === 0 && !loading ? (
            <li className="village-picker__empty">No villages found.</li>
          ) : (
            filtered.map((village) => {
              const active = String(village.id) === String(value.village);
              const tamil = villageTamilName(village);
              return (
                <li key={village.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={disabled}
                    className={`village-picker__option ${active ? "village-picker__option--active" : ""}`}
                    onClick={() => handleSelect(village)}
                  >
                    <span>{village.name}</span>
                    {tamil ? <span className="village-picker__tamil">{tamil}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
