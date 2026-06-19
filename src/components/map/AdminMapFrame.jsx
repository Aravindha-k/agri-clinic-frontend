import { useRef, useState } from "react";
import { MapContainer, ZoomControl } from "react-leaflet";
import MapBasemapLayers from "./MapBasemapLayers";
import MapFullscreenButton from "./MapFullscreenButton";
import MapLegendPanel from "./MapLegendPanel";
import { DEFAULT_ADMIN_MAP_BASEMAP } from "../../config/mapBasemap";
import { PageLoader } from "../ui/command";
import ErrorRetry from "../ui/ErrorRetry";

/**
 * Shared admin map shell: modern controls, basemap toggle, fullscreen, legend, overlays.
 *
 * @param {{
 *   center: [number, number],
 *   zoom: number,
 *   mapKey?: string,
 *   height?: string | number,
 *   className?: string,
 *   mapClassName?: string,
 *   scrollWheelZoom?: boolean,
 *   legend?: import('react').ReactNode,
 *   legendTitle?: string,
 *   showTypeToggle?: boolean, // hidden — satellite-only for now
 *   showFullscreen?: boolean,
 *   showZoomControl?: boolean,
 *   loading?: boolean,
 *   loadingLabel?: string,
 *   error?: string | null,
 *   onRetry?: () => void,
 *   empty?: { title: string, subtitle?: string, action?: import('react').ReactNode } | null,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function AdminMapFrame({
  center,
  zoom,
  mapKey,
  height = "400px",
  className = "",
  mapClassName = "",
  scrollWheelZoom = true,
  legend = null,
  legendTitle = "Legend",
  showTypeToggle = false,
  showFullscreen = true,
  showZoomControl = true,
  loading = false,
  loadingLabel = "Loading map…",
  error = null,
  onRetry,
  empty = null,
  children,
}) {
  const containerRef = useRef(null);
  const mapType = DEFAULT_ADMIN_MAP_BASEMAP;
  const [basemapFallback, setBasemapFallback] = useState(false);

  const showMap = !loading && !error && !empty;

  return (
    <div
      ref={containerRef}
      className={`admin-map-frame ${className}`}
      style={{ height }}
      data-basemap={mapType}
      data-basemap-fallback={basemapFallback ? "true" : "false"}
    >
      {showMap ? (
        <MapContainer
          key={mapKey}
          center={center}
          zoom={zoom}
          scrollWheelZoom={scrollWheelZoom}
          zoomControl={false}
          className={`admin-map-frame__leaflet z-0 ${mapClassName}`}
          style={{ width: "100%", height: "100%" }}
        >
          <MapBasemapLayers
            mapType={mapType}
            onFallback={() => setBasemapFallback(true)}
          />
          {showZoomControl ? <ZoomControl position="topright" /> : null}
          {children}
        </MapContainer>
      ) : (
        <div className="admin-map-frame__placeholder" />
      )}

      {showFullscreen && showMap ? (
        <MapFullscreenButton containerRef={containerRef} />
      ) : null}

      {legend && showMap ? (
        <MapLegendPanel title={legendTitle}>{legend}</MapLegendPanel>
      ) : null}

      {basemapFallback && showMap ? (
        <div className="admin-map-basemap-notice" role="status">
          Satellite tiles unavailable — showing street map
        </div>
      ) : null}

      {loading ? (
        <div className="admin-map-overlay">
          <PageLoader label={loadingLabel} compact wrap={false} />
        </div>
      ) : null}

      {error ? (
        <div className="admin-map-overlay admin-map-overlay--error">
          <ErrorRetry compact message={error} onRetry={onRetry} />
        </div>
      ) : null}

      {empty ? (
        <div className="admin-map-overlay admin-map-overlay--empty">
          <div className="admin-map-empty">
            <p className="admin-map-empty__title">{empty.title}</p>
            {empty.subtitle ? (
              <p className="admin-map-empty__subtitle">{empty.subtitle}</p>
            ) : null}
            {empty.action ? (
              <div className="admin-map-empty__action">{empty.action}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
