import { Map, Satellite, Layers } from "lucide-react";
import { MAP_BASEMAP_LABELS, MAP_BASEMAP_TYPES } from "../../config/mapBasemap";

const ICONS = {
  standard: Map,
  satellite: Satellite,
  hybrid: Layers,
};

/**
 * Segmented map type control for admin maps.
 * @param {{ value: import('../../config/mapBasemap').MapBasemapType, onChange: (type: import('../../config/mapBasemap').MapBasemapType) => void, compact?: boolean }} props
 */
export default function MapTypeToggle({ value, onChange, compact = false }) {
  return (
    <div
      className={`admin-map-type-toggle ${compact ? "admin-map-type-toggle--compact" : ""}`}
      role="group"
      aria-label="Map type"
    >
      {MAP_BASEMAP_TYPES.map((type) => {
        const Icon = ICONS[type];
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            className={`admin-map-type-toggle__btn ${active ? "admin-map-type-toggle__btn--active" : ""}`}
            onClick={() => onChange(type)}
            aria-pressed={active}
            title={MAP_BASEMAP_LABELS[type]}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {!compact ? (
              <span className="admin-map-type-toggle__label">{MAP_BASEMAP_LABELS[type]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
