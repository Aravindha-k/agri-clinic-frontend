/** @typedef {'standard' | 'satellite' | 'hybrid'} MapBasemapType */

export const MAP_BASEMAP_STORAGE_KEY = "agri_admin_map_basemap";

/** @type {MapBasemapType[]} */
export const MAP_BASEMAP_TYPES = ["standard", "satellite", "hybrid"];

/** Admin maps always open on satellite imagery. */
export const DEFAULT_ADMIN_MAP_BASEMAP = "satellite";

const OSM_FALLBACK =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const CARTO_VOYAGER =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const ESRI_WORLD_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_REFERENCE_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

/**
 * @param {unknown} value
 * @returns {MapBasemapType}
 */
export function normalizeMapBasemapType(value) {
  if (value === "satellite" || value === "hybrid" || value === "standard") {
    return value;
  }
  return DEFAULT_ADMIN_MAP_BASEMAP;
}

/** Fixed basemap for admin maps (toggle hidden — satellite only). */
export function getAdminMapBasemapType() {
  return DEFAULT_ADMIN_MAP_BASEMAP;
}

export function readStoredMapBasemapType() {
  return getAdminMapBasemapType();
}

/**
 * @param {MapBasemapType} type
 */
export function writeStoredMapBasemapType(type) {
  try {
    localStorage.setItem(MAP_BASEMAP_STORAGE_KEY, type);
  } catch {
    /* private browsing */
  }
}

/**
 * Tile layer definitions for admin maps.
 * Override via env without API keys (Esri + OSM/Carto are free for typical admin use).
 */
export function getMapBasemapLayers(type) {
  const standardUrl =
    import.meta.env.VITE_MAP_STANDARD_TILE_URL || CARTO_VOYAGER;
  const satelliteUrl =
    import.meta.env.VITE_MAP_SATELLITE_TILE_URL || ESRI_WORLD_IMAGERY;
  const labelsUrl =
    import.meta.env.VITE_MAP_LABELS_TILE_URL || ESRI_REFERENCE_LABELS;
  const fallbackUrl =
    import.meta.env.VITE_MAP_FALLBACK_TILE_URL || OSM_FALLBACK;

  const standard = {
    key: "standard",
    layers: [
      {
        url: standardUrl,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ],
    fallback: {
      url: fallbackUrl,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      subdomains: "abc",
      maxZoom: 19,
    },
  };

  const satellite = {
    key: "satellite",
    layers: [
      {
        url: satelliteUrl,
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
      },
    ],
    fallback: standard.fallback,
  };

  const hybrid = {
    key: "hybrid",
    layers: [
      {
        url: satelliteUrl,
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
      },
      {
        url: labelsUrl,
        attribution: "",
        maxZoom: 19,
        opacity: 0.88,
      },
    ],
    fallback: standard.fallback,
  };

  const map = { standard, satellite, hybrid };
  return map[normalizeMapBasemapType(type)] ?? standard;
}

export const MAP_BASEMAP_LABELS = {
  standard: "Map",
  satellite: "Satellite",
  hybrid: "Hybrid",
};
