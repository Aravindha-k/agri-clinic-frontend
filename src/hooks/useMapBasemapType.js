import { getAdminMapBasemapType } from "../config/mapBasemap";

/**
 * Admin maps use street basemap for now (toggle hidden; matches mobile).
 * @returns {[import('../config/mapBasemap').MapBasemapType, () => void]}
 */
export default function useMapBasemapType() {
  const mapType = getAdminMapBasemapType();
  const setMapType = () => {};
  return [mapType, setMapType];
}
