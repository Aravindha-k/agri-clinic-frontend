import { useRef, useState, useCallback, Component } from "react";
import { MapContainer, ZoomControl } from "react-leaflet";
import MapBasemapLayers from "./MapBasemapLayers";
import MapFullscreenButton from "./MapFullscreenButton";
import MapLegendPanel from "./MapLegendPanel";
import MapStatusOverlay from "./MapStatusOverlay";
import { DEFAULT_ADMIN_MAP_BASEMAP } from "../../config/mapBasemap";
import { TAMIL_NADU_CENTER, TAMIL_NADU_ZOOM } from "../../utils/mapCoordinates";

/**
 * Catch Leaflet/React-Leaflet render failures and offer a single remount retry.
 */
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    /* swallow — fallback UI handles it */
  }

  reset = () => {
    this.setState({ failed: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.failed) {
      return (
        <div className="admin-map-frame__crash">
          <p className="admin-map-empty__title">Map could not be loaded.</p>
          <p className="admin-map-empty__subtitle">
            The map view failed to start. You can retry without leaving this page.
          </p>
          <div className="admin-map-empty__action flex flex-wrap gap-2 justify-center">
            <button type="button" className="btn btn-primary btn-sm" onClick={this.reset}>
              Retry Map
            </button>
            {this.props.fallbackAction}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Shared admin map shell — MapContainer always mounts.
 * Loading / empty / error are overlays; never replace the map.
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
  loadingLabel = "Updating map…",
  error = null,
  onRetry,
  empty = null,
  statusMessage = null,
  statusTone = "info",
  statusDetail = null,
  fallbackAction = null,
  children,
}) {
  void showTypeToggle;
  const containerRef = useRef(null);
  const mapType = DEFAULT_ADMIN_MAP_BASEMAP;
  const [basemapFallback, setBasemapFallback] = useState(false);
  const [remountKey, setRemountKey] = useState(0);

  const handleMapRetry = useCallback(() => {
    setRemountKey((n) => n + 1);
    onRetry?.();
  }, [onRetry]);

  const mapCenter =
    Array.isArray(center) &&
    Number.isFinite(Number(center[0])) &&
    Number.isFinite(Number(center[1]))
      ? center
      : TAMIL_NADU_CENTER;
  const mapZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : TAMIL_NADU_ZOOM;
  const leafletKey = `${mapKey ?? "admin-map"}-r${remountKey}`;

  return (
    <div
      ref={containerRef}
      className={`admin-map-frame ${className}`}
      style={{ height }}
      data-basemap={mapType}
      data-basemap-fallback={basemapFallback ? "true" : "false"}
    >
      <MapErrorBoundary onRetry={handleMapRetry} fallbackAction={fallbackAction}>
        <MapContainer
          key={leafletKey}
          center={mapCenter}
          zoom={mapZoom}
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
      </MapErrorBoundary>

      {showFullscreen ? (
        <MapFullscreenButton containerRef={containerRef} />
      ) : null}

      {legend ? <MapLegendPanel title={legendTitle}>{legend}</MapLegendPanel> : null}

      {basemapFallback ? (
        <div className="admin-map-basemap-notice" role="status">
          Satellite tiles unavailable — showing street map
        </div>
      ) : null}

      {loading ? (
        <MapStatusOverlay tone="info" message={loadingLabel} />
      ) : null}

      {!loading && statusMessage ? (
        <MapStatusOverlay
          tone={statusTone}
          message={statusMessage}
          detail={statusDetail}
          action={
            onRetry ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                Retry
              </button>
            ) : null
          }
        />
      ) : null}

      {!loading && !statusMessage && error ? (
        <MapStatusOverlay
          tone="error"
          message={typeof error === "string" ? error : "Live updates are temporarily unavailable."}
          action={
            onRetry ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                Retry
              </button>
            ) : null
          }
        />
      ) : null}

      {!loading && !statusMessage && !error && empty ? (
        <MapStatusOverlay
          tone="info"
          message={empty.title}
          detail={empty.subtitle}
          action={empty.action}
        />
      ) : null}
    </div>
  );
}
