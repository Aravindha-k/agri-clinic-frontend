import { Maximize2 } from "lucide-react";
import MapFullscreenButton from "./MapFullscreenButton";

/**
 * Top-right map toolbar — Fit all + Fullscreen (visible in embedded and fullscreen modes).
 */
export default function MapToolbar({
  containerRef,
  onFitAll,
  fitDisabled = false,
  fitLabel = "Fit all",
  showFullscreen = true,
}) {
  return (
    <div className="admin-map-toolbar" role="toolbar" aria-label="Map controls">
      {typeof onFitAll === "function" ? (
        <button
          type="button"
          className="admin-map-toolbar__btn"
          onClick={onFitAll}
          disabled={fitDisabled}
          aria-label={fitLabel}
          title={fitLabel}
        >
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
          <span className="admin-map-toolbar__label">{fitLabel}</span>
        </button>
      ) : null}
      {showFullscreen ? (
        <MapFullscreenButton containerRef={containerRef} className="admin-map-toolbar__btn" />
      ) : null}
    </div>
  );
}
