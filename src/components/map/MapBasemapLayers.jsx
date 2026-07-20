import { useEffect, useState } from "react";
import { TileLayer, useMap } from "react-leaflet";
import { DEFAULT_ADMIN_MAP_BASEMAP, getMapBasemapLayers } from "../../config/mapBasemap";

function BasemapTileLayer({ layer, fallback, onFallback }) {
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setUseFallback(false);
  }, [layer.url]);

  const active = useFallback ? fallback : layer;
  const tileProps = {
    url: active.url,
    attribution: active.attribution,
    maxZoom: active.maxZoom ?? 19,
    opacity: useFallback ? 1 : layer.opacity,
    eventHandlers: {
      tileerror: () => {
        if (!useFallback) {
          setUseFallback(true);
          onFallback?.();
        }
      },
    },
  };

  if (active.subdomains) {
    tileProps.subdomains = active.subdomains;
  }

  return <TileLayer key={active.url} {...tileProps} />;
}

/** Invalidate size when basemap type changes (tile swap) and after first paint. */
function MapInvalidateOnType({ mapType }) {
  const map = useMap();
  useEffect(() => {
    const timers = [60, 250, 600].map((ms) =>
      window.setTimeout(() => {
        try {
          map.invalidateSize({ animate: false });
        } catch {
          /* unmounting */
        }
      }, ms)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [map, mapType]);
  return null;
}

/**
 * Programmatic basemap layers with satellite/hybrid support and OSM fallback.
 * @param {{ mapType: import('../../config/mapBasemap').MapBasemapType, onFallback?: () => void }} props
 */
export default function MapBasemapLayers({
  mapType = DEFAULT_ADMIN_MAP_BASEMAP,
  onFallback,
}) {
  const config = getMapBasemapLayers(mapType);

  return (
    <>
      <MapInvalidateOnType mapType={mapType} />
      {config.layers.map((layer, index) => (
        <BasemapTileLayer
          key={`${config.key}-${index}-${layer.url}`}
          layer={layer}
          fallback={config.fallback}
          onFallback={index === 0 ? onFallback : undefined}
        />
      ))}
    </>
  );
}
