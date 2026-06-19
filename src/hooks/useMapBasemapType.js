import { getAdminMapBasemapType } from "../config/mapBasemap";

/**
 * Admin maps are satellite-only for now (toggle hidden).
 * @returns {[import('../config/mapBasemap').MapBasemapType, () => void]}
 */
export default function useMapBasemapType() {
  const mapType = getAdminMapBasemapType();
  const setMapType = () => {};
  return [mapType, setMapType];
}
