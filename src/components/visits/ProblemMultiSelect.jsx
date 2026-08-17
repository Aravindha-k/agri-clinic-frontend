import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { fetchAllProblemMasters } from "../../api/master.api";
import {
  resolveProblemCategoryLabel,
  resolveProblemEnglishName,
  resolveProblemTamilName,
} from "../../utils/problemMasterDisplay";

function groupProblemsByCategory(items = []) {
  const groups = new Map();
  for (const item of items) {
    const categoryName = resolveProblemCategoryLabel(item) || "Other";
    if (!groups.has(categoryName)) groups.set(categoryName, []);
    groups.get(categoryName).push(item);
  }
  return Array.from(groups.entries())
    .map(([categoryName, problems]) => ({
      categoryName,
      problems: problems.sort((a, b) =>
        resolveProblemEnglishName(a).localeCompare(resolveProblemEnglishName(b))
      ),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export default function ProblemMultiSelect({
  cropId,
  value = [],
  onChange,
  disabled = false,
  id = "problem-multi-select",
  error,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(
    () => new Set((value || []).map((id) => String(id))),
    [value]
  );

  const loadItems = useCallback(async () => {
    if (!cropId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const { items: rows, apiAvailable } = await fetchAllProblemMasters({
        crop_id: cropId,
      });
      if (apiAvailable === false) {
        setLoadError("Problem list API is not available.");
        setItems([]);
        return;
      }
      setItems(rows || []);
    } catch {
      setLoadError("Could not load problems.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cropId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        resolveProblemEnglishName(item),
        resolveProblemTamilName(item),
        resolveProblemCategoryLabel(item),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const groups = useMemo(() => groupProblemsByCategory(filteredItems), [filteredItems]);

  const toggleItem = (itemId) => {
    if (disabled) return;
    const idStr = String(itemId);
    const next = selectedIds.has(idStr)
      ? value.filter((id) => String(id) !== idStr)
      : [...value, itemId];
    onChange?.(next);
  };

  const clearSelection = () => {
    if (disabled) return;
    onChange?.([]);
  };

  if (!cropId) {
    return (
      <p className="form-hint" id={id}>
        Select a crop first to choose problems.
      </p>
    );
  }

  return (
    <div className="problem-multi-select" id={id}>
      <div className="problem-multi-select__toolbar">
        <div className="problem-multi-select__search-wrap">
          <Search className="problem-multi-select__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="input problem-multi-select__search"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled || loading}
            aria-label="Search problems"
          />
        </div>
        <span className="problem-multi-select__count" aria-live="polite">
          {selectedIds.size} selected
        </span>
        {selectedIds.size > 0 ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm problem-multi-select__clear"
            onClick={clearSelection}
            disabled={disabled}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="problem-multi-select__status">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" aria-hidden="true" />
          Loading problems…
        </p>
      ) : loadError ? (
        <div className="problem-multi-select__status problem-multi-select__status--error">
          <span>{loadError}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadItems}>
            Retry
          </button>
        </div>
      ) : groups.length === 0 ? (
        <p className="problem-multi-select__status">No problems available for this crop.</p>
      ) : (
        <div className="problem-multi-select__groups" role="group" aria-label="Problems identified">
          {groups.map(({ categoryName, problems }) => (
            <fieldset key={categoryName} className="problem-multi-select__group">
              <legend className="problem-multi-select__group-title">{categoryName}</legend>
              <ul className="problem-multi-select__list">
                {problems.map((item) => {
                  const itemId = item.id;
                  const checked = selectedIds.has(String(itemId));
                  const english = resolveProblemEnglishName(item);
                  const tamil = resolveProblemTamilName(item);
                  const checkboxId = `${id}-item-${itemId}`;
                  return (
                    <li key={itemId}>
                      <label htmlFor={checkboxId} className="problem-multi-select__option">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(itemId)}
                          disabled={disabled}
                        />
                        <span className="problem-multi-select__option-text">
                          <span className="problem-multi-select__option-name">{english}</span>
                          {tamil ? (
                            <span className="problem-multi-select__option-tamil">{tamil}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

export { groupProblemsByCategory };
